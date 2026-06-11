import { deleteOldAuditLogs } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { AuthService } from "@/modules/auth/service";
import { defineQueue } from "./define";

/**
 * Periodic maintenance, scheduled from the worker (see worker.ts):
 * - token-cleanup sweeps expired refresh tokens hourly (the reuse detection
 *   in auth keeps them around until expiry).
 * - audit-retention purges audit rows past AUDIT_RETENTION_DAYS daily.
 * Add more housekeeping here as needed.
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

export const auditRetentionQueue = defineQueue<void>(
  "audit-retention",
  async () => {
    const removed = await deleteOldAuditLogs();
    if (removed > 0) logger.info({ removed }, "purged old audit logs");
  },
);

/** How often the audit purge runs (ms). */
export const AUDIT_RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily
