# ATDD Checklist: 1-3 User Registration, Login, and Role Management

## AC1: User record creation on first authentication
- [x] `ensureUser` mutation exists in `convex/users.ts`
- [x] `ensureUser` extracts Clerk identity via `ctx.auth.getUserIdentity()`
- [x] `ensureUser` checks `by_clerkId` index for existing record
- [x] `ensureUser` creates record with `clerkId`, `email`, `name`, `affiliation`, `role: "author"`, `createdAt`
- [x] `ensureUser` returns existing user if record already exists (idempotent)
- [x] `ensureUser` defines both `args` and `returns` validators
- [x] `ensureUser` does NOT use auth wrappers
- [x] Frontend calls `ensureUser` after Clerk auth succeeds (in `AuthenticatedHeader` component)

## AC1b: Login and session establishment
- [x] `ensureUser` fires idempotently for returning users
- [x] After `ensureUser` resolves, `me` query returns user profile
- [x] `me` query is gated on `ensureUser` completion via `isBootstrapped` state + Convex `"skip"` token

## AC2: User profile query
- [x] `me` query exists in `convex/users.ts`
- [x] `me` uses `withUser` wrapper
- [x] `me` returns full user document via `userDocValidator`
- [x] `me` defines both `args` and `returns` validators

## AC3: Role update mutation
- [x] `updateRole` mutation exists with `userId` and `role` args
- [x] `updateRole` uses `withAdmin` wrapper
- [x] `switchRole` mutation exists with only `role` arg
- [x] `switchRole` uses `withUser` wrapper
- [x] `switchRole` checks `DEMO_ROLE_SWITCHER` Convex env var via `process.env.DEMO_ROLE_SWITCHER`
- [x] `switchRole` throws `ENVIRONMENT_MISCONFIGURED` via `environmentMisconfiguredError()` when env var not set
- [x] Both mutations define `args` and `returns` validators

## AC4: Current user display in header
- [x] `RoleBadge` component shows formatted role name using `ROLE_DISPLAY_NAMES` map
- [x] Role badge appears next to UserButton in header (in `AuthenticatedHeader`)
- [x] Role badge updates reactively when role changes (driven by Convex reactive `me` query)

## AC5: Demo-only role switcher
- [x] `RoleSwitcher` component renders in header (between role badge and UserButton)
- [x] Displays dropdown with all 5 roles as display names
- [x] Calls `switchRole` mutation on selection
- [x] Only rendered when `import.meta.env.DEV` or `VITE_SHOW_ROLE_SWITCHER` is set
- [x] Never rendered in production without `VITE_SHOW_ROLE_SWITCHER`
- [x] Uses shadcn/ui Select component

## AC6: Role-based access enforcement
- [x] `listUsers` query exists, protected by `withAdmin`
- [x] `getUserById` query exists, protected by `withUser`
- [x] All functions define both `args` and `returns` validators
- [x] Authorization matrix matches spec (me/withUser, updateRole/withAdmin, switchRole/withUser, listUsers/withAdmin, getUserById/withUser)

## AC7: Clerk identity fields mapping
- [x] `clerkId` maps to `identity.subject`
- [x] `email` maps to `identity.email` with fallback to empty string
- [x] `name` cascading fallback: `name` -> `givenName + familyName` -> `email`
- [x] `affiliation` defaults to empty string
