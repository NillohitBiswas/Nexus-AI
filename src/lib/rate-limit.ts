import { Redis } from "@upstash/redis";
import { trackRedisRateLimit } from "@/lib/usage/track";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Sliding-window style limit: max `limit` requests per `windowSec` per key.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<{ ok: boolean; remaining: number }> {
  if (redis) {
    const bucketKey = `rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
    const count = await redis.incr(bucketKey);
    if (count === 1) await redis.expire(bucketKey, windowSec);
    const ok = count <= limit;
    trackRedisRateLimit({ key, allowed: ok });
    return { ok, remaining: Math.max(0, limit - count) };
  }

  const now = Date.now();
  const bucket = memoryBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1 };
  }
  bucket.count += 1;
  return { ok: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count) };
}
