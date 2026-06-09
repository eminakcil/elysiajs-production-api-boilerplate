/**
 * Drizzle ↔ TypeBox bridge helpers.
 * Copied from the official Elysia recipe — converts a Drizzle table into plain
 * objects of TypeBox column schemas so they can be composed into Elysia models.
 *
 * @see https://elysiajs.com/recipe/drizzle.html#utility
 */

import { Kind, type TObject } from "@sinclair/typebox";
import type { Table } from "drizzle-orm";
import {
  type BuildSchema,
  createInsertSchema,
  createSelectSchema,
} from "drizzle-typebox";

type Spread<
  T extends TObject | Table,
  Mode extends "select" | "insert" | undefined,
> =
  T extends TObject<infer Fields>
    ? { [K in keyof Fields]: Fields[K] }
    : T extends Table
      ? Mode extends "select"
        ? BuildSchema<"select", T["_"]["columns"], undefined>["properties"]
        : Mode extends "insert"
          ? BuildSchema<"insert", T["_"]["columns"], undefined>["properties"]
          : Record<string, never>
      : Record<string, never>;

/** Spread a Drizzle table (or TypeBox object) into a plain object of column schemas. */
export const spread = <
  T extends TObject | Table,
  Mode extends "select" | "insert" | undefined,
>(
  schema: T,
  mode?: Mode,
): Spread<T, Mode> => {
  const newSchema: Record<string, unknown> = {};
  let table: TObject;

  switch (mode) {
    case "insert":
    case "select":
      if (Kind in schema) {
        table = schema as TObject;
        break;
      }

      table =
        mode === "insert"
          ? createInsertSchema(schema as Table)
          : createSelectSchema(schema as Table);
      break;

    default:
      if (!(Kind in schema)) throw new Error("Expect a schema");
      table = schema as TObject;
  }

  for (const key of Object.keys(table.properties))
    newSchema[key] = table.properties[key];

  return newSchema as Spread<T, Mode>;
};

/** Spread a record of Drizzle tables into a record of column-schema objects. */
export const spreads = <
  T extends Record<string, TObject | Table>,
  Mode extends "select" | "insert" | undefined,
>(
  models: T,
  mode?: Mode,
): { [K in keyof T]: Spread<T[K], Mode> } => {
  const newSchema: Record<string, unknown> = {};
  for (const key of Object.keys(models))
    newSchema[key] = spread(models[key], mode);
  return newSchema as { [K in keyof T]: Spread<T[K], Mode> };
};
