import { createInsertSchema, createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";
import { users } from "../schema/users";
import { spread } from "../utils";

/**
 * TypeBox column schemas for the `users` table (the validation-layer mirror of
 * the Drizzle table). The `email` refinement lives here so it's shared by every
 * model composed from these columns.
 */
export const userColumns = {
  insert: spread(
    createInsertSchema(users, { email: t.String({ format: "email" }) }),
    "insert",
  ),
  select: spread(
    createSelectSchema(users, { email: t.String({ format: "email" }) }),
    "select",
  ),
};
