import { redis } from "@/lib/cache";

/**
 * Redis-backed store for elysia-rate-limit (implements its `Context` interface).
 * Using Redis (instead of the default in-memory LRU) keeps counters shared
 * across API replicas — required for correct limiting in production.
 * Fixed-window counter: INCR + EXPIRE on first hit.
 */
export class RedisRateStore {
  init() {}

  async increment(key: string, duration = 60_000, requestTime = Date.now()) {
    const k = `rl:${key}`;
    const count = await redis.incr(k);
    if (count === 1) await redis.expire(k, Math.ceil(duration / 1000));
    const ttl = await redis.ttl(k);
    const ms = ttl > 0 ? ttl * 1000 : duration;
    return { count, nextReset: new Date(requestTime + ms), start: requestTime };
  }

  async decrement(key: string) {
    await redis.send("DECR", [`rl:${key}`]);
  }

  async reset(key?: string) {
    if (key) await redis.del(`rl:${key}`);
  }

  async kill() {}
}
