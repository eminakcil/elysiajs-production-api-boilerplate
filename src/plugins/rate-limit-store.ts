import type { RedisClient } from "bun";
import { redis } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { withDeadline } from "@/lib/time";

/** The slice of the Redis client the store needs (injectable for tests). */
export type RateStoreClient = Pick<
  RedisClient,
  "incr" | "expire" | "ttl" | "del" | "send"
>;

interface StoreOpts {
  /** Key namespace — give each limiter its own so counters can't collide. */
  prefix?: string;
  client?: RateStoreClient;
  /** Deadline per Redis op (ms) — a hung Redis must not hang requests. */
  timeoutMs?: number;
}

/**
 * Redis-backed store for elysia-rate-limit (implements its `Context` interface).
 * Using Redis (instead of the default in-memory LRU) keeps counters shared
 * across API replicas — required for correct limiting in production.
 * Fixed-window counter: INCR + EXPIRE on first hit.
 *
 * **Fails open:** if Redis is down (or a command exceeds the deadline) the
 * request is allowed and a warning is logged — an outage degrades to
 * "unlimited" rather than turning every endpoint into a 429 or a hang.
 */
export class RedisRateStore {
  private readonly prefix: string;
  private readonly client: RateStoreClient;
  private readonly timeoutMs: number;

  constructor(opts: StoreOpts = {}) {
    this.prefix = opts.prefix ?? "rl";
    this.client = opts.client ?? redis;
    this.timeoutMs = opts.timeoutMs ?? 2000;
  }

  init() {}

  private bounded<T>(work: PromiseLike<T>): Promise<T> {
    return withDeadline(work, this.timeoutMs);
  }

  async increment(key: string, duration = 60_000, requestTime = Date.now()) {
    const k = `${this.prefix}:${key}`;
    try {
      const count = await this.bounded(this.client.incr(k));
      if (count === 1)
        await this.bounded(this.client.expire(k, Math.ceil(duration / 1000)));
      const ttl = await this.bounded(this.client.ttl(k));
      const ms = ttl > 0 ? ttl * 1000 : duration;
      return {
        count,
        nextReset: new Date(requestTime + ms),
        start: requestTime,
      };
    } catch (err) {
      logger.warn(
        { err, key: k },
        "rate-limit store unavailable — failing open",
      );
      return {
        count: 1,
        nextReset: new Date(requestTime + duration),
        start: requestTime,
      };
    }
  }

  async decrement(key: string) {
    try {
      await this.bounded(this.client.send("DECR", [`${this.prefix}:${key}`]));
    } catch {
      // fail open — increment already logged if Redis is down
    }
  }

  async reset(key?: string) {
    if (!key) return;
    try {
      await this.bounded(this.client.del(`${this.prefix}:${key}`));
    } catch {
      // fail open
    }
  }

  async kill() {}
}
