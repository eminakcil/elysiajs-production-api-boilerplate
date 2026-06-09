import { bearer } from "@elysiajs/bearer";
import { jwt } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { env } from "../config/env";

/** Claims carried by an access token. */
export interface AccessPayload {
  sub: string;
  email: string;
  role: "user" | "admin";
}

/**
 * Auth plugin: registers two JWT signers (access + refresh), the bearer
 * extractor, and reusable guard macros.
 *
 * Usage on a route:
 *   .get('/me', handler, { isAuthed: true })       // any authenticated user
 *   .delete('/:id', handler, { hasRole: 'admin' }) // admins only
 *
 * On success the macro adds a typed `user: AccessPayload` to the context.
 */
export const authPlugin = new Elysia({ name: "auth" })
  .use(
    jwt({
      name: "jwt",
      secret: env.JWT_SECRET,
      exp: env.JWT_ACCESS_EXP,
    }),
  )
  .use(
    jwt({
      name: "refreshJwt",
      secret: env.JWT_REFRESH_SECRET,
      exp: env.JWT_REFRESH_EXP,
    }),
  )
  .use(bearer())
  .macro({
    isAuthed: {
      async resolve({ bearer, jwt, status }) {
        if (!bearer)
          return status(401, {
            error: "UNAUTHORIZED",
            message: "Missing bearer token",
          });

        const payload = await jwt.verify(bearer);
        if (!payload)
          return status(401, {
            error: "UNAUTHORIZED",
            message: "Invalid or expired token",
          });

        return { user: payload as unknown as AccessPayload };
      },
    },
    hasRole(role: "user" | "admin") {
      return {
        async resolve({ bearer, jwt, status }) {
          if (!bearer)
            return status(401, {
              error: "UNAUTHORIZED",
              message: "Missing bearer token",
            });

          const payload = await jwt.verify(bearer);
          if (!payload)
            return status(401, {
              error: "UNAUTHORIZED",
              message: "Invalid or expired token",
            });

          const user = payload as unknown as AccessPayload;
          if (role === "admin" && user.role !== "admin")
            return status(403, {
              error: "FORBIDDEN",
              message: "Insufficient permissions",
            });

          return { user };
        },
      };
    },
  });
