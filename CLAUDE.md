# Breed Trade Station

A creature breeding and trading game. Core mechanics: genetics-based breeding, trait inheritance, and a player-driven market. The creatures are called **Puffs**. Theme TBD.

## Folder Structure

| Folder | Purpose |
|--------|---------|
| `.claude/` | Claude Code config: settings, hooks, permissions. Do not put project content here. |
| `.github/` | CI/CD workflows and GitHub configuration. |
| `ai/` | Prompts, agent definitions, and content-generation scripts used as part of the product or dev workflow. |
| `apps/game/` | React 18 + PixiJS v7 + Redux Toolkit client. Bundled with Vite. |
| `apps/server/` | Fastify + Socket.IO + TypeScript server. |
| `packages/shared/` | Shared TypeScript types, genetics logic, and constants. No framework dependencies. Used by both `apps/game` and `apps/server`. |
| `docs/design/` | Game design decisions: mechanics, systems, economy, creature design. If you are deciding something, it goes here. |
| `docs/architecture/` | Technical decisions: stack choices, ADRs, infra diagrams, API contracts. |
| `docs/research/` | Source material and reference analysis. Describes things that already exist. Treated as immutable reference — do not update research docs to reflect new decisions, write a design doc instead. |

## Monorepo Tooling

- **pnpm** — package manager. All installs go through pnpm. Do not use npm or yarn.
- **Turborepo** — build orchestration. Run tasks from the root with `turbo run <task>`. `packages/shared` builds before `apps/game` or `apps/server`.
- Root `package.json` contains dev tooling only. App and package dependencies live in their own `package.json` files.

## MECE Rule for Docs

Every document belongs in exactly one folder. The deciding question:

- Am I **deciding** something? → `docs/design/` or `docs/architecture/`
- Am I **describing something that already existed**? → `docs/research/`
- Is this **AI tooling** (prompts, agents, scripts)? → `ai/`
- Is this **Claude Code config**? → `.claude/`

`docs/research/` is read-only reference. Decisions that emerge from research go into a new file in `docs/design/` or `docs/architecture/`.

## Commit Style

Conventional commits with PR number suffix: `type(scope): description (#N)`

Types seen in history: `docs`, `feat`, `fix`. Examples:
```
docs(architecture): database, monorepo structure, and tooling (#8)
feat(shared): add meiosis genetics function (#12)
```

## PR Convention

Any PR that modifies `apps/` or `packages/` or `ai/` must also modify at least one file in `docs/design/` or `docs/architecture/`. This is enforced by the `docs-ratchet` CI check. If your change is too small to warrant a doc update, it likely belongs in an existing doc rather than a new one.

## Directory Conventions

- `~/repos/` — all code projects and git repositories
- `~/claude/` — personal notes and life stuff
