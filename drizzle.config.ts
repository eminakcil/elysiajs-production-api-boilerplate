import { defineConfig } from "drizzle-kit";

// Read DATABASE_URL directly from the environment (Bun auto-loads .env for
// `bun run`) so migrations don't require the full app env (JWT secrets etc).
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required to run drizzle-kit");

export default defineConfig({
  schema: "./src/db/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
