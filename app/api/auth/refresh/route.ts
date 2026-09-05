import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { REFRESH_TOKEN_COOKIE, setAuthCookies, clearAuthCookies } from "@/lib/auth/session";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth/jwt";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshTokenStr = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!refreshTokenStr) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    // 1. Verify token signature and expiry
    let payload;
    try {
      payload = await verifyRefreshToken(refreshTokenStr);
    } catch (e) {
      const response = NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
      return clearAuthCookies(response);
    }

    if (!payload.sub) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });
    }

    // 2. Hash it to check DB
    const tokenBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(refreshTokenStr)
    );
    const tokenHash = Array.from(new Uint8Array(tokenBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 3. Look up token in DB
    const dbToken = await prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash: tokenHash,
      },
    });

    // 4. Validate DB token state
    if (!dbToken) {
      const response = NextResponse.json({ error: "Token not found" }, { status: 401 });
      return clearAuthCookies(response);
    }

    if (dbToken.revokedAt) {
      // WARNING: Token reuse detected! Someone used a revoked token.
      // This might indicate a compromised token. We should revoke ALL tokens for this user.
      console.warn(`[Auth] Refresh token reuse detected for user ${payload.sub}`);
      await prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      const response = NextResponse.json({ error: "Token compromised" }, { status: 401 });
      return clearAuthCookies(response);
    }

    if (dbToken.expiresAt < new Date()) {
      const response = NextResponse.json({ error: "Token expired" }, { status: 401 });
      return clearAuthCookies(response);
    }

    // 5. Get fresh user data to embed in new access token
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      const response = NextResponse.json({ error: "User inactive or deleted" }, { status: 401 });
      return clearAuthCookies(response);
    }

    // 6. Rotate tokens
    const jtiAccess = crypto.randomUUID();
    const jtiRefresh = crypto.randomUUID();

    const newAccessToken = await signAccessToken({
      userId: user.id,
      role: user.role,
      employeeId: user.employeeId || undefined,
      jti: jtiAccess,
    });

    const newRefreshToken = await signRefreshToken({
      userId: user.id,
      jti: jtiRefresh,
    });

    const newTokenBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(newRefreshToken)
    );
    const newTokenHash = Array.from(new Uint8Array(newTokenBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 7. Transaction: Revoke old, create new
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: dbToken.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          expiresAt,
          createdByIp: dbToken.createdByIp, // carry over original IP if missing request context
        },
      }),
    ]);

    // 8. Return
    const response = NextResponse.json({ success: true });
    return setAuthCookies(response, newAccessToken, newRefreshToken);

  } catch (error) {
    console.error("[Refresh API Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
