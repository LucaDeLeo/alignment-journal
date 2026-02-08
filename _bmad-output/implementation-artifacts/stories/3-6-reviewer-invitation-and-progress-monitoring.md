# Story 3.6: Reviewer Invitation and Progress Monitoring

## Story

**As an** action editor,
**I want** to invite selected reviewers from the matching suggestions and monitor their progress,
**So that** I can manage the review pipeline and ensure timely responses.

## Status

**Epic:** 3 - Editor Dashboard & Reviewer Assignment
**Status:** ready
**Priority:** High (sixth story of Epic 3, delivers FR23, FR24, FR52/FR53 partial)
**Depends on:** Story 3.5 (intelligent reviewer matching with `findMatches` action, `matchResults` table, `ReviewerMatchPanel` with local selection state, `ReviewerMatchCard`), Story 3.3 (audit trail with `logAction` internalMutation), Story 1.2 (schema with `reviewInvites` table, `reviews` table, `notifications` table)

## Context

This story bridges the gap between reviewer matching (Story 3.5) and the actual review process (Epic 4). When an editor selects reviewers from the match panel, they need a way to send invitations, see a preview of the notification email, and then monitor which reviewers have responded, started their reviews, or are overdue.

**What exists today:**
- `app/features/editor/reviewer-match-panel.tsx` — displays match results with local `selectedIds` state (Set of profile IDs) for selecting/dismissing reviewers
- `app/features/editor/reviewer-match-card.tsx` — individual cards with select/dismiss
- `app/features/editor/submission-detail-editor.tsx` — editor submission detail page with match panel integrated for `TRIAGE_COMPLETE` / `UNDER_REVIEW` statuses
- `convex/matching.ts` — `"use node";` file with `findMatches` action, `getMatchResults` query, `matchResults` table with `matches` array containing `profileId`, `userId`, `reviewerName`, `affiliation`, `researchAreas`, `publicationTitles`, `rationale`, `confidence`
- `convex/audit.ts` — `logAction` internalMutation for audit trail entries
- `convex/schema.ts` — `reviewInvites` table with `submissionId`, `reviewerId`, `reviewAssignmentId`, `createdBy`, `tokenHash`, `expiresAt`, `consumedAt`, `revokedAt`, `createdAt` and indexes `by_tokenHash`, `by_submissionId`; `reviews` table with `submissionId`, `reviewerId`, `status` (`assigned`/`in_progress`/`submitted`/`locked`); `notifications` table with `recipientId`, `submissionId`, `type`, `subject`, `body`, `readAt`, `createdAt`
- `convex/helpers/errors.ts` — error helpers including `inviteTokenInvalidError`, `inviteTokenExpiredError`, `inviteTokenUsedError`
- `convex/helpers/auth.ts` — `withUser` wrapper for auth-gated functions
- `convex/users.ts` — `getByIdInternal` internalQuery (resolves user name, affiliation)

**What this story builds:**
1. New Convex file `convex/invitations.ts` with:
   - `sendInvitations` mutation — creates `reviewInvites` records with server-generated token hash and `reviews` records in `assigned` status; creates notification previews; logs audit entries
   - `listBySubmission` query — lists invitations for a submission with reviewer names and statuses
   - `revokeInvitation` mutation — sets `revokedAt` on a pending invite
   - `getReviewProgress` query — returns review progress indicators per reviewer for a submission
2. New UI component `app/features/editor/invitation-panel.tsx` — invitation workflow with notification preview, send button with undo toast, progress indicators
3. New UI component `app/features/editor/review-progress-indicator.tsx` — status dots showing reviewer response status
4. Updated `app/features/editor/reviewer-match-panel.tsx` — passes selected reviewer data to invitation panel
5. Updated `app/features/editor/submission-detail-editor.tsx` — integrates progress monitoring section
6. Updated `app/features/editor/index.ts` — new exports

**Key architectural decisions:**

- **Token generation in mutations (not actions):** Since this is a prototype, we generate a unique `reviewAssignmentId` (UUID v4 via `crypto.randomUUID()`) and store its SHA-256 hash as `tokenHash` in the `reviewInvites` table. The actual signed JWT token flow (from architecture.md) is simplified: we store a UUID assignment ID and hash it. The full JWT signing with `jti`, `exp` claims would be implemented in a production version. For this prototype, the `reviewAssignmentId` IS the token — token validation in Story 4.1 will look up by hash.
- **No actual email sending:** Per FR52/FR53, we render in-app notification previews showing what the email would contain. The `sendInvitations` mutation creates `notifications` records that render in-app. No email transport is wired.
- **Review record creation on invite:** When an invitation is sent, a corresponding `reviews` record is created with status `assigned`. This allows progress monitoring via reactive queries on the `reviews` table.
- **Progress indicator semantics:** Green = review submitted, Amber = review in progress or accepted but not yet due, Red = no response (invite sent but no review record activity past 7 days). These map directly to FR24.
- **Undo toast pattern:** The "Send Invitations" action uses a Tier 1 undo toast with a 10-second grace period. During this window, the invitation is created but marked with a short delay before becoming "active." If undone, the invite is revoked. Implementation: create the invite immediately, show the toast, and if the user clicks undo, call `revokeInvitation`.
- **Lifting selection state:** The `ReviewerMatchPanel` currently manages `selectedIds` as local state. This story lifts the selection state so that the `InvitationPanel` can access which reviewers are selected. The simplest approach: the invitation panel lives inside the match panel and receives `selectedIds` as a prop.

**Key architectural references:**
- Architecture: `reviewInvites` table with `tokenHash`, `expiresAt`, `consumedAt`, `revokedAt` for secure one-time tokens
- Architecture: `notifications` table for in-app notification previews (FR52, FR53)
- Architecture: Error codes `INVITE_TOKEN_INVALID`, `INVITE_TOKEN_EXPIRED`, `INVITE_TOKEN_USED`
- FR23: Action editors can select and invite reviewers from the matching suggestions
- FR24: Editors can monitor review progress per submission (who accepted, who's overdue, who hasn't responded)
- FR25: System maintains a full audit trail of editorial actions (invitations logged)
- FR52/FR53: In-app notification previews for reviewer invitations

## Acceptance Criteria

### AC1: Send invitations from selected matches
**Given** the editor has selected one or more reviewers in the match panel
**When** they click "Send Invitations"
**Then:**
- A `sendInvitations` mutation is called with the `submissionId` and array of selected `userId` values
- For each selected reviewer:
  - A unique `reviewAssignmentId` is generated via `crypto.randomUUID()`
  - A `tokenHash` is computed as SHA-256 of the `reviewAssignmentId` (using Node.js `crypto` module)
  - A `reviewInvites` record is created with `expiresAt` set to 24 hours from now
  - A `reviews` record is created with status `assigned`, `revision: 0`, and timestamps
  - A `notifications` record is created with type `reviewer_invitation` containing the email preview
  - An audit log entry is created via `logAction` with action `reviewer_invited` and details including reviewer name and match rationale
- The mutation uses `withUser` wrapper + manual `EDITOR_ROLES.includes(ctx.user.role)` authorization check (pattern from `convex/matching.ts:256`)
- Duplicate invitations for the same reviewer+submission pair are prevented (check existing non-revoked invite)
- The mutation defines both `args` and `returns` validators
- The `sendInvitations` function is in a new file `convex/invitations.ts` (NOT in matching.ts since it does not need `"use node;"`)

### AC2: Notification preview for invitation email
**Given** an invitation is sent
**When** the notification is created
**Then:**
- The `notifications` record contains:
  - `type`: `'reviewer_invitation'`
  - `subject`: `'Invitation to Review: {paper title}'`
  - `body`: A formatted string including: paper title, match rationale (why this reviewer was selected), compensation range ($500-$1,500), 4-week review deadline, and a placeholder invitation link (`/review/accept/{reviewAssignmentId}`)
- The notification preview is visible to editors viewing the submission (FR52, FR53)

### AC3: Invitation list with status
**Given** invitations have been sent for a submission
**When** the editor views the submission detail
**Then:**
- A `listBySubmission` query returns all invitations for the submission
- Each invitation includes: reviewer name (resolved from `users` table), invitation status (pending/accepted/expired/revoked), `createdAt`, `expiresAt`
- Status derivation: `revokedAt` set → `'revoked'`, `consumedAt` set → `'accepted'`, `expiresAt < now` → `'expired'`, otherwise → `'pending'`
- The query requires editor-level authorization
- The query defines both `args` and `returns` validators

### AC4: Revoke invitation
**Given** a pending (non-consumed, non-revoked, non-expired) invitation
**When** the editor clicks "Revoke"
**Then:**
- The `revokeInvitation` mutation sets `revokedAt` to the current timestamp
- An audit log entry is created with action `reviewer_invite_revoked`
- The UI updates reactively to show the revoked status
- Attempting to revoke an already-consumed or revoked invitation throws a validation error
- The mutation defines both `args` and `returns` validators

### AC5: Review progress indicators
**Given** a submission with active review assignments
**When** the editor views the submission detail
**Then:**
- A `getReviewProgress` query returns progress data per reviewer
- Each entry includes: reviewer name, review status (`assigned`/`in_progress`/`submitted`/`locked`), invitation status, `createdAt`, days since assignment
- Visual indicators in the UI:
  - Green dot + "Submitted" — review status is `submitted` or `locked`
  - Amber dot + "In Progress" — review status is `in_progress`, or `assigned` and within 7 days
  - Red dot + "No Response" — review status is `assigned` and more than 7 days since `createdAt`
- The query requires editor-level authorization
- The query defines both `args` and `returns` validators

### AC6: Invitation panel UI
**Given** the editor has selected reviewers in the match panel
**When** the invitation panel renders
**Then:**
- A summary shows "{N} reviewers selected for invitation"
- Each selected reviewer is listed with: name, affiliation, match rationale preview (truncated to 80 chars)
- A "Send Invitations" button triggers the mutation
- After sending, a toast notification appears: "Invitations sent. Undo?" with a 10-second window
- If "Undo" is clicked within 10 seconds, all just-created invitations are revoked
- The button is disabled while the mutation is in flight
- After successful send, the selection state is cleared

### AC7: Progress monitoring section
**Given** a submission with sent invitations
**When** the editor views the submission detail page
**Then:**
- A "Review Progress" section appears below the reviewer matching section
- It displays the list of invited reviewers with their progress indicators (AC5)
- Each entry shows: reviewer name, status dot + label, days since invitation
- Revokable invitations (pending status) show a "Revoke" button
- The section only appears when invitations exist for the submission
- The section updates reactively as review statuses change

### AC8: Audit trail integration
**Given** any invitation action (send, revoke)
**When** the action completes
**Then:**
- An audit log entry is created with the appropriate action type
- `reviewer_invited`: details include reviewer name and rationale snippet
- `reviewer_invite_revoked`: details include reviewer name
- These entries appear in the existing `AuditTimeline` component on the submission detail page

## Technical Notes

### New file: `convex/invitations.ts`

This file does NOT need `"use node;"` — all operations are standard Convex mutations and queries. Token hashing uses Convex's built-in environment (which supports `crypto` in the Convex runtime).

**Note:** Convex mutations run in a V8 isolate that does NOT have Node.js `crypto` module. For the SHA-256 hash, use the Web Crypto API (`crypto.subtle.digest`) which IS available in Convex's runtime. For UUID generation, use `crypto.randomUUID()` which is also available.

Define the `EDITOR_ROLES` constant at the top of the file (matches the pattern in `convex/matching.ts:30`):

```typescript
// Roles allowed to manage invitations (editor-level access)
const EDITOR_ROLES = ['editor_in_chief', 'action_editor', 'admin'] as const

// Hash helper using Web Crypto API (available in Convex runtime)
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
```

**Functions:**

1. `sendInvitations` mutation:
   - Args: `submissionId: v.id('submissions')`, `reviewerIds: v.array(v.id('users'))`, `matchData: v.array(v.object({ userId: v.id('users'), rationale: v.string() }))`
   - Uses `withUser` wrapper + manual `EDITOR_ROLES.includes(ctx.user.role)` check (pattern from `convex/matching.ts:256`)
   - For each reviewer:
     1. Check no existing non-revoked invite for this reviewer+submission
     2. Generate `reviewAssignmentId` via `crypto.randomUUID()`
     3. Compute `tokenHash` via `hashToken(reviewAssignmentId)`
     4. Insert `reviewInvites` record
     5. Insert `reviews` record with status `assigned`
     6. Read submission title for notification body
     7. Insert `notifications` record with formatted email preview body
     8. Schedule `logAction` with action `reviewer_invited`
   - Returns: `v.array(v.id('reviewInvites'))`

2. `listBySubmission` query:
   - Args: `submissionId: v.id('submissions')`
   - Uses `withUser` wrapper + manual `EDITOR_ROLES.includes(ctx.user.role)` check
   - Reads all `reviewInvites` for the submission via `by_submissionId` index
   - Resolves reviewer names from `users` table
   - Derives status: revoked > consumed/accepted > expired > pending
   - Returns array of enriched invite records

3. `revokeInvitation` mutation:
   - Args: `inviteId: v.id('reviewInvites')`
   - Uses `withUser` wrapper + manual `EDITOR_ROLES.includes(ctx.user.role)` check
   - Validates invite is not already consumed or revoked
   - Sets `revokedAt` on the invite record
   - Schedules `logAction` with action `reviewer_invite_revoked`
   - Returns: `v.null()`

4. `getReviewProgress` query:
   - Args: `submissionId: v.id('submissions')`
   - Uses `withUser` wrapper + manual `EDITOR_ROLES.includes(ctx.user.role)` check
   - Reads all `reviews` for the submission via `by_submissionId` index
   - Reads corresponding `reviewInvites` for the submission
   - Resolves reviewer names
   - Computes days since assignment and progress indicator status
   - Returns array of progress entries

### New file: `app/features/editor/invitation-panel.tsx`

Props: `submissionId`, `selectedReviewers` (array of `{ userId, reviewerName, affiliation, rationale }`), `onInvitationsSent` (callback to clear selection)

- Uses `useMutation(api.invitations.sendInvitations)` for sending
- Uses `useQuery(api.invitations.listBySubmission, { submissionId })` for listing sent invitations
- Shows notification email preview in a collapsible Card before sending
- Implements undo toast pattern: on send success, show toast with "Undo" action; if clicked, revoke all just-created invites
- After send + toast timeout, clears selection via `onInvitationsSent` callback

### New file: `app/features/editor/review-progress-indicator.tsx`

Props: `status` (derived progress indicator status), `label` (status text)

- Renders a colored dot (8px circle) + label text
- Green (`bg-emerald-500`): submitted/locked
- Amber (`bg-amber-500`): in progress or recently assigned
- Red (`bg-red-500`): no response past 7 days

### Files to modify

```
convex/invitations.ts                               — NEW: invitation mutations + queries
app/features/editor/invitation-panel.tsx             — NEW: invitation workflow UI
app/features/editor/review-progress-indicator.tsx    — NEW: status dot component
app/features/editor/reviewer-match-panel.tsx         — pass selected reviewers to invitation panel
app/features/editor/submission-detail-editor.tsx     — add review progress section
app/features/editor/index.ts                        — add new exports
```

### Implementation sequence

1. **Create `convex/invitations.ts`** — all four functions: `sendInvitations`, `listBySubmission`, `revokeInvitation`, `getReviewProgress`. No schema changes needed — `reviewInvites`, `reviews`, and `notifications` tables already exist.

2. **Create `app/features/editor/review-progress-indicator.tsx`** — small presentational component for the status dots.

3. **Create `app/features/editor/invitation-panel.tsx`** — invitation workflow UI with preview, send, undo toast, and list of sent invitations with progress indicators.

4. **Update `app/features/editor/reviewer-match-panel.tsx`** — add `InvitationPanel` below the match results, passing the selected reviewers' data (name, affiliation, rationale from the match results) and a callback to clear selection after invitations are sent.

5. **Update `app/features/editor/submission-detail-editor.tsx`** — add a "Review Progress" section below the match panel. This shows `getReviewProgress` data with `ReviewProgressIndicator` components. Only renders when invitations exist.

6. **Update `app/features/editor/index.ts`** — add new exports: `InvitationPanel`, `ReviewProgressIndicator`.

7. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`, `useMutation`
- Import from `~/components/ui/` for shadcn components
- Import from relative paths for sibling feature components

### shadcn/ui components to use

- `Card`, `CardContent`, `CardHeader` — notification preview, invitation list (already installed)
- `Badge` — status badges (already installed)
- `Button` — send, revoke, undo actions (already installed)
- `Separator` — section dividers (already installed)
- `Sonner` toast — undo toast for invitation send (check if sonner is installed; if not, `bunx --bun shadcn@latest add sonner`)
- lucide-react icons: `SendIcon`, `MailIcon`, `CircleIcon`, `XIcon`, `CheckCircleIcon`, `ClockIcon`, `AlertCircleIcon`, `UndoIcon`

### Component data flow

```
EditorSubmissionDetail (features/editor/submission-detail-editor.tsx)
  ├─ ReviewerMatchPanel (features/editor/reviewer-match-panel.tsx)
  │    ├─ useQuery(api.matching.getMatchResults)
  │    ├─ ReviewerMatchCard[] — with select/dismiss
  │    └─ InvitationPanel (features/editor/invitation-panel.tsx)
  │         ├─ Props: submissionId, selectedReviewers, onInvitationsSent
  │         ├─ useMutation(api.invitations.sendInvitations)
  │         ├─ useQuery(api.invitations.listBySubmission)
  │         ├─ Notification preview card
  │         ├─ "Send Invitations" button
  │         ├─ Undo toast on success
  │         └─ Sent invitations list with revoke buttons
  │
  └─ ReviewProgressSection (inline in submission-detail-editor.tsx)
       ├─ useQuery(api.invitations.getReviewProgress)
       └─ ReviewProgressIndicator[] (features/editor/review-progress-indicator.tsx)
            ├─ Colored dot (green/amber/red)
            └─ Status label + days since invite
```

### Token generation flow

```
sendInvitations mutation
  ├─ For each reviewer:
  │    ├─ reviewAssignmentId = crypto.randomUUID()
  │    ├─ tokenHash = SHA-256(reviewAssignmentId) via Web Crypto API
  │    ├─ Insert reviewInvites { submissionId, reviewerId, reviewAssignmentId, tokenHash, expiresAt: now + 24h, createdBy }
  │    ├─ Insert reviews { submissionId, reviewerId, status: 'assigned', revision: 0 }
  │    ├─ Insert notifications { recipientId: reviewerId, type: 'reviewer_invitation', subject, body }
  │    └─ Schedule logAction { action: 'reviewer_invited', details }
  └─ Return: array of invite IDs
```

### Notification email preview body template

```
You have been invited to review a paper for the Alignment Journal.

Paper: {title}

Why you: {rationale}

Compensation: $500-$1,500 based on review quality and timeliness.
Deadline: 4 weeks from acceptance.

Accept this invitation: /review/accept/{reviewAssignmentId}

If you are unable to review, please decline promptly so we can find an alternative reviewer.
```

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Web Crypto API not available in Convex runtime | Token hashing fails | Fallback: use a simple deterministic hash function or store the raw UUID (less secure but acceptable for prototype) |
| Duplicate invitation for same reviewer | Wasted invite, confusing UI | Check for existing non-revoked invite before creating |
| Undo toast timing race | User undoes after invitation is already consumed | Revocation still works — the consume flow in Story 4.1 checks `revokedAt` |
| No reviews table records exist yet | Progress monitoring shows nothing | Create `reviews` records on invitation send with `assigned` status |
| Sonner toast not installed | Toast component errors | Check and install if needed |
| Large number of selected reviewers | Slow mutation | Limit to 5 reviewers per batch (matches the match result limit) |

### Dependencies on this story

- **Story 4.1 (Reviewer Invitation Acceptance):** Consumes the `reviewInvites` records, validates token by looking up `tokenHash`, checks `expiresAt`, `consumedAt`, `revokedAt`, and atomically sets `consumedAt`.
- **Story 3.7 (Editorial Decisions):** May reference review progress data for decision-making context.
- **Story 6.3 (In-app Notification Previews):** Full notification preview UI builds on the `notifications` records created here.

### What "done" looks like

- `convex/invitations.ts` exists with `sendInvitations` mutation, `listBySubmission` query, `revokeInvitation` mutation, `getReviewProgress` query
- All new Convex functions define both `args` and `returns` validators
- All functions use `withUser` + `EDITOR_ROLES` authorization
- `sendInvitations` creates `reviewInvites`, `reviews`, and `notifications` records
- Token hash is generated using Web Crypto API (SHA-256 of UUID)
- Duplicate invitation prevention works (same reviewer + same submission + non-revoked)
- Notification body includes paper title, rationale, compensation, deadline, and placeholder link
- `InvitationPanel` component renders inside the match panel when reviewers are selected
- "Send Invitations" button triggers the mutation with undo toast
- Undo revokes all just-created invitations within 10 seconds
- `listBySubmission` shows sent invitations with derived status (pending/accepted/expired/revoked)
- Revoke button works for pending invitations
- Review progress section appears on submission detail page when invitations exist
- Progress indicators show green/amber/red dots based on review status and time elapsed
- Audit log entries are created for `reviewer_invited` and `reviewer_invite_revoked` actions
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The `reviewInvites` schema already exists with the exact fields needed — no migration required.
- The `reviews` table also already exists. Creating review records on invitation enables the progress monitoring to work immediately.
- The `notifications` table exists but no notification-related Convex functions exist yet. This story adds the first writes to that table.
- `crypto.randomUUID()` is available in Convex's V8 runtime (it's a standard Web API). `crypto.subtle.digest` is also available.
- For the undo toast, use `sonner`'s `toast()` function with an `action` callback. Check if `sonner` is installed (`bun pm ls sonner`); if not, add it via `bunx --bun shadcn@latest add sonner`.
- The invitation panel should be visually distinct from the match panel — use a slightly different background or a Card wrapper to delineate the "send" workflow from the "find" workflow.
- The 24-hour TTL for invitations is hardcoded as `Date.now() + 24 * 60 * 60 * 1000`.
- The 7-day threshold for "no response" indicator is computed client-side from `createdAt` — no server-side cron job needed.
- The `reviews` record created on invitation has `revision: 0` and empty `sections` object (`{ summary: undefined, strengths: undefined, ... }` — all fields are optional per schema).
- Since `sendInvitations` creates multiple records in a single mutation, it's transactional (Convex mutations are atomic). If any insert fails, the entire mutation rolls back.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 3 spec | Sprint Agent |
