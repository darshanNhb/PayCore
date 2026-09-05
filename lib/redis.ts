import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client singleton.
 * REST-based, edge-safe — works in Next.js middleware and serverless functions.
 *
 * Used for: dashboard caching, JWT blacklist, rate limiting,
 * idempotency keys, payrun locks, OTP storage.
 *
 * @see PayCore_Build_Prompt.md Section 3.2
 */

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // In development without Redis, return a no-op client that won't crash
    // but will log warnings. In production this should fail loudly.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production"
      );
    }
    console.warn(
      "[PayCore] Upstash Redis credentials not set — using fast in-memory mock client"
    );
    const store = new Map<string, any>();
    return {
      get: async (k: string) => store.get(k) ?? null,
      set: async (k: string, v: any) => { store.set(k, v); return "OK"; },
      del: async (k: string) => { store.delete(k); return 1; },
      setex: async (k: string, _t: number, v: any) => { store.set(k, v); return "OK"; },
      exists: async (k: string) => (store.has(k) ? 1 : 0),
    } as unknown as Redis;
  }

  return new Redis({ url, token });
}

export const redis: Redis =
  globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
