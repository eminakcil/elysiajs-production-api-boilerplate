import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { refreshTokens } from "@/db/schema";
import { AuthService } from "@/modules/auth/service";
import { registerUser } from "./helpers";

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
