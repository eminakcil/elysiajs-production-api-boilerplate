import { createInsertSchema, createSelectSchema } from "drizzle-typebox";
import { refreshTokens } from "@/db/schema/refresh-tokens";
import { spread } from "@/db/utils";

/** TypeBox column schemas for the `refresh_tokens` table. */
export const refreshTokenColumns = {
  insert: spread(createInsertSchema(refreshTokens), "insert"),
  select: spread(createSelectSchema(refreshTokens), "select"),
};
