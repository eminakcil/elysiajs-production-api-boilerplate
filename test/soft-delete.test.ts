import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { UserService } from "@/modules/user/service";
import { api, body, json, registerUser } from "./helpers";

const del = (id: string, token: string) =>
  api(`/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

describe("user soft delete", () => {
  test("DELETE marks the row instead of removing it", async () => {
    const admin = await registerUser({ admin: true });
    const victim = await registerUser();

    expect((await del(victim.id, admin.accessToken)).status).toBe(200);

    const [row] = await db.select().from(users).where(eq(users.id, victim.id));
    expect(row).toBeDefined();
    expect(row?.deletedAt).not.toBeNull();
  });

  test("a deleted user can no longer log in", async () => {
    const admin = await registerUser({ admin: true });
    const victim = await registerUser();
    await del(victim.id, admin.accessToken);

    const res = await json("/auth/login", "POST", {
      email: victim.email,
      password: victim.password,
    });
    expect(res.status).toBe(401);
  });

  test("a deleted user's refresh token is revoked", async () => {
    const admin = await registerUser({ admin: true });
    const reg = await body(
      await json("/auth/register", "POST", {
        email: `victim_${crypto.randomUUID()}@example.com`,
        password: "supersecret",
      }),
    );
    await del(reg.user.id, admin.accessToken);

    const res = await json("/auth/refresh", "POST", {
      refreshToken: reg.refreshToken,
    });
    expect(res.status).toBe(401);
  });

  test("a deleted user's access token stops working", async () => {
    const admin = await registerUser({ admin: true });
    const victim = await registerUser();
    await del(victim.id, admin.accessToken);

    const res = await api("/auth/me", {
      headers: { Authorization: `Bearer ${victim.accessToken}` },
    });
    expect(res.status).toBe(401);
  });

  test("deleted users are hidden from reads", async () => {
    const admin = await registerUser({ admin: true });
    const victim = await registerUser();
    await del(victim.id, admin.accessToken);

    const res = await api(`/users/${victim.id}`, {
      headers: { Authorization: `Bearer ${admin.accessToken}` },
    });
    expect(res.status).toBe(404);

    expect(await UserService.list(20, 0, victim.id)).toEqual([]);
  });

  test("the email address can be reused after deletion", async () => {
    const admin = await registerUser({ admin: true });
    const victim = await registerUser();
    await del(victim.id, admin.accessToken);

    const res = await json("/auth/register", "POST", {
      email: victim.email,
      password: "supersecret",
    });
    expect(res.status).toBe(200);
  });
});
