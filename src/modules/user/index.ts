import { Elysia, t } from "elysia";
import { authPlugin } from "../../plugins/auth";
import { userModel } from "./model";
import { UserService } from "./service";

/**
 * Example CRUD controller. List/read require authentication; mutate operations
 * require the `admin` role (via the hasRole macro).
 */
export const userModule = new Elysia({ prefix: "/users", tags: ["Users"] })
  .use(authPlugin)
  .model(userModel)
  .get("/", ({ query }) => UserService.list(query.limit, query.offset), {
    isAuthed: true,
    query: "listQuery",
    response: t.Array(userModel.publicUser),
    detail: {
      summary: "List users",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
    },
  })
  .get("/:id", ({ params }) => UserService.getById(params.id), {
    isAuthed: true,
    params: "idParam",
    response: "publicUser",
    detail: {
      summary: "Get a user by id",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
    },
  })
  .patch("/:id", ({ params, body }) => UserService.update(params.id, body), {
    hasRole: "admin",
    params: "idParam",
    body: "updateUserBody",
    response: "publicUser",
    detail: {
      summary: "Update a user (admin only)",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
    },
  })
  .delete("/:id", ({ params }) => UserService.remove(params.id), {
    hasRole: "admin",
    params: "idParam",
    detail: {
      summary: "Delete a user (admin only)",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
    },
  });
