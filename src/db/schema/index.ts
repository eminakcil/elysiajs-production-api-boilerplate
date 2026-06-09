/**
 * Schema barrel. Add a file per table (or per cohesive group of tables) in this
 * folder and re-export it here. Everything exported from this file is picked up
 * by drizzle-kit (see drizzle.config.ts) and available as `import { ... } from "@/db/schema"`.
 */
export * from "./refresh-tokens";
export * from "./users";

import { refreshTokens } from "./refresh-tokens";
import { users } from "./users";

/** Singleton of all tables — used by the drizzle-typebox helpers in db/model.ts. */
export const table = { users, refreshTokens } as const;
export type Table = typeof table;
