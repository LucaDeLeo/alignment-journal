# Story 1.3: User Registration, Login, and Role Management

## Story

**As a** user,
**I want** to create an account with email, name, and affiliation, log in, and be assigned a role,
**So that** I can access the platform with the appropriate permissions.

## Status

**Epic:** 1 - Project Foundation & Authentication
**Status:** ready
**Priority:** Highest (blocks all role-gated features)
**Depends on:** Story 1.2 (schema, auth wrappers, error helpers)

## Context

This story wires up the Clerk ↔ Convex user synchronization flow and builds the Convex functions for user management and role assignment. Story 1.2 defined the `users` table schema, the RBAC auth wrappers (`withUser`, `withRole`, `withAuthor`, `withEditor`, `withAdmin`, `withReviewer`, `withActionEditor`), and the error helpers. This story makes those wrappers functional by ensuring users exist in Convex when they authenticate via Clerk, and that role assignment is available.

The key architectural decisions:
- **User creation:** When a user first authenticates via Clerk, a webhook or first-access pattern creates a corresponding `users` record in Convex with their Clerk ID, email, name, and affiliation.
- **Role storage:** Roles are stored in the Convex `users` table (not in Clerk metadata). The `role` field is the single source of truth for RBAC checks.
- **Default role:** New users default to `author` role. Role changes are performed by admins or via the demo role switcher (which updates the Convex user record).
- **Demo role switcher:** A development/preview-only UI component in the header that allows switching between roles for evaluator exploration. The UI is hidden unless `import.meta.env.DEV` or `VITE_SHOW_ROLE_SWITCHER` is set; the server-side `switchRole` mutation requires the `DEMO_ROLE_SWITCHER` Convex environment variable. This switches the actual Convex `role` field — the auth wrappers enforce the role stored in Convex.
- **Clerk webhook vs first-access:** Since this is a prototype, we use a first-access pattern — when a Clerk-authenticated user first hits the app and no Convex `users` record exists for their `clerkId`, one is created automatically via a mutation. This avoids webhook infrastructure complexity for the prototype while still ensuring every authenticated user has a Convex record.

**Key architectural references:**
- Users table: `convex/schema.ts` — `users` table with `clerkId`, `email`, `name`, `affiliation`, `role`, `createdAt`
- Auth wrappers: `convex/helpers/auth.ts` — `withUser` resolves Clerk identity → Convex user
- Role switcher policy: architecture.md — demo-only, hidden in production, never bypasses server-side RBAC
- Clerk integration: `app/routes/__root.tsx` — `ClerkProvider` + `ConvexProviderWithClerk` already wired
- Clerk middleware: `app/start.ts` — `clerkMiddleware()` configured
- Route structure: architecture.md — role-based route groups at `/editor/`, `/review/`, `/submit/`, `/article/`, `/admin/`

## Acceptance Criteria

### AC1: User record creation on first authentication
**Given** a new user who has authenticated via Clerk
**When** they access the application for the first time
**Then:**
- A `convex/users.ts` mutation `ensureUser` is called that:
  - Extracts the Clerk user identity via `ctx.auth.getUserIdentity()`
  - Checks if a `users` record exists with matching `clerkId` (via `by_clerkId` index)
  - If no record exists, creates one with `clerkId`, `email` (from `identity.email`), `name` (from `identity.name` or `identity.email`), `affiliation` (empty string default), and `role` set to `"author"`, `createdAt` set to `Date.now()`
  - If a record already exists, returns the existing user (idempotent)
- The mutation defines both `args` (empty object `{}`) and `returns` validators
- The mutation does NOT use auth wrappers (it must work for brand-new users who have no Convex record yet)
- The frontend calls `ensureUser` after Clerk authentication succeeds (in `__root.tsx` or a layout component), before any auth-wrapped queries fire

### AC1b: Login and session establishment (FR2)
**Given** a returning user who already has a Convex `users` record
**When** they sign in via Clerk
**Then:**
- The Clerk `<SignedIn>` boundary renders authenticated content only after the Clerk session is established
- The `ensureUser` mutation fires (idempotently returns the existing record)
- After `ensureUser` resolves, the `me` query returns the user's profile and role
- The user sees their role badge and can navigate to role-appropriate routes
- **Testable outcome:** After Clerk sign-in completes and `ensureUser` resolves, `api.users.me` returns a non-null user document within a single Convex reactive cycle (no intermediate error state is exposed to the user)

### AC2: User profile query
**Given** an authenticated user with a Convex record
**When** they query their profile
**Then:**
- A `convex/users.ts` query `me` returns the current user's full document (`_id`, `_creationTime`, `clerkId`, `email`, `name`, `affiliation`, `role`, `createdAt`)
- The query uses `withUser` wrapper for authentication
- The query defines both `args` and `returns` validators
- Returns `null`-safe handling — the `withUser` wrapper throws `UNAUTHORIZED` if no user found

### AC3: Role update mutation
**Given** an authenticated user
**When** an admin or the demo role switcher changes a user's role
**Then:**
- A `convex/users.ts` mutation `updateRole` accepts `userId` (Id<"users">) and `role` (the role union validator) as args
- For production use: the mutation uses `withAdmin` wrapper (only admins can change roles)
- A second mutation `switchRole` for the demo role switcher: accepts only `role` as arg, uses `withUser` wrapper, and updates the calling user's own role. This is the mutation the role switcher UI calls. **The mutation itself must check for a `DEMO_ROLE_SWITCHER` Convex environment variable (set via the Convex dashboard) and throw `ENVIRONMENT_MISCONFIGURED` (via `environmentMisconfiguredError('Role switching is disabled in production')`) if the variable is not set.** Note: Convex functions cannot read `NODE_ENV` or Vite env vars — they can only read environment variables configured in the Convex dashboard. This server-side guard prevents role self-escalation even if the UI is accidentally exposed or the mutation is invoked directly.
- Both mutations define `args` and `returns` validators
- Note: Role changes via `updateRole` do NOT create audit log entries because the `auditLogs` table requires a `submissionId` field (audit logs are submission-scoped per FR25). Administrative role changes are tracked implicitly through the `users` table state.

### AC4: Current user display in header
**Given** an authenticated user
**When** they view any page
**Then:**
- The header (in `__root.tsx`) displays the Clerk `UserButton` for signed-in users (already implemented)
- Additionally, a `RoleBadge` component is shown next to the user button displaying the user's current Convex role (e.g., "Author", "Editor-in-Chief")
- The role badge updates reactively when the role changes (via Convex reactive query)

### AC5: Demo-only role switcher
**Given** the application running in development or preview mode
**When** the user interacts with the role switcher
**Then:**
- A `RoleSwitcher` component renders in the header between the role badge and the user button
- It displays the current role and a dropdown/select to switch between all 5 roles: Author, Reviewer, Action Editor, Editor-in-Chief, Admin
- Selecting a role calls the `switchRole` mutation, which updates the user's role in Convex
- The component is only rendered when `import.meta.env.DEV` is true OR when `import.meta.env.VITE_SHOW_ROLE_SWITCHER` is set (for preview deployments)
- The component is NEVER rendered when `import.meta.env.PROD` is true and `VITE_SHOW_ROLE_SWITCHER` is not set
- **Defense in depth:** Even if the UI component is rendered, the `switchRole` mutation enforces a server-side guard (see AC3) that rejects calls when the `DEMO_ROLE_SWITCHER` Convex environment variable is not set
- **Preview deployment contract:** For preview environments where role switching should work end-to-end, operators must set BOTH: (1) `VITE_SHOW_ROLE_SWITCHER=1` in the hosting/Vite environment (so the UI renders), AND (2) `DEMO_ROLE_SWITCHER=1` in the Convex dashboard (so the server-side mutation allows the call). Omitting either flag disables role switching at that layer.
- The role switcher UI uses shadcn/ui `Select` component with role labels formatted as display names (e.g., "Editor-in-Chief" not "editor_in_chief")

### AC6: Role-based access enforcement verification
**Given** the auth wrappers from Story 1.2
**When** tested with actual Clerk-authenticated users
**Then:**
- A `convex/users.ts` query `listUsers` exists, protected by `withAdmin`, that returns all users (for the admin user management view in Story 1.4)
- A `convex/users.ts` query `getUserById` exists, protected by `withUser`, that returns a user by ID (for displaying user names in various contexts)
- All queries and mutations in `convex/users.ts` define both `args` and `returns` validators
- Role-gated functions reject unauthorized/wrong-role requests per this matrix:

| Function | Wrapper | Unauthenticated → | Wrong role → |
|---|---|---|---|
| `me` | `withUser` | `UNAUTHORIZED` | _(any role accepted)_ |
| `updateRole` | `withAdmin` | `UNAUTHORIZED` | `UNAUTHORIZED` (non-admin) |
| `switchRole` | `withUser` | `UNAUTHORIZED` | _(any role accepted; throws `ENVIRONMENT_MISCONFIGURED` when `DEMO_ROLE_SWITCHER` Convex env var is not set)_ |
| `listUsers` | `withAdmin` | `UNAUTHORIZED` | `UNAUTHORIZED` (non-admin) |
| `getUserById` | `withUser` | `UNAUTHORIZED` | _(any role accepted)_ |

### AC7: Clerk identity fields mapping
**Given** the Clerk JWT identity object
**When** creating a user record
**Then:**
- `clerkId` maps to `identity.subject` (the Clerk user ID)
- `email` maps to `identity.email` (falls back to empty string if not present)
- `name` maps to `identity.name` or `identity.givenName + " " + identity.familyName` or `identity.email` (cascading fallback)
- `affiliation` defaults to empty string (user can update later)
- The mapping is documented in code comments for maintainability

## Technical Notes

### Convex users.ts — full function inventory

```
convex/users.ts:
  getByClerkId     — internalQuery (already exists from Story 1.2, used by auth wrappers)
  ensureUser       — mutation (creates user on first auth, idempotent)
  me               — query (current user profile, withUser)
  updateRole       — mutation (admin role change, withAdmin)
  switchRole       — mutation (demo role switcher, withUser)
  listUsers        — query (all users, withAdmin)
  getUserById      — query (single user by ID, withUser)
```

### Frontend components to create

```
app/features/auth/
  role-switcher.tsx          — Demo-only role switching dropdown
  role-badge.tsx             — Small badge showing current role
  use-current-user.ts        — Hook wrapping the `me` query
  index.ts                   — Barrel export
```

### Files to modify

```
convex/users.ts              — Add ensureUser, me, updateRole, switchRole, listUsers, getUserById
app/routes/__root.tsx        — Add ensureUser call + role badge + role switcher in header
```

### Clerk identity shape

The `ctx.auth.getUserIdentity()` returns a `UserIdentity` object with these relevant fields:
- `subject` — Clerk user ID (maps to `clerkId`)
- `email` — User's email
- `name` — Display name
- `givenName` / `familyName` — First/last name components
- `tokenIdentifier` — Full identifier string (not used directly)

### ensureUser mutation pattern

The `ensureUser` mutation is called from the frontend after Clerk authentication. It does NOT use auth wrappers because:
1. The user might not have a Convex record yet (first visit)
2. Auth wrappers require a Convex user record to exist
3. Instead, it directly calls `ctx.auth.getUserIdentity()` and creates the record if needed

The mutation is idempotent — calling it multiple times for the same user has no side effects.

### Role display name mapping

```typescript
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  author: 'Author',
  reviewer: 'Reviewer',
  action_editor: 'Action Editor',
  editor_in_chief: 'Editor-in-Chief',
  admin: 'Admin',
}
```

### Task Breakdown (ordered)

1. **Expand `convex/users.ts`** — Add `ensureUser`, `me`, `updateRole`, `switchRole`, `listUsers`, `getUserById` mutations/queries with proper `args` and `returns` validators. The `switchRole` mutation must check for the `DEMO_ROLE_SWITCHER` Convex environment variable (via `process.env.DEMO_ROLE_SWITCHER`) and throw `ENVIRONMENT_MISCONFIGURED` (via `environmentMisconfiguredError`) when the variable is not set. (AC1, AC2, AC3, AC6, AC7)
2. **Create `app/features/auth/use-current-user.ts`** — Hook that calls the `me` query via Convex's `useQuery` hook. The hook must gate on `ensureUser` having completed (e.g., accept an `isBootstrapped` flag or use `"skip"` token to disable the query until `ensureUser` resolves). This prevents the `me` query (which uses `withUser`) from firing before the Convex user record exists on first sign-in. (AC1b, AC2)
3. **Create `app/features/auth/role-badge.tsx`** — Small badge component showing formatted role name. (AC4)
4. **Create `app/features/auth/role-switcher.tsx`** — Demo-only role switching dropdown using shadcn/ui Select, calling `switchRole` mutation. Conditionally rendered based on environment. (AC5)
5. **Create `app/features/auth/index.ts`** — Barrel export for auth feature components. (—)
6. **Update `app/routes/__root.tsx`** — Wire `ensureUser` call after Clerk auth, add role badge and role switcher to header. (AC1, AC4, AC5)
7. **Validate AC6 authorization behavior** — Manually test or write a dev-time script that verifies: (a) calling `updateRole` and `listUsers` without authentication throws `UNAUTHORIZED`, (b) calling `updateRole` and `listUsers` as a non-admin user throws `UNAUTHORIZED`, (c) calling `switchRole` succeeds when `DEMO_ROLE_SWITCHER` Convex env var is set but throws `ENVIRONMENT_MISCONFIGURED` when it is not set. Confirm behavior matches the AC6 matrix. (AC6)
8. **Verify typecheck and dev server** — Run `bun run typecheck` and confirm `bun dev` starts without errors. (—)

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `ensureUser` race condition — multiple tabs could try to create the same user simultaneously | Duplicate user records or errors | Convex mutations run with serializable isolation (OCC). The `ensureUser` mutation reads the `by_clerkId` index then conditionally inserts. If two concurrent calls both attempt to insert for the same `clerkId`, Convex detects the read-write conflict on the index and automatically retries the losing transaction. On retry, the second call finds the existing record and returns it without inserting a duplicate. No additional locking or uniqueness constraint is required. |
| Clerk identity fields may be undefined | Missing name/email on user record | Cascading fallback chain for `name` and `email` fields with sensible defaults. |
| Role switcher accidentally shipped to production | Security concern — users can self-elevate roles | **Defense in depth:** (1) Conditional rendering based on `import.meta.env.DEV` or explicit `VITE_SHOW_ROLE_SWITCHER` env var (UI layer), AND (2) the `switchRole` Convex mutation checks for the `DEMO_ROLE_SWITCHER` Convex environment variable (set in Convex dashboard) and throws `ENVIRONMENT_MISCONFIGURED` via `environmentMisconfiguredError('Role switching is disabled in production')` if not set (server layer). The server-side guard ensures that even direct API invocation cannot escalate roles when the flag is absent. For preview deployments, both `VITE_SHOW_ROLE_SWITCHER` (hosting) and `DEMO_ROLE_SWITCHER` (Convex dashboard) must be explicitly set. |
| `ensureUser` called before Clerk auth completes | No identity available, mutation fails | Only call `ensureUser` when `isSignedIn` is true (from Clerk hooks). Use `useAuth()` to gate the call. |
| First-render race: `me` query fires before `ensureUser` completes on first sign-in | `withUser` throws `UNAUTHORIZED` because no Convex user record exists yet; user sees a flash error | Gate the `me` query (and all components that depend on it) on `ensureUser` completion. Use a boolean state (`isBootstrapped`) set after `ensureUser` resolves, and pass Convex's `"skip"` token to `useQuery(api.users.me)` until bootstrapping is complete. This ensures `me` never fires before the user record exists. |
| First-admin bootstrap in production: all new users default to `author`, `updateRole` requires `admin`, and `switchRole` is disabled without `DEMO_ROLE_SWITCHER` | No way to create the first admin user through the application | The first admin is bootstrapped outside the application: either (a) directly editing the `users` table via the Convex dashboard to set `role: "admin"` on the desired user, or (b) running a one-time seed script (see Story 7.1). This is an intentional prototype trade-off — there is no self-service admin bootstrap flow. Document this in the deployment guide. |

### Dependencies on this story

- **Story 1.4 (App Shell, Routing, Design System):** Depends on role-based routing, role switcher, and user context being available
- **All subsequent stories:** Depend on user records existing in Convex and role-based auth working end-to-end

### What "done" looks like

- Authenticated users automatically get a Convex `users` record on first visit
- Returning users sign in via Clerk and see their profile/role without error flashes
- The `me` query returns the current user's profile reactively (gated on `ensureUser` completion to prevent first-render race)
- Admins can change user roles via `updateRole`
- The demo role switcher is visible in dev/preview and allows switching between all 5 roles
- The header shows the user's current role badge
- All Convex functions in `convex/users.ts` have both `args` and `returns` validators
- `bun run typecheck` succeeds with zero errors
- `bun dev` runs without errors

## Dev Notes

- The `ensureUser` mutation does NOT use `withUser` or any auth wrapper — it's the bootstrapping mutation that creates the user record the wrappers depend on. It directly calls `ctx.auth.getUserIdentity()`.
- The `switchRole` mutation uses `withUser` (not `withAdmin`) because it's for the demo role switcher where any authenticated user can switch their own role. This is acceptable because: (1) the mutation enforces a server-side guard checking for the `DEMO_ROLE_SWITCHER` Convex environment variable (set in Convex dashboard) and throws `ENVIRONMENT_MISCONFIGURED` if not set, (2) server-side auth wrappers enforce the role stored in Convex regardless, (3) the role switcher UI is hidden in production. The server-side guard is the primary security control; the UI hiding is a secondary UX measure.
- The role badge and role switcher should use the `useCurrentUser` hook (which wraps `api.users.me`). These components must not render until `ensureUser` has resolved, to avoid a first-render race where `me` throws `UNAUTHORIZED` because the Convex user record doesn't exist yet. The recommended pattern is: `ensureUser` runs as an effect in the root layout's `<SignedIn>` block and sets a boolean state (e.g., `isBootstrapped`); child components (role badge, role switcher) only mount or the `me` query only fires (via Convex `"skip"` token) once bootstrapping is complete.
- Import conventions: value imports before type imports, separate `import type` statements.
- Use `Array<T>` syntax, not `T[]`.
- The `ensureUser` call should be placed in a component rendered inside `<SignedIn>` in the root layout, ensuring it only fires for authenticated users.
