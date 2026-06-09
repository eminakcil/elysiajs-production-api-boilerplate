import { app } from "./app";
import { env } from "./config/env";
import { queryClient } from "./db";
import { redis } from "./lib/cache";
import { emailQueue } from "./queue/email.queue";

app.listen(env.PORT, () => {
  console.log(
    `🦊 Elysia running at http://localhost:${env.PORT} (${env.NODE_ENV})`,
  );
  console.log(`📚 OpenAPI docs at http://localhost:${env.PORT}/openapi`);
});

// Graceful shutdown: stop accepting requests, then close the DB pool.
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received — shutting down...`);
  await app.stop();
  await queryClient.end({ timeout: 5 });
  redis.close();
  // Close queue producers (no-op in sync mode).
  await emailQueue.bull?.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
