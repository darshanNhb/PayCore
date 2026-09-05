import { headers, cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  verifyAccessToken,
  type AccessTokenPayload,
} from "./jwt";

/**
 * Session management: JWT session helpers.
 * Reads token from Authorization header (Bearer) or cookie fallback.
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
 * Get the current session.
 * First checks Authorization: Bearer header.
 * Falls back to cookies for SSR/initial load compatibility.
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    let accessToken: string | undefined;

    // 1. Try Authorization header
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7);
    }

    // 2. Try cookie fallback
    if (!accessToken) {
      const cookieStore = await cookies();
      accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    }

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
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

// ── Write cookies (Fallback) ─────────────────

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
