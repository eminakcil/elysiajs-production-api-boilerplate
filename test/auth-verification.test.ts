import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth";
import {
  api,
  body,
  json,
  lastOtp,
  promoteToAdmin,
  registerUser,
  setEnv,
  uniqueEmail,
  verifyEmailFromOutbox,
} from "./helpers";

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("mandatory email verification (REQUIRE_VERIFIED_EMAIL=true, requires a running database)", () => {
  let restore: () => void;

  beforeAll(() => {
    restore = setEnv("REQUIRE_VERIFIED_EMAIL", true);
  });
  afterAll(() => restore());

  // NOTE: never call /auth/email/request-otp for users registered in this
  // block — register auto-issues the OTP and consumes the 60s resend cooldown.

  it("gates `can` routes for unverified users", async () => {
    const u = await registerUser();
    const res = await api("/users", { headers: bearer(u.accessToken) });
    expect(res.status).toBe(403);
    expect((await body(res)).error).toBe("EMAIL_NOT_VERIFIED");
  });

  it("exempts /auth/me and /auth/logout", async () => {
    const email = uniqueEmail();
    const reg = await body(
      await json("/auth/register", "POST", { email, password: "supersecret" }),
    );

    const me = await api("/auth/me", { headers: bearer(reg.accessToken) });
    expect(me.status).toBe(200);
    expect((await body(me)).emailVerified).toBe(false);

    const out = await json(
      "/auth/logout",
      "POST",
      { refreshToken: reg.refreshToken },
      reg.accessToken,
    );
    expect(out.status).toBe(200);
  });

  it("auto-emails the verification OTP on register", async () => {
    const email = uniqueEmail();
    const res = await json("/auth/register", "POST", {
      email,
      password: "supersecret",
    });
    expect(res.status).toBe(200);
    expect(lastOtp(email)).toMatch(/^\d{6}$/);
  });

  it("unblocks protected routes after verifying — with the pre-verification token", async () => {
    const u = await registerUser();

    const before = await api("/users", { headers: bearer(u.accessToken) });
    expect(before.status).toBe(403);

    const verified = await verifyEmailFromOutbox(u.accessToken, u.email);
    expect(verified.status).toBe(200);

    // Same token now passes — the gate checks the DB, not the JWT.
    const after = await api("/users", { headers: bearer(u.accessToken) });
    expect(after.status).toBe(200);
  });

  it("gates hasRole before authz: unverified admin 403 EMAIL_NOT_VERIFIED, verified non-admin 403 FORBIDDEN", async () => {
    // No src route uses hasRole — exercise the macro on an ad-hoc instance
    // (same pattern as the verifiedEmail test in otp.test.ts).
    const guarded = new Elysia()
      .use(authPlugin)
      .get("/admin-only", () => "ok", { hasRole: "admin" });
    const get = (token: string) =>
      guarded.handle(
        new Request("http://localhost/admin-only", { headers: bearer(token) }),
      );

    const admin = await registerUser();
    await promoteToAdmin(admin.id);

    const unverified = await get(admin.accessToken);
    expect(unverified.status).toBe(403);
    expect((await body(unverified)).error).toBe("EMAIL_NOT_VERIFIED");

    await verifyEmailFromOutbox(admin.accessToken, admin.email);
    // The pre-promotion token lacks the admin role — re-login for a fresh one.
    const login = await body(
      await json("/auth/login", "POST", {
        email: admin.email,
        password: admin.password,
      }),
    );
    expect((await get(login.accessToken)).status).toBe(200);

    // Verified but non-admin → the ordinary FORBIDDEN, proving verification
    // is checked before authorization.
    const plain = await registerUser();
    await verifyEmailFromOutbox(plain.accessToken, plain.email);
    const forbidden = await get(plain.accessToken);
    expect(forbidden.status).toBe(403);
    expect((await body(forbidden)).error).toBe("FORBIDDEN");
  });

  it("keeps /auth/refresh accessible while unverified", async () => {
    const reg = await body(
      await json("/auth/register", "POST", {
        email: uniqueEmail(),
        password: "supersecret",
      }),
    );
    const refreshed = await json("/auth/refresh", "POST", {
      refreshToken: reg.refreshToken,
    });
    expect(refreshed.status).toBe(200);
  });
});

describe("mandatory email verification disabled (default)", () => {
  it("does not auto-send the OTP and leaves routes open to unverified users", async () => {
    const u = await registerUser();
    expect(lastOtp(u.email)).toBeUndefined();

    const res = await api("/users", { headers: bearer(u.accessToken) });
    expect(res.status).toBe(200);
  });
});
