# Story 4.1: Reviewer Invitation Acceptance and Onboarding

## Story

**As a** reviewer,
**I want** to click an invitation link and be reading the paper within 60 seconds,
**So that** the review process respects my time from the very first interaction.

## Status

**Epic:** 4 - Review Process & Semi-Confidential Discussion
**Status:** ready
**Priority:** High (first story of Epic 4, delivers FR28 partial, gated on secure token flow)
**Depends on:** Story 3.6 (reviewer invitation with `sendInvitations` mutation, `reviewInvites` table with `tokenHash`, `reviewAssignmentId`, `expiresAt`, `consumedAt`, `revokedAt`), Story 1.3 (Clerk auth integration, `ensureUser` mutation, `useBootstrappedUser` hook), Story 1.2 (schema with `reviewInvites` table indexes `by_tokenHash` and `by_submissionId`, `reviews` table with `by_submissionId_reviewerId` index)

## Context

This story bridges the editor-side invitation flow (Story 3.6) and the reviewer-side review workspace (Stories 4.2–4.4). When an editor sends invitations, a `reviewInvites` record is created with a `reviewAssignmentId` (UUID) whose SHA-256 hash is stored as `tokenHash`. The invitation notification body contains a placeholder link: `/review/accept/{reviewAssignmentId}`. This story implements the acceptance endpoint that validates that token, consumes the invitation atomically, upgrades the user's role to `reviewer` if needed, and redirects them to the review workspace.

**What exists today:**
- `convex/invitations.ts` — `sendInvitations` mutation creates `reviewInvites` records with `tokenHash` (SHA-256 of UUID), `expiresAt` (24h TTL), `reviewAssignmentId`; `hashToken()` helper; `deriveInviteStatus()` helper; `listBySubmission` query; `revokeInvitation` mutation
- `convex/schema.ts` — `reviewInvites` table with `by_tokenHash` index and `by_submissionId` index; `reviews` table with `by_submissionId_reviewerId` compound index
- `convex/helpers/errors.ts` — `inviteTokenInvalidError()`, `inviteTokenExpiredError()`, `inviteTokenUsedError()` helpers
- `convex/helpers/auth.ts` — `withUser` wrapper (resolves Clerk JWT → user doc), `withReviewer` wrapper (checks reviewer role + assignment)
- `convex/users.ts` — `ensureUser` mutation (idempotent, default role `'author'`), `me` query
- `app/features/auth/use-bootstrapped-user.ts` — `useBootstrappedUser()` hook (calls `ensureUser` on mount, gates `me` query)
- `app/routes/review/route.tsx` — review layout with `data-mode="reviewer"`, auth guard requiring `reviewer` or `admin` role, `useBootstrappedUser` hook
- `app/routes/review/index.tsx` — empty state "No reviews assigned" placeholder

**What this story builds:**
1. New Convex mutation `acceptInvitation` in `convex/invitations.ts` — validates token by hashing and looking up `by_tokenHash`, checks `revokedAt`, `consumedAt`, `expiresAt`, atomically sets `consumedAt`, upgrades user role to `reviewer` if currently `author`
2. New Convex query `getInviteStatus` in `convex/invitations.ts` — public query (no auth required) that validates a token and returns its status without consuming it, used for the acceptance page to show appropriate UI before the user authenticates
3. New route `app/routes/review/accept/$token.tsx` — public-facing acceptance page that handles the token validation flow, inline Clerk sign-up for new users, and redirect to review workspace
4. Updated `app/routes/review/route.tsx` — allow the `/review/accept/$token` route to bypass the reviewer role guard (since the user may not be a reviewer yet)

**Key architectural decisions:**

- **Token validation in a mutation (not query):** The `acceptInvitation` mutation performs token lookup, validation, and atomic `consumedAt` write in a single transactional mutation. This prevents TOCTOU race conditions where two concurrent requests could both pass validation before either writes `consumedAt`.
- **Public invite status query:** A separate `getInviteStatus` query allows the acceptance page to check if a token is valid/expired/consumed/revoked without requiring authentication. This enables showing the right UI (sign-up form vs. error message) before the user logs in.
- **Role upgrade, not role assignment:** The `acceptInvitation` mutation upgrades users from `author` to `reviewer` but does NOT downgrade users who already have a higher role (e.g., `editor_in_chief`, `admin`). Users with `reviewer` or higher roles keep their current role.
- **No separate accept route layout:** The `/review/accept/$token` route renders outside the standard review layout's role guard. It handles its own auth state (signed in vs. signed out) and redirects to `/review` on success.
- **Inline Clerk sign-in/sign-up:** For unauthenticated users, the acceptance page renders a Clerk `<SignIn />` component inline (imported from `@clerk/tanstack-react-start`; confirmed available per Clerk docs for TanStack Start). The `<SignIn />` component handles both sign-in and sign-up flows by default. Use `fallbackRedirectUrl` prop pointing to the current acceptance page URL so the user returns here after authenticating. After auth completes, the page automatically calls `acceptInvitation`. Note: `<SignIn />` cannot render when a user is already signed in (Clerk redirects to Home URL), so wrap it in `<SignedOut>` from Clerk.
- **60-second target:** The flow is optimized for speed: token validation is a single DB lookup by indexed `tokenHash`, role upgrade is a single `db.patch`, and the redirect happens immediately after mutation success.

**Key architectural references:**
- Architecture: `reviewInvites` table with `tokenHash`, `expiresAt`, `consumedAt`, `revokedAt` for secure one-time tokens
- Architecture: One-time use enforced by atomically setting `consumedAt` on first successful accept
- Architecture: Inline Clerk sign-up for new reviewers; role assignment after token validation
- Architecture: Error codes `INVITE_TOKEN_INVALID`, `INVITE_TOKEN_EXPIRED`, `INVITE_TOKEN_USED`
- FR28: Reviewers can view assigned papers (this story enables access; Story 4.2 builds the workspace)

## Acceptance Criteria

### AC1: Token validation and invitation acceptance
**Given** a reviewer with an account who is authenticated
**When** they visit `/review/accept/{reviewAssignmentId}`
**Then:**
- An `acceptInvitation` mutation is called with the `token` string
- The mutation computes `tokenHash` via SHA-256 of the token (reusing existing `hashToken()` helper)
- The mutation looks up the `reviewInvites` record by the `by_tokenHash` index
- If no record is found, throws `inviteTokenInvalidError()`
- If `revokedAt` is set, throws `inviteTokenInvalidError()` (reuse existing helper; the frontend uses `getInviteStatus` to distinguish revoked from invalid and display the appropriate message)
- If `consumedAt` is already set, throws `inviteTokenUsedError()`
- If `expiresAt < Date.now()`, throws `inviteTokenExpiredError()`
- On valid token: atomically sets `consumedAt` to `Date.now()` on the invite record
- If user's current role is `'author'`, upgrades to `'reviewer'` via `db.patch`
- Returns `{ submissionId, reviewerId }` for the frontend to navigate to the review workspace
- The mutation uses `withUser` wrapper for authentication
- The mutation defines both `args` and `returns` validators

### AC2: Public token status check (pre-auth)
**Given** any user (authenticated or not) visiting the acceptance link
**When** the page loads
**Then:**
- A `getInviteStatus` query checks the token without consuming it
- This query does NOT require authentication (no `withUser` wrapper)
- The query hashes the token and looks up the invite
- Returns one of: `'valid'` (token exists, not consumed/revoked/expired), `'expired'`, `'consumed'`, `'revoked'`, `'invalid'` (not found)
- Also returns `submissionId` if the invite exists (for showing paper title context)
- The query defines both `args` and `returns` validators

### AC3: Inline Clerk sign-in/sign-up for new users
**Given** a user without an account (or not signed in) who clicks the invitation link
**When** the page loads and `getInviteStatus` returns `'valid'`
**Then:**
- The page shows a minimal card with invitation context ("You've been invited to review a paper")
- A Clerk `<SignIn />` component (imported from `@clerk/tanstack-react-start`) renders inline within a `<SignedOut>` wrapper — this component handles both sign-in and sign-up flows by default
- The `<SignIn />` uses `fallbackRedirectUrl` prop set to the current page URL (`/review/accept/{token}`) so the user returns here after authenticating
- After the user signs in or signs up, the page re-renders with authenticated state
- A `<SignedIn>` wrapper contains the auto-accept flow:
  - The `useBootstrappedUser()` hook fires `ensureUser` to create the Convex user record
  - Once bootstrapped, the page calls `acceptInvitation` automatically
  - On success, navigates to `/review` (the review workspace)
- The entire flow completes in under 60 seconds including account creation

### AC4: Expired token error handling
**Given** an expired invitation token
**When** the reviewer clicks the link
**Then:**
- The `getInviteStatus` query returns `'expired'`
- The page displays: "This invitation has expired" with an explanatory message
- A "Request New Link" button is shown (links to a mailto or displays a message to contact the editor)
- No sign-up or sign-in UI is shown

### AC5: Consumed token error handling
**Given** an already-consumed invitation token
**When** the reviewer clicks the link
**Then:**
- The `getInviteStatus` query returns `'consumed'`
- The page displays: "This invitation has already been used"
- If the user is authenticated, shows a "Go to Review Workspace" link to `/review`
- If not authenticated, shows a "Sign in to access your reviews" button

### AC6: Revoked token error handling
**Given** a revoked invitation token
**When** the reviewer clicks the link
**Then:**
- The `getInviteStatus` query returns `'revoked'`
- The page displays: "This invitation has been revoked"
- An explanatory message says "The editor has withdrawn this invitation. Please contact them for more information."

### AC7: Invalid token error handling
**Given** an invalid token (not found in the database)
**When** the reviewer clicks the link
**Then:**
- The `getInviteStatus` query returns `'invalid'`
- The page displays: "Invalid invitation link"
- An explanatory message says "This link may be malformed. Please check your email for the correct invitation link."

### AC8: Review route layout bypass for accept page
**Given** the `/review/accept/$token` route
**When** it loads
**Then:**
- The route renders within the review layout's `data-mode="reviewer"` wrapper
- But the reviewer role guard in the layout does NOT redirect unauthenticated or non-reviewer users away from the accept page
- After successful acceptance and role upgrade, the user can navigate to `/review` normally

### AC9: Audit trail for invitation acceptance
**Given** a successful invitation acceptance
**When** `acceptInvitation` mutation completes
**Then:**
- An audit log entry is created via `logAction` with action `invitation_accepted`
- Details include the reviewer name
- The entry appears in the `AuditTimeline` on the submission's editor detail page

## Technical Notes

### Changes to `convex/invitations.ts`

Add two new functions to the existing file:

1. **`getInviteStatus` query** (NO auth wrapper — public):
   - Args: `token: v.string()`
   - Computes `tokenHash` via existing `hashToken()` helper
   - Looks up invite by `by_tokenHash` index
   - Returns status and optional `submissionId`
   - Returns validator: `v.object({ status: v.union(v.literal('valid'), v.literal('expired'), v.literal('consumed'), v.literal('revoked'), v.literal('invalid')), submissionId: v.optional(v.id('submissions')) })`

2. **`acceptInvitation` mutation** (uses `withUser`):
   - Args: `token: v.string()`
   - Uses `withUser` wrapper for authentication
   - Computes `tokenHash` via existing `hashToken()` helper
   - Looks up invite by `by_tokenHash` index
   - Validates: not null → not revoked → not consumed → not expired (in that order for clear error messages)
   - Atomically sets `consumedAt: Date.now()` via `ctx.db.patch`
   - If `ctx.user.role === 'author'`, patches user to `role: 'reviewer'`
   - Schedules audit log via `ctx.scheduler.runAfter(0, internal.audit.logAction, { ... })`
   - Returns: `v.object({ submissionId: v.id('submissions'), reviewerId: v.id('users') })`

### New route: `app/routes/review/accept/$token.tsx`

File-based route at `/review/accept/:token`. Uses TanStack Router's `createFileRoute('/review/accept/$token')`.

**Component structure:**
```
AcceptInvitationPage
  ├─ Route.useParams() → { token }
  ├─ useQuery(api.invitations.getInviteStatus, { token })
  ├─ Conditional rendering based on status:
  │    ├─ Status 'invalid'/'expired'/'consumed'/'revoked' → Error card (see AC4-AC7)
  │    └─ Status 'valid' → Invitation card with dual auth paths:
  │         ├─ <SignedOut> → Clerk <SignIn fallbackRedirectUrl={currentUrl} />
  │         └─ <SignedIn> → <AutoAcceptFlow token={token} />
  └─ AutoAcceptFlow (inner component):
       ├─ useBootstrappedUser() → ensures Convex user record exists
       ├─ useMutation(api.invitations.acceptInvitation)
       ├─ useEffect: call mutation once isBootstrapped === true (run once via ref guard)
       ├─ Loading state: Loader2Icon spinner + "Accepting invitation..."
       ├─ On success → useNavigate()({ to: '/review' })
       └─ On error → show error message with retry button
```

**Note on route nesting:** This route is nested under `/review` which means it renders inside the review layout (`app/routes/review/route.tsx`). The review layout currently has a role guard that redirects non-reviewer users. We need to modify the layout to allow the `/review/accept/$token` route through without the role check.

### Update to `app/routes/review/route.tsx`

Two changes are needed to allow the accept page through:

**1. `beforeLoad` guard (line 16-19):** The existing `beforeLoad` checks `context.userId` and redirects to `/?signIn=true` if not authenticated. This must be relaxed for the accept route because unauthenticated users need to see the acceptance page (with inline sign-up). Since `beforeLoad` doesn't have easy access to the child route path in TanStack Router, the simplest approach is to **remove the `beforeLoad` redirect entirely** from the review layout and instead handle auth checks in the `ReviewLayout` component and in individual route pages. The accept page handles its own auth state.

Alternatively, if we want to keep `beforeLoad` for other review routes: use `context.location.pathname` (available in TanStack Router's `beforeLoad` context) to check if the path starts with `/review/accept/` and skip the redirect:

```typescript
beforeLoad: ({ context, location }) => {
  if (location.pathname.startsWith('/review/accept/')) {
    return // Allow accept route through without auth check
  }
  if (!context.userId) {
    throw redirect({ to: '/', search: { signIn: true } })
  }
},
```

**2. Component-level role guard (lines 28-34):** The `ReviewLayout` component checks `hasRole(user.role, ALLOWED_ROLES)` and redirects non-reviewer users. Add a path check using `useLocation()` from `@tanstack/react-router`:

```typescript
import { useLocation } from '@tanstack/react-router'

// Inside ReviewLayout:
const location = useLocation()
const isAcceptRoute = location.pathname.startsWith('/review/accept/')

// Skip role check for accept route
const hasAccess = isAcceptRoute || (user && hasRole(user.role, ALLOWED_ROLES))
```

When `isAcceptRoute` is true, skip both the role check and the `useBootstrappedUser()` loading gate (since the accept page manages its own auth flow). Render the outlet directly within the `data-mode="reviewer"` wrapper and error boundary.

### New directory: `app/routes/review/accept/`

Create `app/routes/review/accept/$token.tsx` — this requires creating the `accept` directory under `app/routes/review/`.

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`, `useMutation`
- Import from `@clerk/tanstack-react-start` for `SignIn`, `SignedIn`, `SignedOut`, `useAuth`
- Import from `@tanstack/react-router` for `createFileRoute`, `useNavigate`, `useLocation`
- Import from `~/components/ui/` for shadcn components
- Import from `~/features/auth` for `useBootstrappedUser`

### shadcn/ui components to use

- `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription` — invitation card, error cards (already installed)
- `Button` — action buttons (already installed)
- `Alert`, `AlertDescription`, `AlertTitle` — error state messages (check if installed; if not, `bunx --bun shadcn@latest add alert`)
- lucide-react icons: `CheckCircleIcon`, `XCircleIcon`, `ClockIcon`, `ShieldXIcon`, `LinkIcon`, `ArrowRightIcon`, `MailIcon`, `Loader2Icon`

### Files to modify

```
convex/invitations.ts                           — ADD: acceptInvitation mutation, getInviteStatus query
app/routes/review/route.tsx                     — MODIFY: bypass role guard for /review/accept/* routes
app/routes/review/accept/$token.tsx             — NEW: acceptance page with inline Clerk sign-up
```

### Implementation sequence

1. **Add `getInviteStatus` query to `convex/invitations.ts`** — public query, no auth wrapper. Hash token, look up by index, derive status.

2. **Add `acceptInvitation` mutation to `convex/invitations.ts`** — uses `withUser`, validates token, atomically sets `consumedAt`, upgrades role if needed, logs audit entry.

3. **Update `app/routes/review/route.tsx`** — detect accept route path and bypass role guard while maintaining the `data-mode="reviewer"` wrapper.

4. **Create `app/routes/review/accept/$token.tsx`** — acceptance page with token status display, inline Clerk sign-up, and auto-accept flow.

5. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Token validation flow

```
User clicks /review/accept/{reviewAssignmentId}
  │
  ├─ getInviteStatus query (no auth)
  │    ├─ hash(token) → lookup by_tokenHash
  │    └─ Return status: valid/expired/consumed/revoked/invalid
  │
  ├─ If status ≠ 'valid' → Show error card, stop
  │
  ├─ If not signed in → Show Clerk <SignIn /> inline
  │    └─ After sign-in → re-render with auth state
  │
  ├─ If signed in → useBootstrappedUser() ensures user record
  │
  └─ acceptInvitation mutation (auth required)
       ├─ hash(token) → lookup by_tokenHash
       ├─ Validate: exists → not revoked → not consumed → not expired
       ├─ db.patch(invite, { consumedAt: Date.now() })
       ├─ If user.role === 'author' → db.patch(user, { role: 'reviewer' })
       ├─ Schedule audit logAction
       └─ Return { submissionId, reviewerId }
           └─ Frontend: navigate('/review')
```

### Error code to UI mapping

| Error Code | UI Message | Action |
|------------|-----------|--------|
| `'invalid'` | "Invalid invitation link" | "Check your email for the correct link" |
| `'expired'` | "This invitation has expired" | "Request New Link" button |
| `'consumed'` | "This invitation has already been used" | "Go to Review Workspace" or "Sign in" |
| `'revoked'` | "This invitation has been revoked" | "Contact the editor" |

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Race condition: two concurrent accepts | Both pass validation | Convex mutations are serialized per document — the second `db.patch` will see the updated `consumedAt` if we re-read, but since mutations are transactional, the second call will see the original `consumedAt === undefined` and succeed. However, Convex serializes mutations that touch the same document, so in practice only one will succeed. |
| Clerk sign-up failure blocks acceptance | User can't accept | Show retry button; the token remains unconsumed so they can try again |
| Role upgrade for existing editors | Admin demoted to reviewer | Only upgrade `'author'` role, never downgrade any other role |
| Accept page visible to crawlers | Token exposure via indexing | Tokens are UUIDs with 24h TTL; page returns 404-like content for invalid tokens; add `<meta name="robots" content="noindex">` |
| Layout role guard blocks accept page | 403 redirect loop | Detect `/review/accept/*` path in layout and skip guard |

### Dependencies on this story

- **Story 4.2 (Split-View Review Workspace):** Builds the actual review workspace that this story redirects to after acceptance. Until 4.2 is built, the redirect lands on the "No reviews assigned" placeholder which is acceptable.
- **Story 4.3 (Structured Review Form):** Uses the `reviews` record created in Story 3.6 (status `assigned`) — this story transitions it to active via the acceptance flow.

### What "done" looks like

- `convex/invitations.ts` has `getInviteStatus` query (no auth, public) and `acceptInvitation` mutation (auth required)
- `getInviteStatus` returns `{ status, submissionId? }` for any token
- `acceptInvitation` validates token → sets `consumedAt` atomically → upgrades role from `author` to `reviewer` → logs audit
- Both new Convex functions define `args` and `returns` validators
- `app/routes/review/route.tsx` allows `/review/accept/*` routes through without the reviewer role guard
- `app/routes/review/accept/$token.tsx` renders:
  - Error cards for invalid/expired/consumed/revoked tokens
  - Inline Clerk sign-in for unauthenticated users on valid tokens
  - Auto-accept flow for authenticated users on valid tokens
  - Navigation to `/review` on successful acceptance
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The `hashToken()` helper already exists in `convex/invitations.ts` and uses Web Crypto API (`crypto.subtle.digest`) — reuse it directly.
- The `deriveInviteStatus()` helper also exists but it takes a `Doc<'reviewInvites'>` — the new `getInviteStatus` query can reuse it after looking up the invite.
- The `by_tokenHash` index on `reviewInvites` ensures O(1) lookup for token validation.
- The `acceptInvitation` mutation is safe against race conditions because Convex mutations are transactional — if two requests arrive simultaneously for the same token, the second will see `consumedAt` already set and throw `inviteTokenUsedError()`.
- The role upgrade from `author` to `reviewer` is a one-way operation. Users with `reviewer`, `action_editor`, `editor_in_chief`, or `admin` roles are NOT modified.
- For the Clerk inline sign-in/sign-up, use `<SignIn fallbackRedirectUrl={currentUrl} />` from `@clerk/tanstack-react-start` (confirmed available per Clerk TanStack Start docs). The `<SignIn />` handles both sign-in and sign-up flows. Wrap in `<SignedOut>` so it only renders for unauthenticated users. The `<SignIn />` component cannot render when already signed in (Clerk will redirect), so the `<SignedOut>` guard is essential.
- The `/review/accept/$token` route creates a TanStack Router file route at `/review/accept/:token`. The `$` prefix in the filename becomes a `:` path parameter.
- The review workspace redirect (`/review`) currently shows "No reviews assigned" — this is expected until Story 4.2 builds the actual workspace. The important thing is that the user now has `reviewer` role and is in the system.
- The `Alert` component from shadcn/ui should be checked for installation. If not present, install via `bunx --bun shadcn@latest add alert`.
- For the acceptance page's loading state, use a simple `Loader2Icon` spinner with "Accepting invitation..." text to indicate the mutation is in progress.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 4 spec | Sprint Agent |
| 2026-02-08 | Fixed: Clerk `<SignIn />` import/usage clarified with `<SignedOut>` wrapper and `fallbackRedirectUrl`; Route layout bypass mechanism specified with both `beforeLoad` and component-level changes using `useLocation()`; Revoked token error uses `inviteTokenInvalidError()` with frontend-side distinction via `getInviteStatus` | Sprint Agent |
