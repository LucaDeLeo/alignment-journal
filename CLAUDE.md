# Alignment Journal

## Project Overview
Peer-reviewed journal platform for theoretical AI alignment research.

## Tech Stack
- **Framework:** TanStack Start (RC) with file-based routing
- **Backend:** Convex (reactive database, serverless functions)
- **Auth:** Clerk via `@clerk/tanstack-react-start`
- **Styling:** Tailwind CSS v4 + shadcn/ui (new-york style)
- **Package manager:** Bun exclusively

## Key Patterns

### Directory Structure
- Source code in `app/` (configured via `srcDirectory: 'app'` in vite.config.ts)
- Convex functions in `convex/`
- Path alias: `~/` maps to `app/`

### Config Files
- `vite.config.ts` - Vite + TanStack Start + Tailwind + React Compiler
- `app/start.ts` - Clerk middleware (not app.config.ts)
- `app/router.tsx` - Router + Convex + React Query wiring
- `components.json` - shadcn/ui config

### Convex + Clerk Integration
- `ConvexProvider` wraps at router level (for SSR/query client)
- `ConvexProviderWithClerk` wraps at `__root.tsx` (for authenticated client)
- `fetchClerkAuth` server function in `__root.tsx` handles SSR auth token

### Tailwind v4
- Uses `@import "tailwindcss"` and `@plugin` syntax (not v3 `@tailwind` directives)
- `@theme` block for design tokens in `app/styles/globals.css`
- oklch color values for all design tokens

### Lint Rules (TanStack config)
- Separate `import type` statements (not inline)
- Value imports before type imports
- `Array<T>` syntax (not `T[]`)

### Fonts
- Satoshi (sans): self-hosted woff2 in `public/fonts/satoshi/`
- JetBrains Mono (mono): self-hosted woff2 in `public/fonts/jetbrains-mono/`
- Newsreader (serif): Google Fonts CDN link in `__root.tsx`

## Commands
- `bun dev` - Start dev servers (Vite + Convex)
- `bun run build` - Production build
- `bun run typecheck` - TypeScript check
- `bun run lint` - ESLint
- `bun run test` - Vitest
- `bun run format` - Prettier
