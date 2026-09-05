import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/session";

// Exclude public paths from middleware processing
const PUBLIC_PATHS = [
  "/_next",
  "/favicon.ico",
  "/api/health",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/signup",
  "/api/auth/verify-otp",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip public assets and auth APIs
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow unauthenticated access to the login/reset pages themselves
  if (pathname === "/login" || pathname === "/forgot-password" || pathname === "/reset-password" || pathname === "/signup") {
    // If they have a token and try to go to login, redirect to appropriate landing page
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    if (accessToken) {
      try {
        const payload = await verifyAccessToken(accessToken);
        if (payload.role === "EMPLOYEE") {
          return NextResponse.redirect(new URL("/portal", request.url));
        }
        return NextResponse.redirect(new URL("/overview", request.url));
      } catch (e) {
        // Token invalid, let them see the login page
      }
    }
    return NextResponse.next();
  }

  // 2. Check for token
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  const isApiRoute = pathname.startsWith("/api/");
  const loginUrl = new URL("/login", request.url);

  if (!accessToken) {
    // If we have a refresh token but no access token, we need to refresh.
    // The client should call /api/auth/refresh, but we can't easily do it here
    // in Edge middleware (Redis/DB limits). We let the client handle it.
    if (refreshToken) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Token expired" }, { status: 401 });
      }
      return NextResponse.redirect(loginUrl); // Client logic should probably catch this and refresh before redirecting ideally
    }

    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(loginUrl);
  }

  // 3. Verify Token
  try {
    const payload = await verifyAccessToken(accessToken);
    
    // 4. Create new response and append security headers
    const response = NextResponse.next();
    
    // Add User Info Headers for downstream route handlers (optional, they can also use getSession())
    response.headers.set("x-user-id", payload.sub!);
    response.headers.set("x-user-role", payload.role);
    if (payload.employeeId) {
      response.headers.set("x-employee-id", payload.employeeId);
    }

    // Spec Section 10.1: Security Headers
    response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

    return response;

  } catch (error) {
    // Token is invalid or expired
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Redirect to login if token is bad
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
