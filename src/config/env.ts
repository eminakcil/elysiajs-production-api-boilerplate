import { Value } from "@sinclair/typebox/value";
import { t } from "elysia";

/**
 * Environment variable schema — the single source of truth for configuration.
 * Validated once at boot; if anything is missing or malformed the process
 * exits before the server ever starts listening.
 */
const EnvSchema = t.Object({
  NODE_ENV: t.Union(
    [t.Literal("development"), t.Literal("production"), t.Literal("test")],
    { default: "development" },
  ),
  PORT: t.Number({ default: 3000 }),

  // Postgres connection string, e.g. postgres://user:pass@localhost:5432/app
  DATABASE_URL: t.String({ minLength: 1 }),

  // Auth secrets — keep these long and random in production.
  JWT_SECRET: t.String({ minLength: 16 }),
  JWT_REFRESH_SECRET: t.String({ minLength: 16 }),
  JWT_ACCESS_EXP: t.String({ default: "15m" }),
  JWT_REFRESH_EXP: t.String({ default: "7d" }),

  // Comma-separated list of allowed origins, or "*" for any.
  CORS_ORIGIN: t.String({ default: "*" }),
});

export type Env = typeof EnvSchema.static;

function loadEnv(): Env {
  // process.env values are strings; Convert coerces them to the schema types
  // (e.g. PORT "3000" -> 3000) and Default fills in any omitted values.
  let value: unknown = Value.Default(EnvSchema, { ...process.env });
  value = Value.Convert(EnvSchema, value);

  if (!Value.Check(EnvSchema, value)) {
    console.error("❌ Invalid environment variables:");
    for (const error of Value.Errors(EnvSchema, value)) {
      console.error(`  - ${error.path || "/"}: ${error.message}`);
    }
    process.exit(1);
  }

  // Strip unrelated process.env keys, returning only our typed config.
  return Value.Clean(EnvSchema, value) as Env;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
