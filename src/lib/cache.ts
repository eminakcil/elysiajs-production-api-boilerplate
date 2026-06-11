import { RedisClient } from "bun";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { withDeadline } from "@/lib/time";

/**
 * Shared Redis client (Bun's built-in RedisClient — no extra dependency).
 * Connects lazily on first command and auto-reconnects; startup additionally
 * fail-fasts via lib/readiness.ts. Closed on graceful shutdown (see index.ts).
 */
export const redis = new RedisClient(env.REDIS_URL);

// Surface connection drops in the logs — without this a dead Redis is only
// visible as failed commands. Fires on graceful shutdown too (one warn line).
redis.onclose = (err) => logger.warn({ err }, "redis connection closed");

/**
 * Every cache op is deadline-bounded: while Redis is down/reconnecting the
 * client queues commands indefinitely, which would otherwise turn each cache
 * call into a hung request. Bounded ops fail fast (reject) instead — callers
 * keep their normal error paths, they just get them promptly.
 */
const REDIS_OP_TIMEOUT_MS = 2000;
const bounded = <T>(work: PromiseLike<T>) =>
  withDeadline(work, REDIS_OP_TIMEOUT_MS);

/**
 * Thin, reusable cache helpers. Not OTP-specific — use for any caching need.
 * Key convention: "<domain>:<name>:<id>" (e.g. "otp:verify:<userId>").
 */
export const cache = {
  get: (key: string) => bounded(redis.get(key)),

  /** Set a value, optionally with a TTL in seconds. */
  set: (key: string, value: string, ttlSeconds?: number) =>
    bounded(
      ttlSeconds
        ? redis.set(key, value, "EX", ttlSeconds)
        : redis.set(key, value),
    ),

  del: (key: string) => bounded(redis.del(key)),

  /** Atomic increment; returns the new value. Pair with `expire` for windows. */
  incr: (key: string) => bounded(redis.incr(key)),

  expire: (key: string, ttlSeconds: number) =>
    bounded(redis.expire(key, ttlSeconds)),

  exists: (key: string) => bounded(redis.exists(key)),
};
