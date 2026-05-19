# Database and Monorepo

Status: decided

---

## Database

### Decision: PostgreSQL (production) + SQLite (local development), via Prisma ORM

**PostgreSQL** is the production database. It handles the relational structure of the server's data (players, market listings, transactions, rentals) cleanly, and its `jsonb` column type stores Puff gene arrays and lineage trees as structured JSON without fighting the schema.

**SQLite** is used locally during development. Prisma supports both with a one-line config change — the schema and query code are identical. Zero local setup: the database is a single file, no separate server process needed.

**Prisma ORM** provides type-safe database queries generated from the schema. The Puff type defined in `packages/shared` maps directly to the Prisma schema, keeping data shapes consistent across client, server, and database.

### What the server stores

| Data | Shape | Notes |
|------|-------|-------|
| Player accounts | Relational | Identity, auth tokens, registration timestamp |
| Market listings | Relational + jsonb | Listing metadata relational, Puff data as jsonb |
| Puff lineage | jsonb | Variable-depth tree, stored as structured JSON |
| Transactions | Relational | Buyer, seller, listing, price, timestamp |
| Rental periods | Relational | Start, end, owner, renter, Puff reference |
| Server tick state | Relational | Listing expiry timestamps, bot purchase queue |

### Local vs production config

Prisma's `datasource` block switches between providers:

```
Local:      provider = "sqlite"
Production: provider = "postgresql"
```

Schema and all query code unchanged between environments.

### Hosting (deferred)

Specific hosting provider (Supabase, Neon, Railway, self-hosted) is deferred. Any Postgres-compatible host works without code changes.

---

## Monorepo

### Decision: pnpm workspaces + Turborepo

**pnpm** replaces npm as the package manager. Faster installs, better disk efficiency, and first-class workspace support. All packages share a single lockfile at the root.

**Turborepo** adds build orchestration on top of pnpm workspaces. It:
- Caches build outputs — only rebuilds what changed
- Runs tasks in parallel where possible
- Enforces build order — `shared` must build before `game` or `server`
- Provides a single `turbo run build` / `turbo run dev` command at the root

### Repository structure

```
breed-trade-station/
├── apps/
│   ├── game/              ← React 18 + PixiJS v7 + Redux Toolkit client
│   └── server/            ← Fastify + Socket.IO + TypeScript server
├── packages/
│   └── shared/            ← Shared TypeScript types, genetics logic, constants
├── docs/
│   ├── design/
│   ├── architecture/
│   └── research/
├── ai/
├── .claude/
├── .github/
├── turbo.json             ← Turborepo task pipeline config
├── pnpm-workspace.yaml    ← Workspace package declarations
├── package.json           ← Root package.json (dev tooling only)
└── CLAUDE.md
```

### Package responsibilities

**`apps/game`**
The React client. Depends on `packages/shared` for Puff types and genetics logic. Bundled with Vite. Wrapped by Tauri for desktop, Capacitor for Android.

**`apps/server`**
The Fastify + Socket.IO server. Depends on `packages/shared` for the same types. Compiled with `tsc` or `tsx` for development.

**`packages/shared`**
No framework dependencies. Pure TypeScript. Contains:
- Puff data types (gene array, trait definitions, lineage)
- Market listing and transaction types
- Socket.IO event payload types
- Genetics calculation functions (meiosis, phenotype derivation)
- Constants (trait ranges, affinity labels)

Genetics logic lives here because both the client (rendering, UI) and server (validation) need it. Single implementation, no drift.

### Turborepo task pipeline

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

`^build` means "build my dependencies first." Running `turbo run dev` at the root starts all apps in development mode after building shared packages.

---

## Deferred

- Postgres hosting provider
- Authentication strategy (sessions, JWTs, OAuth)
- Database migration strategy (Prisma Migrate vs manual)
- Deployment pipeline for server and client builds
