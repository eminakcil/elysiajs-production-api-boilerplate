import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import {
  type RateStoreClient,
  RedisRateStore,
} from "@/plugins/rate-limit-store";

// A throwaway limiter with a fixed key and max=2 (no `skip`, unlike the app's
// module limiters which are skipped in tests). Verifies the Redis store + 429.
const key = `test:${crypto.randomUUID()}`;
const app = new Elysia()
  .use(
    rateLimit({
      scoping: "scoped",
      max: 2,
      duration: 60_000,
      headers: true,
      context: new RedisRateStore(),
      generator: () => key,
      errorResponse: new Response(
        JSON.stringify({ error: "RATE_LIMITED", message: "Too many requests" }),
        { status: 429, headers: { "content-type": "application/json" } },
      ),
    }),
  )
  .get("/ping", () => "ok");

const ping = () => app.handle(new Request("http://localhost/ping"));

describe("rate limiting (requires Redis)", () => {
  it("allows up to the limit, then returns 429", async () => {
    expect((await ping()).status).toBe(200);
    expect((await ping()).status).toBe(200);

    const limited = await ping();
    expect(limited.status).toBe(429);
    expect(((await limited.json()) as { error: string }).error).toBe(
      "RATE_LIMITED",
    );

    // RateLimit-* headers are set, and the 429 carries Retry-After so
    // well-behaved clients know when to back off.
    expect(limited.headers.get("ratelimit-limit")).toBeTruthy();
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);

    // Still limited on a subsequent request (errorResponse reused safely).
    expect((await ping()).status).toBe(429);
  });
});

/** A client stub for simulating Redis failure modes. */
const failingClient = (behavior: "reject" | "hang"): RateStoreClient =>
  ({
    incr: () =>
      behavior === "reject"
        ? Promise.reject(new Error("connection refused"))
        : new Promise(() => {}),
  }) as unknown as RateStoreClient;

describe("RedisRateStore", () => {
  it("fails open when redis rejects — requests are not blocked", async () => {
    const store = new RedisRateStore({
      client: failingClient("reject"),
      timeoutMs: 50,
    });

    // Two increments: a working store would count 1, 2 — fail-open always
    // reports 1 so the limiter never trips because of an outage.
    expect((await store.increment("k", 60_000)).count).toBe(1);
    expect((await store.increment("k", 60_000)).count).toBe(1);
  });

  it("fails open within the deadline when redis hangs", async () => {
    const store = new RedisRateStore({
      client: failingClient("hang"),
      timeoutMs: 20,
    });

    const start = performance.now();
    expect((await store.increment("k", 60_000)).count).toBe(1);
    expect((await store.increment("k", 60_000)).count).toBe(1);
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it("isolates counters by keyspace prefix", async () => {
    const key = `iso:${crypto.randomUUID()}`;
    const a = new RedisRateStore({ prefix: "rl:a" });
    const b = new RedisRateStore({ prefix: "rl:b" });

    expect((await a.increment(key, 60_000)).count).toBe(1);
    expect((await a.increment(key, 60_000)).count).toBe(2);
    // Same logical key, different keyspace — counters must not bleed.
    expect((await b.increment(key, 60_000)).count).toBe(1);
  });
});
