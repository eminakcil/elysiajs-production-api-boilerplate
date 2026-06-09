import { t } from "elysia";

/** Public-safe representation of a user (never includes the password hash). */
export const publicUser = t.Object({
  id: t.String(),
  email: t.String({ format: "email" }),
  name: t.Nullable(t.String()),
  role: t.Union([t.Literal("user"), t.Literal("admin")]),
});

export const authModel = {
  registerBody: t.Object({
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 8, maxLength: 128 }),
    name: t.Optional(t.String({ maxLength: 255 })),
  }),
  loginBody: t.Object({
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 8, maxLength: 128 }),
  }),
  refreshBody: t.Object({
    refreshToken: t.String({ minLength: 1 }),
  }),
  tokenResponse: t.Object({
    accessToken: t.String(),
    refreshToken: t.String(),
    user: publicUser,
  }),
  publicUser,
} as const;
