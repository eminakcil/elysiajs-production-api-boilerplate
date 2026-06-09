import { emailQueue } from "./queue/email.queue";
import { startWorker } from "./queue/runtime";

// Background worker entrypoint. Run alongside the API: `bun run worker`
// (dev) or as a separate container in production (see docker-compose.prod.yml).
const workers = [startWorker(emailQueue)];

console.log(`🛠️  Worker ready — processing queues: ${emailQueue.name}`);

const shutdown = async (signal: string) => {
  console.log(`\n${signal} received — shutting down worker...`);
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
