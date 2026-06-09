import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth";
import { api, body, json, lastOtp, registerUser, verifyEmail } from "./helpers";

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("email verification (OTP, requires Postgres + Redis)", () => {
  it("registers unverified, then verifies via emailed code", async () => {
    const u = await registerUser();

    let me = await body(
      await api("/auth/me", { headers: bearer(u.accessToken) }),
    );
    expect(me.emailVerified).toBe(false);

    const req = await api("/auth/email/request-otp", {
      method: "POST",
      headers: bearer(u.accessToken),
    });
    expect(req.status).toBe(200);

    const code = lastOtp(u.email);
    expect(code).toBeString();

    const wrong = await json(
      "/auth/email/verify",
      "POST",
      { code: "000000" },
      u.accessToken,
    );
    expect(wrong.status).toBe(400);

    const ok = await json(
      "/auth/email/verify",
      "POST",
      { code },
      u.accessToken,
    );
    expect(ok.status).toBe(200);
    expect((await body(ok)).verified).toBe(true);

    me = await body(await api("/auth/me", { headers: bearer(u.accessToken) }));
    expect(me.emailVerified).toBe(true);
  });

  it("rejects requesting a code when already verified", async () => {
    const u = await registerUser();
    await verifyEmail(u.accessToken, u.email);

    const again = await api("/auth/email/request-otp", {
      method: "POST",
      headers: bearer(u.accessToken),
    });
    expect(again.status).toBe(400);
  });

  it("enforces a resend cooldown", async () => {
    const u = await registerUser();
    const first = await api("/auth/email/request-otp", {
      method: "POST",
      headers: bearer(u.accessToken),
    });
    expect(first.status).toBe(200);

    const second = await api("/auth/email/request-otp", {
      method: "POST",
      headers: bearer(u.accessToken),
    });
    expect(second.status).toBe(400);
  });

  it("verifiedEmail guard blocks until the email is verified (same token)", async () => {
    const u = await registerUser();
    const guarded = new Elysia()
      .use(authPlugin)
      .get("/secret", () => "ok", { verifiedEmail: true });

    const before = await guarded.handle(
      new Request("http://localhost/secret", {
        headers: bearer(u.accessToken),
      }),
    );
    expect(before.status).toBe(403);

    await verifyEmail(u.accessToken, u.email);

    // Same (pre-verification) token now passes — the guard checks the DB, not the token.
    const after = await guarded.handle(
      new Request("http://localhost/secret", {
        headers: bearer(u.accessToken),
      }),
    );
    expect(after.status).toBe(200);
  });
});
