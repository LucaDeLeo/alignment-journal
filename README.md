# Alignment Journal

A peer-reviewed journal platform for theoretical AI alignment research. Working prototype at [alignment-journal.vercel.app](https://alignment-journal.vercel.app/).

## What it does

End-to-end editorial pipeline: authors submit PDFs, Claude Haiku runs four-dimension automated triage (scope, formatting, citations, claims), editors manage submissions through an 11-status state machine, reviewers are matched via LLM-generated rationale, reviews use structured forms with auto-save and optimistic concurrency, threaded discussion enforces semi-confidential identity gating server-side, and accepted papers publish as web articles with dual abstracts (author + reviewer).

The platform ships with seed data (run `npx convex run seed:seedData`) that populates realistic submissions, reviewer profiles, reviews, and discussions so you can explore the full workflow immediately.

## Tech stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React, SSR, file-based routing)
- **Backend:** [Convex](https://convex.dev) (reactive database, serverless functions, real-time subscriptions)
- **Auth:** [Clerk](https://clerk.com) via `@clerk/tanstack-react-start`
- **AI:** [Vercel AI SDK](https://sdk.vercel.ai) with Claude Haiku (triage, reviewer matching)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Testing:** Vitest (dual projects: Node for backend, happy-dom for components)

## Architecture highlights

- **Reactive by default** -- Convex makes every query a live subscription. Editor dashboards, triage progress, and discussion threads update in real-time with zero WebSocket plumbing.
- **RBAC at the data layer** -- Every mutation goes through auth wrappers (`withUser`, `withEditor`, `withReviewer`). Author-facing queries physically cannot return reviewer names until the paper is accepted.
- **State machine** -- 11 submission statuses with validated transitions and an append-only audit trail.
- **Feature folders** -- 7 domain modules (`auth`, `submissions`, `editor`, `review`, `article`, `admin`, `notifications`) with barrel exports.
- **Pure function testing** -- Business logic (payment calculations, seed data builders) extracted as pure functions and tested without mocking the database.

## Project structure

```
app/
  routes/          # File-based routing (submit/, editor/, review/, article/, admin/)
  features/        # Domain modules with co-located components
  components/ui/   # shadcn/ui primitives
  lib/             # Shared utilities
  styles/          # Tailwind v4 globals with role-based design tokens
convex/
  schema.ts        # Database schema (14 tables)
  helpers/         # Auth wrappers, state machine, error helpers
  *.ts             # Domain functions (queries, mutations)
  *Actions.ts      # Node.js runtime actions (AI calls, PDF processing)
  seed.ts          # Seed data generation (2,100+ lines)
```

## Running locally

```bash
bun install
# Set up .env.local with Clerk and Convex keys
bun dev              # Starts Vite + Convex dev servers
npx convex run seed:seedData  # Populate with sample data
```

## Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev servers (Vite + Convex) |
| `bun run build` | Production build |
| `bun run typecheck` | TypeScript check |
| `bun run lint` | ESLint |
| `bun run test` | Vitest |
| `bun run format` | Prettier |
