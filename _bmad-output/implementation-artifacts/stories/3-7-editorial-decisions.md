# Story 3.7: Editorial Decisions

## Story

**As an** editor,
**I want** to make accept, reject, or revision-requested decisions on submissions with audit logging, undo support, and payment estimates,
**So that** the editorial pipeline progresses to resolution with full accountability and transparency.

## Status

**Epic:** 3 - Editor Dashboard & Reviewer Assignment
**Status:** ready
**Priority:** High (seventh and final story of Epic 3, delivers FR26, FR27, FR25 partial)
**Depends on:** Story 3.6 (invitation and progress monitoring — `convex/invitations.ts`, `ReviewProgressIndicator`, review progress on submission detail page), Story 3.3 (audit trail with `logAction` internalMutation, `AuditTimeline` component), Story 3.2 (submission detail view with `StatusTransitionChip`), Story 1.2 (schema with `submissions`, `reviews`, `notifications`, `auditLogs`, `payments` tables, editorial state machine transition map)

## Context

This story completes Epic 3 by adding the final editorial workflow step: making decisions on submissions that have completed their review cycle. When a submission reaches `DECISION_PENDING` status (transitioned from `UNDER_REVIEW` via the existing `StatusTransitionChip`), the editor needs a dedicated decision interface — not just a status dropdown — that captures the decision rationale, creates author notifications, supports undo, and displays payment estimates for reviewers.

**What exists today:**
- `convex/submissions.ts` — `transitionStatus` mutation that validates transitions via `assertTransition` and logs audit entries; `getByIdForEditor` query returning full submission data with PDF URL
- `convex/helpers/transitions.ts` — `VALID_TRANSITIONS` map including `DECISION_PENDING: ['ACCEPTED', 'REJECTED', 'REVISION_REQUESTED']`; `assertTransition` function
- `convex/audit.ts` — `logAction` internalMutation for audit trail entries
- `convex/invitations.ts` — `getReviewProgress` query returning per-reviewer progress indicators
- `convex/schema.ts` — `submissions` table with `decisionNote` field (optional string); `notifications` table; `payments` table with `pageCount`, `qualityLevel`, `weeksEarly`, `hasAbstractBonus`; `reviews` table with `status`, `submittedAt`
- `app/features/editor/status-transition-chip.tsx` — dropdown for status transitions, includes `DeskRejectItem` with `AlertDialog` confirmation pattern
- `app/features/editor/submission-detail-editor.tsx` — editor submission detail page with match panel, review progress, triage display, audit timeline
- `app/features/editor/review-progress-indicator.tsx` — green/amber/red dot component
- `app/features/editor/invitation-panel.tsx` — uses sonner `toast()` with undo action pattern
- `app/features/editor/audit-timeline.tsx` — displays chronological audit entries
- `app/features/editor/index.ts` — barrel exports for all editor components
- `app/components/ui/` — shadcn Button, Card, Badge, Separator, AlertDialog, DropdownMenu already installed
- `sonner` toast — already installed and configured (used in invitation-panel.tsx)

**What this story builds:**
1. New Convex file `convex/decisions.ts` with:
   - `makeDecision` mutation — validates `DECISION_PENDING` status, transitions to target status, stores `decisionNote`, creates author notification, logs audit entry with decision details
   - `undoDecision` mutation — reverts a decision within a 10-second grace period by patching the submission back to `DECISION_PENDING` and clearing `decisionNote`; bypasses the normal transition map since this is a timed undo operation
   - `getPaymentEstimates` query — computes basic per-reviewer payment estimates from `reviews` data for the decision context
2. New UI component `app/features/editor/decision-panel.tsx` — decision workflow with decision type selection, note input, confirmation, undo toast, and payment estimate summary
3. Updated `app/features/editor/submission-detail-editor.tsx` — integrates decision panel when status is `DECISION_PENDING`
4. Updated `app/features/editor/index.ts` — new export

**Key architectural decisions:**

- **Dedicated decision mutation (not `transitionStatus`):** The existing `transitionStatus` is a generic status changer. Decisions need additional behavior: storing a `decisionNote`, creating notifications, and supporting timed undo. A separate `makeDecision` mutation in a new `convex/decisions.ts` file handles this cleanly without bloating the existing submissions module.
- **Undo bypasses transition map:** The transition map intentionally doesn't have reverse paths from `ACCEPTED`/`REJECTED`/`REVISION_REQUESTED` back to `DECISION_PENDING`. The `undoDecision` mutation directly patches the status within a narrow time window (10 seconds, tracked via a `decidedAt` timestamp on the decision audit log). This is a controlled undo operation, not a general-purpose reverse transition.
- **Payment estimates are computed, not stored:** Per FR27 and the Convex "Zen" (compute rather than store derived data), payment estimates are calculated in a query from available data. For this story, we show a simplified estimate per reviewer based on review status. The full detailed PaymentCalculator with line items, quality multiplier editor input, and counting-up animations is deferred to Epic 6 (Stories 6.1 and 6.2).
- **Tier 1 undo toast pattern:** Matches the invitation panel's existing sonner toast pattern. Decision is executed immediately, undo reverts within 10 seconds. The undo toast includes the decision type and countdown.
- **Notification templates:** Author receives an in-app notification for each decision type with appropriate context (paper title, decision, any editor note). No email transport — same pattern as Story 3.6.
- **StatusTransitionChip renders as non-interactive for DECISION_PENDING:** When the `DecisionPanel` is rendered (i.e., `submission.status === 'DECISION_PENDING'`), the `StatusTransitionChip` renders as a non-interactive badge — the same pattern it already uses for terminal states (line 63-68 in `status-transition-chip.tsx`). This avoids duplicate controls: the `DecisionPanel` is the sole decision interface. Implementation: pass an `isDecisionPanelActive` prop to the chip, or simply extend the terminal-state check to include `DECISION_PENDING` when the decision panel handles transitions.

**Key architectural references:**
- Architecture: Editorial state machine with `DECISION_PENDING → ACCEPTED | REJECTED | REVISION_REQUESTED`
- Architecture: Structured `ConvexError` with typed error codes
- Architecture: Tier 1 undo toast with 10-second grace period
- FR26: Editors can make accept/reject decisions on submissions
- FR27: Editors can view payment calculations per reviewer per submission
- FR25: System maintains a full audit trail of editorial actions (decisions logged)
- FR52/FR53: In-app notification previews for decision notifications

## Acceptance Criteria

### AC1: Make editorial decision (Accept)
**Given** a submission in `DECISION_PENDING` status
**When** the editor clicks "Accept" in the decision panel and confirms
**Then:**
- A `makeDecision` mutation is called with `submissionId`, `decision: 'ACCEPTED'`, and optional `decisionNote`
- The submission status transitions to `ACCEPTED`
- The `decisionNote` field on the submission is updated (if provided)
- A `notifications` record is created for the author with type `'decision_accepted'`, subject `'Your submission has been accepted: {title}'`, and body including the paper title and any editor note
- An audit log entry is created via `logAction` with action `'decision_accepted'` and details including the editor's note
- The mutation uses `withUser` wrapper + manual `EDITOR_ROLES.includes(ctx.user.role)` authorization check
- The mutation defines both `args` and `returns` validators
- A Tier 1 undo toast appears with "Accepted. Undo?" and a 10-second grace period

### AC2: Make editorial decision (Reject)
**Given** a submission in `DECISION_PENDING` status
**When** the editor clicks "Reject" in the decision panel, enters a decision note, and confirms
**Then:**
- A `makeDecision` mutation is called with `submissionId`, `decision: 'REJECTED'`, and `decisionNote` (required for rejection)
- The submission status transitions to `REJECTED`
- The `decisionNote` field is stored on the submission
- A `notifications` record is created for the author with type `'decision_rejected'`, subject `'Decision on your submission: {title}'`, and body including the paper title and the editor's reasoning
- An audit log entry is created with action `'decision_rejected'`
- A Tier 1 undo toast appears with "Rejected. Undo?" and a 10-second grace period

### AC3: Make editorial decision (Revision Requested)
**Given** a submission in `DECISION_PENDING` status
**When** the editor clicks "Request Revision" in the decision panel, enters required changes, and confirms
**Then:**
- A `makeDecision` mutation is called with `submissionId`, `decision: 'REVISION_REQUESTED'`, and `decisionNote` containing the required changes
- The submission status transitions to `REVISION_REQUESTED`
- The `decisionNote` field stores the required changes
- A `notifications` record is created for the author with type `'decision_revision_requested'`, subject `'Revisions requested for your submission: {title}'`, and body including the required changes
- An audit log entry is created with action `'decision_revision_requested'`
- A Tier 1 undo toast appears with "Revision requested. Undo?" and a 10-second grace period

### AC4: Undo decision within grace period
**Given** a decision that was just made (Accept, Reject, or Revision Requested)
**When** the editor clicks "Undo" on the toast within 10 seconds
**Then:**
- The `undoDecision` mutation is called with `submissionId` and `previousDecision` (the decision type that was just made)
- The submission status is patched back to `DECISION_PENDING` (bypassing the transition map)
- The `decisionNote` field is cleared
- An audit log entry is created with action `'decision_undone'` and details noting which decision was reversed
- The toast transforms to show "Decision undone" confirmation
- The decision panel re-appears, ready for a new decision
- If the undo is attempted after 10 seconds, it fails gracefully with a toast error "Undo window has expired"

### AC5: Decision panel UI
**Given** a submission in `DECISION_PENDING` status
**When** the editor views the submission detail page
**Then:**
- A "Decision" section appears prominently between the review progress section and the pipeline progress section
- Three decision buttons are displayed: "Accept" (green accent), "Reject" (red accent), "Request Revision" (amber accent)
- Clicking a decision button expands an inline form with:
  - A textarea for the decision note / editor's reasoning
  - For "Reject": the note is required (button disabled until text entered)
  - For "Request Revision": the note is required and labeled "Required Changes"
  - For "Accept": the note is optional and labeled "Editor's Note (optional)"
  - A character counter below the textarea showing remaining characters (2000 max)
  - A "Confirm {Decision}" button and a "Cancel" text button
- The confirm button is disabled while the mutation is in flight
- After the decision, the panel is replaced by the new status badge and the undo toast appears

### AC6: Payment estimate summary
**Given** a submission in `DECISION_PENDING` status with active review assignments
**When** the decision panel renders
**Then:**
- A "Payment Estimates" section appears within the decision panel showing per-reviewer data
- Each reviewer entry displays: reviewer name, review status (submitted/in progress/assigned), and an estimated payment range
- Estimation logic:
  - Review submitted: $600 - $1,500 (base + potential bonuses)
  - Review in progress: $500 - $1,200 (base estimate without completion bonuses)
  - Review assigned (not started): $0 (no review to compensate)
- The estimates use a simple range display (detailed formula breakdown is deferred to Epic 6)
- The query requires editor-level authorization and defines both `args` and `returns` validators

### AC7: Author notification content
**Given** any editorial decision
**When** the notification is created
**Then:**
- The notification record contains:
  - `recipientId`: the submission's `authorId`
  - `submissionId`: the submission ID
  - `type`: `'decision_accepted'` | `'decision_rejected'` | `'decision_revision_requested'`
  - `subject`: appropriate subject line including the paper title
  - `body`: formatted text including paper title, decision outcome, editor's note (if provided), and appropriate next steps
- Accept body template: "Congratulations! Your submission '{title}' has been accepted for publication in the Alignment Journal. {note} The paper will now proceed to the publication pipeline."
- Reject body template: "After careful review, your submission '{title}' has been declined. {note} We encourage you to consider the reviewers' feedback for future submissions."
- Revision body template: "Your submission '{title}' requires revisions before a final decision can be made. Required changes: {note} Please submit a revised version addressing the requested changes."

### AC8: Audit trail integration
**Given** any decision action (accept, reject, revision request, undo)
**When** the action completes
**Then:**
- An audit log entry is created with the appropriate action type:
  - `'decision_accepted'`: details include editor's note snippet
  - `'decision_rejected'`: details include editor's reasoning snippet
  - `'decision_revision_requested'`: details include required changes snippet
  - `'decision_undone'`: details include which decision was reversed
- These entries appear in the existing `AuditTimeline` component on the submission detail page

## Technical Notes

### New file: `convex/decisions.ts`

This file does NOT need `"use node;"` — all operations are standard Convex mutations and queries.

Define the `EDITOR_ROLES` constant at the top of the file (matches the pattern in `convex/submissions.ts:22`, `convex/invitations.ts:12`):

```typescript
const EDITOR_ROLES = ['editor_in_chief', 'action_editor', 'admin'] as const
```

**Functions:**

1. `makeDecision` mutation:
   - Args: `submissionId: v.id('submissions')`, `decision: v.union(v.literal('ACCEPTED'), v.literal('REJECTED'), v.literal('REVISION_REQUESTED'))`, `decisionNote: v.optional(v.string())`
   - Uses `withUser` wrapper + manual `EDITOR_ROLES.includes(ctx.user.role)` check
   - Flow:
     1. Read the submission, validate it exists and is in `DECISION_PENDING` status
     2. Validate: if `decision` is `REJECTED` or `REVISION_REQUESTED`, require `decisionNote` to be non-empty; if `decisionNote` is provided, validate length <= 2000 characters
     3. Use `assertTransition(submission.status, args.decision)` for state machine validation
     4. Patch submission with new status, `decisionNote`, and `updatedAt`
     5. Read the submission to get `authorId` for the notification
     6. Insert `notifications` record with the appropriate template
     7. Schedule `logAction` with the appropriate action and details
   - Returns: `v.object({ submissionId: v.id('submissions'), decision: v.string(), decidedAt: v.number() })`

2. `undoDecision` mutation:
   - Args: `submissionId: v.id('submissions')`, `previousDecision: v.union(v.literal('ACCEPTED'), v.literal('REJECTED'), v.literal('REVISION_REQUESTED'))`, `decidedAt: v.number()`
   - Uses `withUser` wrapper + manual `EDITOR_ROLES.includes(ctx.user.role)` check
   - Flow:
     1. Read the submission, validate its current status matches `previousDecision`
     2. Compute elapsed time: `Date.now() - decidedAt`
     3. If elapsed > 10,000ms (10 seconds), throw `validationError('Undo window has expired')`
     4. Patch submission back to `DECISION_PENDING`, clear `decisionNote`, update `updatedAt`
     5. Schedule `logAction` with action `'decision_undone'`
   - Returns: `v.null()`

3. `getPaymentEstimates` query:
   - Args: `submissionId: v.id('submissions')`
   - Uses `withUser` wrapper + manual `EDITOR_ROLES.includes(ctx.user.role)` check
   - Flow:
     1. Read all `reviews` for the submission via `by_submissionId` index
     2. For each review, resolve reviewer name from `users` table
     3. Compute payment estimate based on review status:
        - `submitted` or `locked`: `{ min: 600, max: 1500, label: 'Submitted' }`
        - `in_progress`: `{ min: 500, max: 1200, label: 'In Progress' }`
        - `assigned`: `{ min: 0, max: 0, label: 'Not Started' }`
   - Returns: `v.array(v.object({ reviewerId: v.id('users'), reviewerName: v.string(), reviewStatus: v.string(), estimateMin: v.number(), estimateMax: v.number() }))`

### New file: `app/features/editor/decision-panel.tsx`

Props: `submissionId: Id<'submissions'>`, `submissionTitle: string`, `onDecisionMade: () => void` (callback to refresh state)

- Uses `useMutation(api.decisions.makeDecision)` for making decisions
- Uses `useMutation(api.decisions.undoDecision)` for undoing decisions
- Uses `useQuery(api.decisions.getPaymentEstimates, { submissionId })` for payment data
- Three-button layout: Accept (primary green), Reject (destructive red), Request Revision (amber outline)
- Inline expandable form per decision type
- Sonner toast with undo action matching the `invitation-panel.tsx` pattern
- Payment estimate table at bottom of panel

### Files to modify

```
convex/decisions.ts                                — NEW: decision mutations + payment query
app/features/editor/decision-panel.tsx             — NEW: decision workflow UI
app/features/editor/submission-detail-editor.tsx   — add decision panel for DECISION_PENDING
app/features/editor/status-transition-chip.tsx     — render as non-interactive badge when DecisionPanel is active
app/features/editor/index.ts                      — add new export
```

### Implementation sequence

1. **Create `convex/decisions.ts`** — all three functions: `makeDecision`, `undoDecision`, `getPaymentEstimates`. No schema changes needed — `submissions.decisionNote` already exists, `notifications` and `auditLogs` tables already exist.

2. **Create `app/features/editor/decision-panel.tsx`** — decision workflow UI with three decision buttons, inline forms, undo toast, and payment estimates section.

3. **Update `app/features/editor/submission-detail-editor.tsx`** — add `DecisionPanel` between the review progress section and the pipeline progress section. Only renders when `submission.status === 'DECISION_PENDING'`. Pass `submissionId` and `submission.title` as props.

4. **Update `app/features/editor/index.ts`** — add new export: `DecisionPanel`.

5. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`, `useMutation`
- Import from `~/components/ui/` for shadcn components
- Import from relative paths for sibling feature components

### shadcn/ui components to use

- `Card`, `CardContent`, `CardHeader` — decision panel container, payment estimate section (already installed)
- `Button` — decision buttons with variant props: `default` (accept), `destructive` (reject), `outline` (revision) (already installed)
- `Badge` — status badges and payment labels (already installed)
- `Textarea` — decision note input (check if installed; if not, `bunx --bun shadcn@latest add textarea`)
- `Separator` — section dividers (already installed)
- `Sonner` toast — undo toast for decisions (already installed and configured)
- lucide-react icons: `CheckCircleIcon`, `XCircleIcon`, `RotateCcwIcon`, `GavelIcon`, `DollarSignIcon`, `UndoIcon`

### Component data flow

```
EditorSubmissionDetail (features/editor/submission-detail-editor.tsx)
  ├─ ReviewerMatchPanel (existing — TRIAGE_COMPLETE/UNDER_REVIEW)
  ├─ ReviewProgress section (existing — when reviews exist)
  │
  ├─ DecisionPanel (features/editor/decision-panel.tsx)
  │    ├─ Props: submissionId, submissionTitle
  │    ├─ useMutation(api.decisions.makeDecision)
  │    ├─ useMutation(api.decisions.undoDecision)
  │    ├─ useQuery(api.decisions.getPaymentEstimates)
  │    ├─ Decision buttons: Accept / Reject / Request Revision
  │    ├─ Inline form with textarea for decision note
  │    ├─ Payment estimate table
  │    └─ Sonner undo toast on decision
  │
  ├─ Pipeline Progress (existing)
  └─ AuditTimeline (existing — decisions appear here)
```

### Decision flow

```
DecisionPanel (DECISION_PENDING status)
  ├─ Editor clicks a decision button (Accept/Reject/Revision)
  │    └─ Inline form expands with textarea + confirm/cancel
  ├─ Editor enters note and confirms
  │    ├─ makeDecision mutation fires
  │    │    ├─ Validates DECISION_PENDING status
  │    │    ├─ assertTransition(DECISION_PENDING, targetStatus)
  │    │    ├─ Patches submission { status, decisionNote, updatedAt }
  │    │    ├─ Inserts notifications record for author
  │    │    └─ Schedules logAction audit entry
  │    ├─ Returns { submissionId, decision, decidedAt }
  │    └─ Shows undo toast (10s grace)
  └─ If undo clicked within 10s
       └─ undoDecision mutation fires
            ├─ Validates current status matches previousDecision
            ├─ Validates elapsed time < 10s
            ├─ Patches submission back to DECISION_PENDING
            └─ Schedules logAction with 'decision_undone'
```

### Notification templates

**Accept:**
```
Congratulations! Your submission '{title}' has been accepted for publication in the Alignment Journal.

{decisionNote ? `Editor's note: ${decisionNote}\n\n` : ''}The paper will now proceed to the publication pipeline. You will receive further instructions regarding the reviewer abstract process.
```

**Reject:**
```
After careful review, your submission '{title}' has been declined for publication in the Alignment Journal.

Editor's feedback: {decisionNote}

We encourage you to consider the reviewers' feedback for future submissions. You may also wish to make the review conversation public, which can be done from your submission page.
```

**Revision Requested:**
```
Your submission '{title}' requires revisions before a final decision can be made.

Required changes:
{decisionNote}

Please submit a revised version addressing the requested changes. Your updated submission will be re-reviewed.
```

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Undo after 10s grace period | User expects undo but window expired | Clear toast countdown + graceful error message on late undo attempt |
| Undo race condition | Decision undone after notification already read by author | Acceptable for prototype — notification is in-app only, not email |
| Payment estimates inaccurate | Editor confused by ranges | Clear "Estimated" label and note that detailed breakdown is in payment section |
| DECISION_PENDING status not reachable | Cannot test decision flow | Existing StatusTransitionChip handles UNDER_REVIEW → DECISION_PENDING transition |
| Textarea component not installed | Build fails | Check and install via shadcn CLI if needed |
| Decision note too long | UI overflow | Limit textarea to 2000 chars with character counter |

### Dependencies on this story

- **Story 4.4 (Semi-Confidential Threaded Discussion):** May reference decision status to determine identity visibility rules (accept reveals, reject keeps confidential)
- **Story 5.1 (Reviewer Abstract Drafting):** Triggered after accept decision — reviewer abstract flow starts when status is ACCEPTED
- **Story 6.1 (Reviewer Payment Calculation):** Builds detailed payment formula on top of the basic estimates shown here
- **Story 6.2 (Editor Payment Summary View):** Full per-reviewer payment table with quality multiplier input replaces the basic estimates
- **Story 6.3 (In-app Notification Previews):** Full notification preview UI builds on the `notifications` records created here

### What "done" looks like

- `convex/decisions.ts` exists with `makeDecision` mutation, `undoDecision` mutation, `getPaymentEstimates` query
- All new Convex functions define both `args` and `returns` validators
- All functions use `withUser` + `EDITOR_ROLES` authorization
- `makeDecision` validates `DECISION_PENDING` status, uses `assertTransition`, stores `decisionNote`, creates notifications, logs audit
- Reject and Revision Request require a non-empty `decisionNote`
- Accept allows an optional `decisionNote`
- `undoDecision` validates time window (10s) and reverts status to `DECISION_PENDING`
- Undo beyond 10s throws a validation error with user-friendly message
- `getPaymentEstimates` returns per-reviewer payment ranges based on review status
- `DecisionPanel` component renders on the submission detail page when status is `DECISION_PENDING`
- Three decision buttons with inline form expansion (Accept/Reject/Request Revision)
- Undo toast appears after each decision with 10-second grace period
- Payment estimates section shows per-reviewer data with ranges
- Notifications are created for the author with appropriate templates per decision type
- Audit log entries are created for all decision actions including undos
- All decision actions and undos appear in the existing `AuditTimeline` component
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The `submissions` schema already has `decisionNote: v.optional(v.string())` — no schema changes needed.
- The `notifications` table exists and is written to by Story 3.6 for invitation notifications. This story adds decision notification writes.
- `sonner` toast is already installed and configured (used in `invitation-panel.tsx`). The undo toast pattern is proven.
- The `StatusTransitionChip` should render as a non-interactive badge when `submission.status === 'DECISION_PENDING'` and the `DecisionPanel` is present. Extend the existing terminal-state check (which already renders a static `<Badge>` when `validTransitions.length === 0`) by also checking for `DECISION_PENDING` when passed an `isDecisionPanelActive` prop. This prevents duplicate decision controls.
- For the undo grace period, use the `decidedAt` timestamp returned by `makeDecision`. The client stores this and passes it to `undoDecision`. The server validates `Date.now() - decidedAt <= 10000`.
- The `undoDecision` mutation does NOT call `assertTransition` — it directly patches the status. This is intentional: the transition map has no reverse paths from terminal states, and the 10-second window makes this a controlled undo operation.
- The payment estimate ranges are intentionally broad ($600-$1,500 for submitted reviews). The detailed formula with page counts, quality multipliers, and speed bonuses is deferred to Epic 6 where dedicated stories handle the full PaymentCalculator component.
- `Textarea` from shadcn/ui may need to be installed: check `app/components/ui/textarea.tsx`. If missing, run `bunx --bun shadcn@latest add textarea`.
- The decision panel should be visually prominent — use a Card with a distinct border to separate it from the rest of the submission detail page. Consider using mode-specific colors (green border for accept context, red for reject, amber for revision).

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 3 spec | Sprint Agent |
