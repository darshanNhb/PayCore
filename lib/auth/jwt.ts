import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * JWT token signing and verification using jose.
 * Access tokens: short-lived (15m default), carry role/employeeId.
 * Refresh tokens: long-lived (30d default), used for session rotation.
 * Both are stored in httpOnly, Secure, SameSite=Strict cookies.
 *
 * @see PayCore_Build_Prompt.md Section 6.1
 */

// ── Types ────────────────────────────────────

export interface AccessTokenPayload extends JWTPayload {
  sub: string; // userId
  role: string;
  employeeId?: string;
  jti: string;
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string; // userId
  jti: string;
}

// ── Helpers ──────────────────────────────────

function getSecret(envVar: string): Uint8Array {
  const secret = process.env[envVar];
  if (!secret) {
    throw new Error(`Missing environment variable: ${envVar}`);
  }
  return new TextEncoder().encode(secret);
}

/**
 * Parse a duration string like "15m", "30d", "1h" into seconds.
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 3600;
    case "d":
      return value * 86400;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}

// ── Access Token ─────────────────────────────

/**
 * Sign a short-lived access token (default 15min).
 * Claims: sub (userId), role, employeeId, jti (unique token ID).
 */
export async function signAccessToken(payload: {
  userId: string;
  role: string;
  employeeId?: string;
  jti: string;
}): Promise<string> {
  const ttl = process.env.JWT_ACCESS_TTL || "15m";
  const secret = getSecret("JWT_ACCESS_SECRET");

  return new SignJWT({
    sub: payload.userId,
    role: payload.role,
    employeeId: payload.employeeId,
    jti: payload.jti,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${parseDuration(ttl)}s`)
    .setIssuer("paycore")
    .sign(secret);
}

/**
 * Verify and decode an access token.
 * Throws on invalid/expired tokens.
 */
export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload> {
  const secret = getSecret("JWT_ACCESS_SECRET");
  const { payload } = await jwtVerify(token, secret, {
    issuer: "paycore",
  });
  return payload as AccessTokenPayload;
}

// ── Refresh Token ────────────────────────────

/**
 * Sign a long-lived refresh token (default 30d).
 * Claims: sub (userId), jti (unique token ID for rotation tracking).
 */
export async function signRefreshToken(payload: {
  userId: string;
  jti: string;
}): Promise<string> {
  const ttl = process.env.JWT_REFRESH_TTL || "30d";
  const secret = getSecret("JWT_REFRESH_SECRET");

  return new SignJWT({
    sub: payload.userId,
    jti: payload.jti,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${parseDuration(ttl)}s`)
    .setIssuer("paycore")
    .sign(secret);
}

/**
 * Verify and decode a refresh token.
 * Throws on invalid/expired tokens.
 */
export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload> {
  const secret = getSecret("JWT_REFRESH_SECRET");
  const { payload } = await jwtVerify(token, secret, {
    issuer: "paycore",
  });
  return payload as RefreshTokenPayload;
}

/**
 * Get the remaining TTL of the access token in seconds.
 * Used when blacklisting a token on logout — the blacklist entry
 * only needs to live as long as the token is still valid.
 */
export function getAccessTokenTTLSeconds(): number {
  const ttl = process.env.JWT_ACCESS_TTL || "15m";
  return parseDuration(ttl);
}

/**
 * Get the refresh token TTL in seconds.
 */
export function getRefreshTokenTTLSeconds(): number {
  const ttl = process.env.JWT_REFRESH_TTL || "30d";
  return parseDuration(ttl);
}
