import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";

/**
 * OpenAPI docs. Served at /openapi (UI) and /openapi/json (spec).
 * The `bearerAuth` security scheme is referenced by protected routes via
 * `detail.security`.
 */
export const openapiPlugin = new Elysia({ name: "openapi" }).use(
  openapi({
    documentation: {
      info: {
        title: "API",
        version: "1.0.0",
        description: "Production-ready ElysiaJS API boilerplate.",
      },
      tags: [
        { name: "App", description: "Health and meta endpoints" },
        { name: "Auth", description: "Authentication and tokens" },
        { name: "Users", description: "User management" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  }),
);
