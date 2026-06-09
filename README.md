# ElysiaJS Production API Boilerplate

A reusable, production-ready API starter built on **ElysiaJS + Bun**, with
Drizzle ORM (PostgreSQL), JWT auth, centralized error handling, OpenAPI docs,
tests, Docker and CI.

## Stack

- **Runtime:** Bun
- **Framework:** ElysiaJS
- **Database:** PostgreSQL via Drizzle ORM (`drizzle-typebox` bridges schemas → validation)
- **Auth:** Custom JWT (access + rotating refresh) + Bearer, `Bun.password` (argon2id) hashing
- **Docs:** OpenAPI at `/openapi`
- **Quality:** Biome (lint + format), `bun test`

## Quick start

```bash
# 1. Install deps
bun install

# 2. Configure environment
cp .env.example .env        # then edit secrets

# 3. Start local infra (Postgres) — API runs on the host
docker compose up -d

# 4. Create tables
bun run db:generate          # generate migration from schema (commit the output)
bun run db:migrate           # apply migrations

# 5. Run the API
bun run dev                  # http://localhost:3000  ·  docs at /openapi
```

## Project structure

```
src/
├── index.ts          # entry point: listen + graceful shutdown
├── app.ts            # composed app (no listen) — imported by tests
├── config/env.ts     # TypeBox-validated environment (fails fast at boot)
├── db/               # Drizzle: schema, client, drizzle-typebox models, utils
├── plugins/          # cors, openapi, error, logger, auth (each named for dedupe)
├── modules/          # feature modules (auth, user) — each = controller/service/model
└── lib/              # shared helpers (errors, time)
test/                 # bun:test integration tests via app.handle()
```

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Dev server with hot reload |
| `bun run start` | Run without watch |
| `bun test` | Run tests (needs a running database) |
| `bun run build` | Compile to a standalone `./server` binary |
| `bun run db:generate` | Generate a migration from the schema |
| `bun run db:migrate` | Apply migrations |
| `bun run db:push` | Push schema directly (dev convenience) |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run lint` / `lint:fix` | Lint with Biome |
| `bun run format` | Format with Biome |

## API overview

- `GET /health` — liveness check
- `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` — public
- `GET /auth/me` · `POST /auth/logout` — authenticated
- `GET /users` · `GET /users/:id` — authenticated; `PATCH`/`DELETE /users/:id` — admin only

Authenticate by sending `Authorization: Bearer <accessToken>`.

## Docker

```bash
# Dev: infra only (Postgres). API runs on host via `bun run dev`.
docker compose up -d

# Full stack (API + Postgres), e.g. for staging:
JWT_SECRET=... JWT_REFRESH_SECRET=... docker compose -f docker-compose.prod.yml up --build
```

The production image is a distroless container running a compiled binary.
Run migrations against the database separately (see `docker-compose.prod.yml`).

## Adding a new module

See [AGENTS.md](AGENTS.md) for the module recipe and the ElysiaJS conventions
this project follows.
