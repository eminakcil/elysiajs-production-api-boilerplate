import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/config/env";
import * as schema from "./schema";

/**
 * Postgres connection + Drizzle client. Import `db` anywhere a query is needed.
 * The underlying postgres.js client (`queryClient`) is exported for graceful
 * shutdown.
 */
export const queryClient = postgres(env.DATABASE_URL);

export const db = drizzle(queryClient, { schema });

export { schema };
