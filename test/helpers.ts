import { app } from "../src/app";

/** Fire a request at the app in-process (no network) and get the Response. */
export const api = (path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init));

/** Convenience for JSON requests, optionally authenticated with a bearer token. */
export const json = (
  path: string,
  method: string,
  body: unknown,
  token?: string,
) =>
  api(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

/** Read a Response body as JSON, typed loosely for assertions. */
// biome-ignore lint/suspicious/noExplicitAny: test assertions read arbitrary JSON
export const body = (res: Response): Promise<any> => res.json();

export const uniqueEmail = () => `user_${crypto.randomUUID()}@example.com`;
