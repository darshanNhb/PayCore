import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

/**
 * Rate limiting for auth and sensitive endpoints.
 * Uses Upstash @upstash/ratelimit with sliding window.
 *
 * @see PayCore_Build_Prompt.md Section 6.1, 3.2
 */

/**
 * Login rate limiter: 5 attempts per 5 minutes per IP.
 * Prevents brute-force credential stuffing.
 */
export const loginRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "5 m"),
  prefix: "ratelimit:login",
  analytics: true,
});

/**
 * General API rate limiter: 100 requests per 60 seconds per user.
 * Prevents API abuse.
 */
export const apiRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "60 s"),
  prefix: "ratelimit:api",
  analytics: true,
});

/**
 * Password reset rate limiter: 3 attempts per 15 minutes per IP.
 * Prevents abuse of the reset flow.
 */
export const resetPasswordRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "15 m"),
  prefix: "ratelimit:reset",
  analytics: true,
});
