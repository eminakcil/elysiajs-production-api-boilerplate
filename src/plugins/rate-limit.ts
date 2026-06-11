import { rateLimit } from "elysia-rate-limit";
import { isTest } from "@/config/env";
import { clientIp } from "@/lib/ip";
import { RedisRateStore } from "./rate-limit-store";

interface Opts {
  max?: number;
  duration?: number;
  /**
   * Counter namespace. Give every limiter its own — two limiters writing the
   * same key would double-count each request.
   */
  keyspace?: string;
}

const tooMany = () =>
  new Response(
    JSON.stringify({ error: "RATE_LIMITED", message: "Too many requests" }),
    { status: 429, headers: { "content-type": "application/json" } },
  );

const store = (keyspace?: string) =>
  new RedisRateStore({ prefix: keyspace ? `rl:${keyspace}` : "rl" });

/**
 * Per-IP rate limit. Apply to a group/module: `.use(ipRateLimit({ max, duration }))`.
 * Good for public/auth endpoints (brute-force protection). Skipped in tests.
 */
export const ipRateLimit = ({
  max = 20,
  duration = 60_000,
  keyspace,
}: Opts = {}) =>
  rateLimit({
    scoping: "scoped",
    max,
    duration,
    headers: true,
    skip: () => isTest,
    context: store(keyspace),
    errorResponse: tooMany(),
    generator: (req, server) => `ip:${clientIp(req, server)}`,
  });

/**
 * Per-user rate limit (for authenticated groups). Keys by the resolved user id
 * when available, else the bearer token, else the client IP.
 */
export const userRateLimit = ({
  max = 60,
  duration = 60_000,
  keyspace,
}: Opts = {}) =>
  rateLimit({
    scoping: "scoped",
    max,
    duration,
    headers: true,
    skip: () => isTest,
    context: store(keyspace),
    errorResponse: tooMany(),
    // biome-ignore lint/suspicious/noExplicitAny: derived shape is plugin-defined
    generator: (req, server, derived: any) => {
      const sub = derived?.user?.sub;
      if (sub) return `user:${sub}`;
      const auth = req.headers.get("authorization");
      if (auth?.startsWith("Bearer ")) return `token:${auth.slice(7, 39)}`;
      return `ip:${clientIp(req, server)}`;
    },
  });
