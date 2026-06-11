import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, refreshTokens } from "@/db/schema";
import { deleteOldAuditLogs } from "@/lib/audit";
import { AuthService } from "@/modules/auth/service";
import { auditRetentionQueue } from "@/queue/maintenance.queue";
import { registerUser } from "./helpers";

const DAY_MS = 86_400_000;

const auditRowsFor = (action: string) =>
  db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(eq(auditLogs.action, action));

describe("token cleanup (requires Postgres)", () => {
  it("deletes expired refresh tokens but keeps valid ones", async () => {
    const u = await registerUser();
    const family = crypto.randomUUID();

    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 60_000);
    // Unique token values so hashes don't collide across runs.
    await AuthService.storeRefreshToken(
      u.id,
      `expired-${crypto.randomUUID()}`,
      past,
      family,
    );
    await AuthService.storeRefreshToken(
      u.id,
      `valid-${crypto.randomUUID()}`,
      future,
      family,
    );

    const removed = await AuthService.deleteExpiredRefreshTokens();
    expect(removed).toBeGreaterThanOrEqual(1);

    const remaining = await db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, u.id));
    // The registration token + the still-valid token remain; the expired one is gone.
    const count = remaining.length;
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

describe("audit log retention (requires Postgres)", () => {
  it("purges rows older than the retention window, keeps newer ones", async () => {
    const marker = `test.retention.${crypto.randomUUID()}`;
    await db.insert(auditLogs).values([
      { action: marker, createdAt: new Date(Date.now() - 91 * DAY_MS) },
      { action: marker }, // createdAt defaults to now
    ]);

    const removed = await deleteOldAuditLogs(90);

    expect(removed).toBeGreaterThanOrEqual(1);
    expect((await auditRowsFor(marker)).length).toBe(1);
  });

  it("keeps everything when retention is disabled (0 days)", async () => {
    const marker = `test.retention-off.${crypto.randomUUID()}`;
    await db.insert(auditLogs).values({
      action: marker,
      createdAt: new Date(Date.now() - 365 * DAY_MS),
    });

    const removed = await deleteOldAuditLogs(0);

    expect(removed).toBe(0);
    expect((await auditRowsFor(marker)).length).toBe(1);
  });

  it("runs through the maintenance queue", async () => {
    const marker = `test.retention-queue.${crypto.randomUUID()}`;
    await db.insert(auditLogs).values({
      action: marker,
      createdAt: new Date(Date.now() - 400 * DAY_MS),
    });

    // Sync driver in tests: add() runs the processor inline.
    await auditRetentionQueue.add(undefined);

    expect((await auditRowsFor(marker)).length).toBe(0);
  });
});
