import { logger } from "@/lib/logger";
import { AuthService } from "@/modules/auth/service";
import { defineQueue } from "./define";

/**
 * Periodic maintenance. Currently sweeps expired refresh tokens (which the reuse
 * detection in auth keeps around until expiry). Scheduled hourly from the worker
 * (see worker.ts); add more housekeeping here as needed.
 */
export const tokenCleanupQueue = defineQueue<void>(
  "token-cleanup",
  async () => {
    const removed = await AuthService.deleteExpiredRefreshTokens();
    if (removed > 0) logger.info({ removed }, "swept expired refresh tokens");
  },
);

/** How often the cleanup runs (ms). */
export const TOKEN_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // hourly
