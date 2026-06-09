import { createInsertSchema, createSelectSchema } from "drizzle-typebox";
import { refreshTokens } from "../schema/refresh-tokens";
import { spread } from "../utils";

/** TypeBox column schemas for the `refresh_tokens` table. */
export const refreshTokenColumns = {
  insert: spread(createInsertSchema(refreshTokens), "insert"),
  select: spread(createSelectSchema(refreshTokens), "select"),
};
