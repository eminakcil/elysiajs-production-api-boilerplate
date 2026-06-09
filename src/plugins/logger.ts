import { Elysia } from "elysia";

/**
 * Request logging + per-request id. `requestId` is added to the context (scoped)
 * so handlers and downstream services can include it in logs. Each completed
 * request is logged with method, path, status and duration.
 */
export const loggerPlugin = new Elysia({ name: "logger" })
  .derive({ as: "scoped" }, () => ({
    requestId: crypto.randomUUID(),
    startedAt: performance.now(),
  }))
  .onAfterResponse(
    { as: "scoped" },
    ({ request, set, requestId, startedAt }) => {
      const ms = (performance.now() - startedAt).toFixed(1);
      const path = new URL(request.url).pathname;
      const status = set.status ?? "";
      console.log(`${request.method} ${path} ${status} ${ms}ms [${requestId}]`);
    },
  );
