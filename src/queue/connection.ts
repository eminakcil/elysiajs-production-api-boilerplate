import type { ConnectionOptions } from "bullmq";
import { env, isTest } from "../config/env";

/**
 * Queue driver:
 * - "redis"  → BullMQ producers/workers backed by Redis (dev/prod).
 * - "sync"   → jobs run inline in-process (no Redis/worker needed). Forced in
 *              tests so the suite stays fast and self-contained.
 */
export const driver: "redis" | "sync" = isTest ? "sync" : env.QUEUE_DRIVER;

/**
 * BullMQ connection options derived from REDIS_URL. We pass options (not an
 * ioredis instance) so BullMQ owns the client — avoids ioredis version clashes.
 * `maxRetriesPerRequest: null` is required by BullMQ. Null in "sync" mode.
 */
export const connection: ConnectionOptions | null = (() => {
  if (driver !== "redis") return null;
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined,
    maxRetriesPerRequest: null,
  };
})();
