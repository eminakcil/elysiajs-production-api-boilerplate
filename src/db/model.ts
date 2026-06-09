import { createInsertSchema, createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";
import { table } from "./schema";
import { spreads } from "./utils";

/**
 * Column-level TypeBox schemas derived directly from the Drizzle tables.
 * This is the single source of truth — compose these into request/response
 * models inside each feature module (see modules/user/model.ts).
 */
export const dbSchema = {
  insert: spreads(
    {
      users: createInsertSchema(table.users, {
        email: t.String({ format: "email" }),
      }),
    },
    "insert",
  ),
  select: spreads(
    {
      users: createSelectSchema(table.users, {
        email: t.String({ format: "email" }),
      }),
    },
    "select",
  ),
} as const;
