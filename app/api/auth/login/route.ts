import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { loginRateLimiter } from "@/lib/auth/rate-limit";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    
    // Rate limit check
    const { success, limit, remaining, reset } = await loginRateLimiter.limit(ip);
    
    if (!success) {
      // Audit log on rate limit failure
      await writeAuditLog({
        entityType: "Auth",
        entityId: ip,
        action: "LOGIN_FAILED",
        ipAddress: ip,
        userAgent: getClientUserAgent(request),
        afterJson: { reason: "rate_limit_exceeded" }
      });
      
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }

    const body = await request.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const { email, password } = result.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Generic error to prevent enumeration
    const genericError = NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );

    if (!user || !user.isActive) {
      return genericError;
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      // We could log failures per user, but IP is usually sufficient for stuffing
      return genericError;
    }

    // Generate tokens
    const jtiAccess = crypto.randomUUID();
    const jtiRefresh = crypto.randomUUID();

    const accessToken = await signAccessToken({
      userId: user.id,
      role: user.role,
      employeeId: user.employeeId || undefined,
      jti: jtiAccess,
    });

    const refreshToken = await signRefreshToken({
      userId: user.id,
      jti: jtiRefresh,
    });

    // Hash refresh token for DB storage (revocation support)
    // Only storing refresh token in DB. Access token relies on short TTL + jti blocklist in redis
    // A simple SHA-256 hash is fine for tokens (high entropy, not passwords)
    const tokenBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(refreshToken)
    );
    const tokenHash = Array.from(new Uint8Array(tokenBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Update user last login and create refresh token record
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          createdByIp: ip,
        },
      }),
    ]);

    // Set cookies and return
    const response = NextResponse.json({ success: true });
    return setAuthCookies(response, accessToken, refreshToken);

  } catch (error) {
    console.error("[Login API Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
