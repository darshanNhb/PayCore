import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  verifyAccessToken,
  type AccessTokenPayload,
} from "./jwt";

/**
 * Session management: cookie-based JWT session helpers.
 * Access + refresh tokens stored in httpOnly, Secure, SameSite=Strict cookies.
 * Never exposed to client-side JavaScript (prevents XSS exfiltration).
 *
 * @see PayCore_Build_Prompt.md Section 6.1
 */

// ── Cookie names ─────────────────────────────

export const ACCESS_TOKEN_COOKIE = "paycore_access_token";
export const REFRESH_TOKEN_COOKIE = "paycore_refresh_token";

// ── Types ────────────────────────────────────

export interface SessionUser {
  userId: string;
  role: string;
  employeeId?: string;
}

// ── Read session ─────────────────────────────

/**
 * Get the current session from cookies.
 * Returns null if no valid access token is found.
 * Used by server components and route handlers.
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    if (!accessToken) return null;

    const payload: AccessTokenPayload = await verifyAccessToken(accessToken);
    return {
      userId: payload.sub!,
      role: payload.role,
      employeeId: payload.employeeId,
    };
  } catch {
    return null;
  }
}

/**
 * Get session or throw — for use in route handlers where auth is required.
 * Returns the decoded session user.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

// ── Write cookies ────────────────────────────

/**
 * Set auth cookies on a NextResponse.
 * Both cookies are httpOnly, Secure, SameSite=Strict.
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): NextResponse {
  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return response;
}

/**
 * Clear auth cookies (on logout).
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return response;
}
