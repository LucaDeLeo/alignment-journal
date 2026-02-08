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
- Feature modules in `app/features/{domain}/` with barrel exports (`index.ts`)

### Feature Folder Pattern
<!-- Updated from Epic 3 retrospective -->
- Co-locate related components, utilities, and constants in `app/features/{domain}/`
- Each feature folder has an `index.ts` barrel export for clean imports from route files
- Naming: `feature-verb.tsx` (e.g., `submission-form.tsx`, `triage-report-card.tsx`)
- Shared utilities within a feature: `{domain}-constants.ts`, `status-utils.ts`
<!-- Updated from Epic 6 retrospective -->
- Established folders: `app/features/submissions/` (12 files), `app/features/auth/`, `app/features/editor/` (15 files), `app/features/review/` (15 files), `app/features/admin/` (3 files), `app/features/article/` (3 files), `app/features/notifications/` (3 files)
- Future epics should follow this pattern for new domains
- Cross-feature reuse: import from sibling feature barrel exports (e.g., `~/features/submissions` in editor components)

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
- Route layout bypass: `/review/accept/$token` bypasses the review layout's auth/role guard via `pathname.startsWith('/review/accept/')` check in both `beforeLoad` and the layout component. The accept page handles its own auth flow with inline Clerk `<SignIn>`.

### Design System Modes
- CSS custom property overrides via `[data-mode]` attribute selectors in `globals.css`
- Modes: `editor` (cool), `reviewer` (neutral), `author` (warm-neutral), `reader` (warm cream), `admin` (cool)
- Mode overrides cascade to all shadcn/ui components via CSS variable inheritance

### Skeleton Loading
- `app/components/ui/skeleton.tsx` - base shimmer primitive (CSS-only, `skeleton-shimmer` class)
- `app/components/route-skeleton.tsx` - route-level skeleton with `default`/`centered`/`sidebar` variants
- Respects `prefers-reduced-motion` (static skeleton when reduced motion preferred)

### Convex Shared Helpers
<!-- Updated from Epic 3 retrospective -->
- `convex/helpers/auth.ts` - HOF wrappers for RBAC (see Auth Wrappers below)
- `convex/helpers/transitions.ts` - Editorial state machine (`VALID_TRANSITIONS`, `assertTransition`)
- `convex/helpers/errors.ts` - Structured `ConvexError` helpers (10 error types)
<!-- Updated from Epic 6 retrospective -->
- `convex/helpers/roles.ts` - Shared role constants (`EDITOR_ROLES`, `WRITE_ROLES`) and `hasEditorRole()` type-safe helper, used by 7+ Convex files
- Frontend re-exports shared Convex constants via feature barrel files (e.g., `app/features/editor/editor-constants.ts`)

### Auth Wrappers (Convex RBAC)
- `convex/helpers/auth.ts` - HOF wrappers: `withUser`, `withRole`, `withAuthor`, `withEditor`, `withAdmin`, `withReviewer`, `withActionEditor`
<!-- Updated from Epic 5 retrospective -->
- All Convex mutations/queries use a wrapper except `ensureUser` (bootstraps the user record on first auth, cannot require an existing user), `getInviteStatus` (public query, no auth — allows checking invite status before sign-in), and `articles.getPublishedArticle` / `articles.listPublished` (Diamond Open Access public queries — status filter enforces security boundary)
- `me` query uses the Convex "skip" pattern: gated on `isBootstrapped` state so it does not fire before `ensureUser` completes
- `switchRole` mutation has a server-side guard checking `DEMO_ROLE_SWITCHER` env var -- disabled in production to prevent role self-escalation
<!-- Updated from Epic 6 retrospective -->
- Editor role gating: most editor functions use `withUser` + `hasEditorRole(ctx.user.role)` check (from `convex/helpers/roles.ts`) because the `withEditor` wrapper is too restrictive (only allows `editor_in_chief`). New functions should prefer `hasEditorRole()` over the raw `EDITOR_ROLES.includes(... as ...)` pattern

### Audit Trail Pattern
<!-- Added from Epic 3 retrospective -->
- `convex/audit.ts` - `logAction` internalMutation (append-only, only write path to `auditLogs` table)
- Deferred write pattern: `ctx.scheduler.runAfter(0, internal.audit.logAction, { submissionId, actorId, actorRole, action, details })`
- Used by: `transitionStatus`, `assignActionEditor`, `sendInvitations`, `revokeInvitation`, `acceptInvitation`, `makeDecision`, `undoDecision`, `createDraft`, `submitAbstract`, `approveAbstract`, `authorAcceptAbstract`
- `AuditTimeline` component in `app/features/editor/audit-timeline.tsx` subscribes reactively via `usePaginatedQuery`
- Action labels mapped in `audit-timeline.tsx` -- when adding new action types, update the `ACTION_LABELS` mapping in the same story

### Auto-Save with Optimistic Concurrency
- Server: `expectedRevision` arg, compare against `review.revision`, throw `versionConflictError()`, increment on success
- Client: `localRevisionRef` + `saveMutexRef` for serialized saves + `withOptimisticUpdate` for instant cache
- Conflict UI: preserve local draft, show "Reload server version" / "Keep my version" buttons
<!-- Updated from Epic 5 retrospective -->
- Used by: `convex/reviews.ts` `updateSection` + `app/features/review/review-form.tsx`, `convex/reviewerAbstracts.ts` `updateContent` + `app/features/review/abstract-draft-form.tsx`

### Semi-Confidential Identity Gating
- Server-side only: `convex/discussions.ts` `listBySubmission` computes display names based on viewer role + submission status
- Authors see pseudonyms ("Reviewer 1") unless submission is ACCEPTED; reviewers/editors always see real names
- Client never receives real reviewer names when anonymization applies

### Scheduled State Transitions
- Review auto-lock: `ctx.scheduler.runAfter(15 * 60 * 1000, internal.reviews.lockReview, ...)` -- idempotent, only from `submitted`
- Edit windows (discussion): server-side `editableUntil` check, no scheduler needed

### Error Boundaries
- `app/components/error-boundary.tsx` - class-based, wraps each route group's Outlet
- Default fallback with "Try again" button; accepts optional custom fallback prop

### Vitest Projects Config
<!-- Updated from Epic 2 retrospective -->
- Two test projects defined in `vitest.config.ts`:
  - `unit`: runs `app/**/*.test.ts` and `convex/__tests__/**/*.test.ts` under Node environment
  - `component`: runs `app/**/*.test.tsx` under happy-dom environment
- Coverage: `@vitest/coverage-v8` configured with v8 provider
  - Includes: `app/**/*.{ts,tsx}`, `convex/**/*.ts`
  - Excludes: `app/routeTree.gen.ts`, `convex/_generated/**`, test files, type declarations

### Pure Function Testing Pattern
<!-- Added from Epic 6 retrospective -->
- For Convex functions with complex business logic (calculations, validation rules, state checks), extract the logic into a pure function that takes a plain TypeScript interface as input
- Test the pure function directly without mocking Convex database context
- The Convex handler becomes a thin adapter: collect input from database, call pure function, return result
- Example: `computePaymentBreakdown` in `convex/payments.ts` -- single source of truth for both reviewer-facing and editor-facing payment calculations, tested by 23 unit tests in `convex/__tests__/payments.test.ts`

### Shared Utilities (`app/lib/`)
<!-- Added from Epic 6 retrospective -->
- `app/lib/utils.ts` - `cn()` classname merger (shadcn/ui standard)
- `app/lib/format-utils.ts` - `formatCurrency()` shared formatting utility
- Utilities used across multiple feature folders belong in `app/lib/`; feature-specific utilities stay in their feature folder

### Fonts
- Satoshi (sans): self-hosted woff2 in `public/fonts/satoshi/`
- JetBrains Mono (mono): self-hosted woff2 in `public/fonts/jetbrains-mono/`
- Newsreader (serif): Google Fonts CDN link in `__root.tsx`

## Convex Reference Docs
Before writing or modifying Convex code, read the relevant skill files for up-to-date patterns:
- `.claude/skills/convex-functions/SKILL.md` - Queries, mutations, actions, argument validation, internal functions
- `.claude/skills/convex-best-practices/SKILL.md` - Production patterns, error handling, Zen of Convex
- `.claude/skills/convex-schema-validator/SKILL.md` - Schema definition, validators, indexes, migrations
- `.claude/skills/convex-realtime/SKILL.md` - Subscriptions, optimistic updates, paginated queries
- `.claude/skills/convex-file-storage/SKILL.md` - Upload flows, serving files, storage IDs
- `.claude/skills/convex-security-check/SKILL.md` - Auth, access control, argument validation
- `.claude/skills/convex-http-actions/SKILL.md` - HTTP endpoints, webhooks, CORS

Read the index at `.claude/skills/convex/SKILL.md` to find the right skill for your task.

## Commands
- `bun dev` - Start dev servers (Vite + Convex)
- `bun run build` - Production build
- `bun run typecheck` - TypeScript check
- `bun run lint` - ESLint
- `bun run test` - Vitest
- `bun run test -- --coverage` - Vitest with v8 coverage report
- `bun run format` - Prettier

## Dev Environment
The project is fully set up with Convex deployment and Clerk auth (keys in `.env.local`). After any implementation work (story, feature, bug fix), always verify by running:

1. **Convex push** — `bunx convex dev --once` to ensure all Convex functions typecheck and deploy successfully
2. **Vite build** — `bun run build` to catch any frontend TypeScript or import errors
3. **Tests** — `bun run test` to ensure no regressions

If working in a long session, run `bunx convex dev` and `bun dev` in tmux sessions to get continuous feedback via HMR and auto-push. Fix any errors before committing.
