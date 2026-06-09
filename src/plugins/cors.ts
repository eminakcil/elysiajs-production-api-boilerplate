import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { env } from "@/config/env";

/**
 * CORS configuration. Named so it's only applied once across the app.
 * Set CORS_ORIGIN to "*" (default) for any origin, or a comma-separated list.
 */
export const corsPlugin = new Elysia({ name: "cors" }).use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 3600,
  }),
);
