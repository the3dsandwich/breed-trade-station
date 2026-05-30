# Containerization

Status: decided

---

## Decision

**The game client is containerized with Docker and orchestrated locally with Docker Compose.**

`apps/game/Dockerfile` produces a production-ready image. `compose.yaml` at the repo root wires the game client and a Postgres database together for local integration testing and future deployment.

---

## Game Client Image

The game client uses a two-stage Docker build:

| Stage | Base image | Purpose |
|-------|-----------|---------|
| `builder` | `node:22-alpine` | Install dependencies with pnpm and run `vite build` |
| Final | `nginx:alpine` | Serve the compiled static assets on port 80 |

Only the compiled `dist/` output is copied into the final image — no source code, no node_modules, no build tooling. This keeps the production image small.

### Monorepo-aware install

Because `apps/game` depends on `packages/shared`, the Dockerfile copies `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and both packages' `package.json` files before copying source. This allows Docker layer caching to skip `pnpm install` when only source files change.

---

## Docker Compose

`compose.yaml` defines two services:

| Service | Image | Purpose |
|---------|-------|---------|
| `game` | Built from `apps/game/Dockerfile` | Serves the compiled React app via nginx |
| `db` | `postgres:16-alpine` | Postgres database, data persisted in a named volume |

A third `server` service is stubbed out and commented in `compose.yaml`. It will be uncommented once `apps/server` is scaffolded.

Port defaults (overridable via `.env`):

| Variable | Default | Maps to |
|----------|---------|---------|
| `GAME_PORT` | 8080 | nginx inside the `game` container |
| `POSTGRES_PORT` | 5432 | Postgres inside the `db` container |

---

## Environment Variables

`.env.example` documents all required variables. Developers copy it to `.env` and fill in values. `.env` is git-ignored.

Required variables:

| Variable | Purpose |
|----------|---------|
| `POSTGRES_USER` | Postgres superuser name |
| `POSTGRES_PASSWORD` | Postgres superuser password |
| `POSTGRES_DB` | Database name |
| `GAME_PORT` | Host port for the game service (optional, default 8080) |
| `POSTGRES_PORT` | Host port for Postgres (optional, default 5432) |

---

## CI

`.github/workflows/docker-build.yml` builds the game image on every push to `main` and on pull requests. This catches Dockerfile errors and ensures the monorepo install works inside Docker before changes merge.

The workflow does not push to a registry — image publishing is deferred.

---

## Deferred

- Server Dockerfile (`apps/server/Dockerfile`)
- Container registry and image publishing
- Production deployment (hosting provider, orchestration)
- Health checks and restart policies for production compose
- Multi-environment compose overrides (`compose.override.yaml`, `compose.prod.yaml`)
