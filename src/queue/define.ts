import { type JobsOptions, Queue } from "bullmq";
import { connection, driver } from "./connection";

/** Retry/cleanup defaults applied to every job unless overridden. */
const DEFAULT_JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: true,
  removeOnFail: 500,
};

export interface QueueDef<T> {
  name: string;
  processor: (data: T) => Promise<void>;
  /** Underlying BullMQ queue (null in "sync" driver). */
  bull: Queue | null;
  /** Enqueue a job (redis), or run it inline (sync). */
  add: (data: T, opts?: JobsOptions) => Promise<void>;
}

/**
 * Define a typed background queue. The same `processor` is used both by the
 * BullMQ worker (see runtime.ts) and by the inline "sync" driver, so there is a
 * single source of truth for how a job is handled.
 */
export function defineQueue<T>(
  name: string,
  processor: (data: T) => Promise<void>,
  defaultJobOpts: JobsOptions = {},
): QueueDef<T> {
  const bull =
    driver === "redis" && connection ? new Queue(name, { connection }) : null;

  return {
    name,
    processor,
    bull,
    async add(data, opts) {
      if (bull) {
        await bull.add(name, data, {
          ...DEFAULT_JOB_OPTS,
          ...defaultJobOpts,
          ...opts,
        });
      } else {
        // sync driver: process inline so callers/tests don't need a worker.
        await processor(data);
      }
    },
  };
}
