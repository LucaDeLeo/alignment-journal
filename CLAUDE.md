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

### Route Layout Pattern
- Route groups: `/editor/`, `/review/`, `/submit/`, `/article/`, `/admin/`
- Each group has `route.tsx` (layout) + `index.tsx` (page) + optional `$param.tsx`
- Layout wraps `<Outlet />` in `<ErrorBoundary>` + `<React.Suspense fallback={<RouteSkeleton />}>`
- Mode-specific styling via `data-mode` attribute on layout wrapper div
- Auth guard: `beforeLoad` checks `context.userId`, layout component checks role via `useBootstrappedUser`
- `/article/` is public (no auth guard); all others require authentication

### Design System Modes
- CSS custom property overrides via `[data-mode]` attribute selectors in `globals.css`
- Modes: `editor` (cool), `reviewer` (neutral), `author` (warm-neutral), `reader` (warm cream), `admin` (cool)
- Mode overrides cascade to all shadcn/ui components via CSS variable inheritance

### Skeleton Loading
- `app/components/ui/skeleton.tsx` - base shimmer primitive (CSS-only, `skeleton-shimmer` class)
- `app/components/route-skeleton.tsx` - route-level skeleton with `default`/`centered`/`sidebar` variants
- Respects `prefers-reduced-motion` (static skeleton when reduced motion preferred)

### Auth Wrappers (Convex RBAC)
- `convex/helpers/auth.ts` - HOF wrappers: `withUser`, `withRole`, `withAuthor`, `withEditor`, `withAdmin`, `withReviewer`, `withActionEditor`
- All Convex mutations/queries use a wrapper except `ensureUser` (bootstraps the user record on first auth, cannot require an existing user)
- `me` query uses the Convex "skip" pattern: gated on `isBootstrapped` state so it does not fire before `ensureUser` completes
- `switchRole` mutation has a server-side guard checking `DEMO_ROLE_SWITCHER` env var -- disabled in production to prevent role self-escalation

### Error Boundaries
- `app/components/error-boundary.tsx` - class-based, wraps each route group's Outlet
- Default fallback with "Try again" button; accepts optional custom fallback prop

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
