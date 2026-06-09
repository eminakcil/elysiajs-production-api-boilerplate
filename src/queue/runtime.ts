import { Worker } from "bullmq";
import { logger } from "@/lib/logger";
import { connection } from "./connection";
import type { QueueDef } from "./define";

/**
 * Start a BullMQ worker for a queue. Only valid in "redis" driver mode — run
 * from the worker entrypoint (src/worker.ts).
 */
export function startWorker<T>(q: QueueDef<T>): Worker<T> {
  if (!connection)
    throw new Error(
      "Cannot start a worker without a Redis connection (set QUEUE_DRIVER=redis)",
    );

  const worker = new Worker<T>(q.name, (job) => q.processor(job.data), {
    connection,
    concurrency: 5,
  });

  worker.on("failed", (job, err) =>
    logger.error({ queue: q.name, jobId: job?.id, err }, "queue job failed"),
  );

  return worker;
}

/**
 * Register a repeatable (cron-like) job that fires every `every` ms. No-op under
 * the "sync" driver (no BullMQ queue). BullMQ dedupes by repeat key, so calling
 * this on every worker start is safe and won't pile up schedulers.
 */
export async function scheduleRepeatable<T>(
  q: QueueDef<T>,
  data: T,
  opts: { every: number },
): Promise<void> {
  if (!q.bull) return;
  await q.bull.add(q.name, data, {
    repeat: { every: opts.every },
    removeOnComplete: true,
    removeOnFail: 100,
  });
}
