import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { RedisRateStore } from "@/plugins/rate-limit-store";

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

    // RateLimit-* headers are set.
    expect(limited.headers.get("ratelimit-limit")).toBeTruthy();

    // Still limited on a subsequent request (errorResponse reused safely).
    expect((await ping()).status).toBe(429);
  });
});
