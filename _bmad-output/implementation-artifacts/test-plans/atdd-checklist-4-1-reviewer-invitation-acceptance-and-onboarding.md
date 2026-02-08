# ATDD Checklist — Story 4.1: Reviewer Invitation Acceptance and Onboarding

## AC1: Token validation and invitation acceptance

| # | Acceptance Criterion | Test Type | Status |
|---|---------------------|-----------|--------|
| 1.1 | `acceptInvitation` mutation hashes token via SHA-256 and looks up by `by_tokenHash` index | Unit | PASS (code review) |
| 1.2 | Throws `inviteTokenInvalidError()` when no record found | Unit | PASS (code review) |
| 1.3 | Throws `inviteTokenInvalidError()` when `revokedAt` is set | Unit | PASS (code review) |
| 1.4 | Throws `inviteTokenUsedError()` when `consumedAt` is already set | Unit | PASS (code review) |
| 1.5 | Throws `inviteTokenExpiredError()` when `expiresAt < Date.now()` | Unit | PASS (code review) |
| 1.6 | Atomically sets `consumedAt` to `Date.now()` on valid token | Unit | PASS (code review) |
| 1.7 | Upgrades user role from `'author'` to `'reviewer'` | Unit | PASS (code review) |
| 1.8 | Does NOT downgrade users with higher roles (`reviewer`, `action_editor`, `editor_in_chief`, `admin`) | Unit | PASS (code review) |
| 1.9 | Returns `{ submissionId, reviewerId }` on success | Unit | PASS (code review) |
| 1.10 | Uses `withUser` wrapper for authentication | Unit | PASS (code review) |
| 1.11 | Defines both `args` and `returns` validators | Unit | PASS (code review) |

## AC2: Public token status check (pre-auth)

| # | Acceptance Criterion | Test Type | Status |
|---|---------------------|-----------|--------|
| 2.1 | `getInviteStatus` query does NOT require authentication | Unit | PASS (code review - no withUser wrapper) |
| 2.2 | Returns `'valid'` for valid, unconsumed, unrevoked, unexpired token | Unit | PASS (code review) |
| 2.3 | Returns `'expired'` for expired token | Unit | PASS (code review) |
| 2.4 | Returns `'consumed'` for consumed token | Unit | PASS (code review) |
| 2.5 | Returns `'revoked'` for revoked token | Unit | PASS (code review) |
| 2.6 | Returns `'invalid'` for unknown token | Unit | PASS (code review) |
| 2.7 | Returns `submissionId` when invite exists | Unit | PASS (code review) |
| 2.8 | Defines both `args` and `returns` validators | Unit | PASS (code review) |

## AC3: Inline Clerk sign-in/sign-up for new users

| # | Acceptance Criterion | Test Type | Status |
|---|---------------------|-----------|--------|
| 3.1 | Page shows invitation context card when status is `'valid'` | Manual/Component | PASS (code review) |
| 3.2 | Clerk `<SignIn>` renders inline within `<SignedOut>` wrapper | Manual/Component | PASS (code review) |
| 3.3 | `<SignIn>` uses `fallbackRedirectUrl` set to current page URL | Manual/Component | PASS (code review) |
| 3.4 | `<SignedIn>` wrapper contains `AutoAcceptFlow` component | Manual/Component | PASS (code review) |
| 3.5 | `useBootstrappedUser()` fires `ensureUser` to create user record | Manual/Component | PASS (code review) |
| 3.6 | Auto-accept calls `acceptInvitation` once bootstrapped (ref guard) | Manual/Component | PASS (code review) |
| 3.7 | On success, navigates to `/review` | Manual/Component | PASS (code review) |

## AC4: Expired token error handling

| # | Acceptance Criterion | Test Type | Status |
|---|---------------------|-----------|--------|
| 4.1 | Displays "This invitation has expired" for expired tokens | Manual/Component | PASS (code review) |
| 4.2 | Shows "Request New Link" button | Manual/Component | PASS (code review) |
| 4.3 | No sign-up/sign-in UI shown | Manual/Component | PASS (code review) |

## AC5: Consumed token error handling

| # | Acceptance Criterion | Test Type | Status |
|---|---------------------|-----------|--------|
| 5.1 | Displays "This invitation has already been used" | Manual/Component | PASS (code review) |
| 5.2 | Authenticated users see "Go to Review Workspace" link | Manual/Component | PASS (code review) |
| 5.3 | Unauthenticated users see "Sign in to access your reviews" button | Manual/Component | PASS (code review) |

## AC6: Revoked token error handling

| # | Acceptance Criterion | Test Type | Status |
|---|---------------------|-----------|--------|
| 6.1 | Displays "This invitation has been revoked" | Manual/Component | PASS (code review) |
| 6.2 | Shows editor contact message | Manual/Component | PASS (code review) |

## AC7: Invalid token error handling

| # | Acceptance Criterion | Test Type | Status |
|---|---------------------|-----------|--------|
| 7.1 | Displays "Invalid invitation link" | Manual/Component | PASS (code review) |
| 7.2 | Shows "check your email" message | Manual/Component | PASS (code review) |

## AC8: Review route layout bypass for accept page

| # | Acceptance Criterion | Test Type | Status |
|---|---------------------|-----------|--------|
| 8.1 | Accept route renders within `data-mode="reviewer"` wrapper | Manual/Component | PASS (code review) |
| 8.2 | `beforeLoad` skips auth check for `/review/accept/` paths | Unit | PASS (code review) |
| 8.3 | Component-level role guard skips for accept route | Unit | PASS (code review) |
| 8.4 | After acceptance, user can navigate to `/review` normally | Manual | PASS (code review) |

## AC9: Audit trail for invitation acceptance

| # | Acceptance Criterion | Test Type | Status |
|---|---------------------|-----------|--------|
| 9.1 | Audit log entry created via `logAction` with action `invitation_accepted` | Unit | PASS (code review) |
| 9.2 | Details include reviewer name | Unit | PASS (code review) |
| 9.3 | `ACTION_LABELS` mapping updated in `audit-timeline.tsx` | Unit | PASS (code review) |

## Verification Summary

- **TypeScript**: `bun run typecheck` — PASS (0 errors)
- **ESLint**: `bun run lint` — PASS (0 errors)
- **Tests**: `bun run test` — 73/73 PASS
- **Files modified**: 3 (`convex/invitations.ts`, `app/routes/review/route.tsx`, `app/features/editor/audit-timeline.tsx`)
- **Files created**: 2 (`app/routes/review/accept/$token.tsx`, `app/components/ui/alert.tsx`)
- **Route tree**: Auto-regenerated with new `/review/accept/$token` route
