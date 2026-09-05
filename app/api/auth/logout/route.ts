import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { clearAuthCookies, REFRESH_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE } from "@/lib/auth/session";
import { verifyAccessToken, verifyRefreshToken, getAccessTokenTTLSeconds } from "@/lib/auth/jwt";
import { redis } from "@/lib/redis";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    const refreshTokenStr = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

    // 1. Blacklist the access token if it's still valid
    if (accessToken) {
      try {
        const payload = await verifyAccessToken(accessToken);
        if (payload.jti) {
          const ttl = getAccessTokenTTLSeconds();
          // Store in redis with TTL matching token expiry
          await redis.setex(`blacklist:${payload.jti}`, ttl, "revoked");
        }
      } catch (e) {
        // Token already expired/invalid, no need to blacklist
      }
    }

    // 2. Revoke the refresh token in the database
    if (refreshTokenStr) {
      try {
        const payload = await verifyRefreshToken(refreshTokenStr);
        
        // Hash it to find in DB
        const tokenBuffer = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(refreshTokenStr)
        );
        const tokenHash = Array.from(new Uint8Array(tokenBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        // Mark revoked
        await prisma.refreshToken.updateMany({
          where: { 
            userId: payload.sub,
            tokenHash: tokenHash,
            revokedAt: null 
          },
          data: { revokedAt: new Date() },
        });
      } catch (e) {
        // Token invalid, can't revoke. It's fine.
      }
    }

    // 3. Clear cookies
    const response = NextResponse.json({ success: true });
    return clearAuthCookies(response);

  } catch (error) {
    console.error("[Logout API Error]", error);
    // Still clear cookies on error to ensure client is logged out locally
    const response = NextResponse.json(
      { error: "Internal server error during logout" },
      { status: 500 }
    );
    return clearAuthCookies(response);
  }
}
