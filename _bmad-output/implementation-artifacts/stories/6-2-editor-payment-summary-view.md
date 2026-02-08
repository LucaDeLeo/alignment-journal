# Story 6.2: Editor Payment Summary View

## Story

**As an** editor,
**I want** to view per-reviewer payment summaries for each submission and set quality assessments,
**So that** I can track compensation obligations and assess review quality incentives.

## Status

**Epic:** 6 - Payment Tracking & Notifications
**Status:** ready
**Priority:** High (delivers FR45, FR46 — per-reviewer payment summary, display-only payment)
**Depends on:** Story 6.1 (reviewer payment calculation — provides `computePaymentBreakdown`, constants, and `PaymentBreakdown` interface in `convex/payments.ts`)

## Context

This story adds an editor-facing payment summary section to the submission detail page. Editors see a per-reviewer payment table with detailed breakdowns and can set the quality level (standard/excellent) for each reviewer, which updates the payment multiplier in real-time. This replaces the placeholder min/max estimates currently shown in the `DecisionPanel`.

**What exists today:**
- `convex/payments.ts` — `computePaymentBreakdown` pure function, all formula constants (`BASE_FLAT`, `PER_PAGE`, `SPEED_BONUS_PER_WEEK`, `DEADLINE_WEEKS`, `ABSTRACT_BONUS`, `QUALITY_MULTIPLIERS`), `PaymentBreakdown` / `PaymentInput` interfaces, `getPaymentBreakdown` query (reviewer-facing, uses `withReviewer`)
- `convex/decisions.ts` — `getPaymentEstimates` query returning basic min/max ranges (placeholder from Epic 3)
- `app/features/editor/decision-panel.tsx` — `DecisionPanel` renders basic payment estimate ranges using `getPaymentEstimates`
- `app/features/editor/submission-detail-editor.tsx` — `EditorSubmissionDetail` component with all sections (metadata, abstract, authors, keywords, triage, reviewer matching, review progress, decision panel, pipeline progress, audit trail)
- `app/features/editor/index.ts` — barrel exports for editor feature folder
- `convex/schema.ts` — `payments` table with `submissionId`, `reviewerId`, `pageCount`, `qualityLevel` (standard/excellent), `weeksEarly`, `hasAbstractBonus`, timestamps, indexes `by_submissionId` and `by_reviewerId`
- `convex/helpers/auth.ts` — `withUser` HOF wrapper
- `convex/helpers/roles.ts` — `EDITOR_ROLES`
- `convex/helpers/errors.ts` — structured `ConvexError` helpers

**What this story builds:**
1. New `getPaymentSummary` query in `convex/payments.ts` — editor-facing, returns per-reviewer payment breakdowns for a submission (uses `withUser` + `EDITOR_ROLES` check, reuses `computePaymentBreakdown`)
2. New `setQualityLevel` mutation in `convex/payments.ts` — editor sets quality assessment for a reviewer, creates/updates `payments` record
3. New `PaymentSummaryTable` component in `app/features/editor/payment-summary-table.tsx` — per-reviewer payment table with quality level selector and detailed breakdowns
4. Updated `app/features/editor/submission-detail-editor.tsx` — renders `PaymentSummaryTable` section for submissions with reviews
5. Updated `app/features/editor/index.ts` — export `PaymentSummaryTable`
6. Remove `getPaymentEstimates` from `convex/decisions.ts` and remove payment estimates section from `DecisionPanel` (replaced by the new detailed payment summary)

**Key architectural decisions:**

- **Reuses `computePaymentBreakdown` from Story 6.1:** The pure function computes all line items. The editor-facing query calls it for each reviewer, ensuring the same formula is used as the reviewer-facing view (AC3 consistency requirement).

- **Editor query pattern:** Uses `withUser` + manual `EDITOR_ROLES.includes()` check, matching the existing pattern in `convex/decisions.ts` and other editor functions (not the `withEditor` wrapper, which is too restrictive).

- **Quality level mutation:** Creates or updates a `payments` record. If no record exists, inserts with defaults. If it exists, patches the `qualityLevel`. The mutation triggers reactive updates — the payment table recalculates in real-time.

- **Replaces placeholder estimates:** The `getPaymentEstimates` query in `decisions.ts` and its rendering in `DecisionPanel` are removed and replaced by the full `PaymentSummaryTable` shown as a dedicated section in the submission detail page. This avoids duplication and provides the detailed breakdown editors need.

- **Display-only (FR46):** No payment processing or external integrations. The table shows calculated values only.

**Key architectural references:**
- FR45: Editors can view per-reviewer payment summary for each submission
- FR46: Payment information is display-only (no actual payment processing)
- Story 6.1: `convex/payments.ts` with `computePaymentBreakdown`, constants, `PaymentBreakdown` interface

## Acceptance Criteria

### AC1: Payment summary table renders in editor submission detail

**Given** the submission detail page (editor view)
**When** the submission has at least one review
**Then:**
- A "Payment Summary" section renders below the Review Progress section and above the Decision Panel
- It shows a table with one row per reviewer
- Each row shows: reviewer name, review status badge, base pay, quality multiplier, speed bonus, abstract bonus, and total
- If no reviews exist, the section is hidden

### AC2: Quality level selector per reviewer

**Given** the payment summary table
**When** the editor views a reviewer row
**Then:**
- A dropdown/select for quality level shows: "Standard (1x)" and "Excellent (2x)"
- The current value reflects the `payments` record (default: Standard if no record exists)
- Changing the selection calls `setQualityLevel` mutation and the total recalculates reactively in real-time
- Only editors can change quality level (enforced by `withUser` + `EDITOR_ROLES` check)

### AC3: Consistent formula with reviewer-facing calculator

**Given** the payment summary
**When** computed
**Then:**
- All calculations use `computePaymentBreakdown` from `convex/payments.ts` — the same pure function used by the reviewer-facing `PaymentCalculator`
- Formula: total = (base pay x quality multiplier) + speed bonus + abstract bonus
- Base pay = $100 + $20/page
- Speed bonus = $100/week early
- Abstract bonus = $300 if applicable

### AC4: Payment information is display-only

**Given** the payment summary
**When** rendered
**Then:**
- No payment processing or external integrations exist
- No "Pay" or "Send" buttons
- A footer note reads: "Display-only — no payment processing"
- This satisfies FR46

### AC5: `setQualityLevel` mutation creates or updates payments record

**Given** an editor setting quality level for a reviewer
**When** no `payments` record exists for that reviewer/submission pair
**Then:**
- A new `payments` record is inserted with: submissionId, reviewerId, pageCount (from PDF size estimate or default 15), qualityLevel, weeksEarly (0), hasAbstractBonus (false), timestamps
- The payment summary table reflects the new quality level immediately

**Given** an editor setting quality level for a reviewer
**When** a `payments` record already exists
**Then:**
- The existing record is patched with the new qualityLevel and updatedAt
- The payment summary table reflects the change immediately

### AC6: Placeholder payment estimates removed from DecisionPanel

**Given** the submission detail page
**When** the `PaymentSummaryTable` section renders
**Then:**
- The `DecisionPanel` no longer shows the basic "Payment Estimates" section (the min/max ranges)
- The `getPaymentEstimates` query is removed from `convex/decisions.ts`
- The "Estimated ranges. Detailed breakdown available in the payment section." text no longer appears

## Technical Notes

### New query: `getPaymentSummary` in `convex/payments.ts`

**Editor-facing query** (uses `withUser` + `EDITOR_ROLES` check):

- Args: `{ submissionId: v.id('submissions') }`
- Returns: `v.array(v.object({ reviewerId: v.id('users'), reviewerName: v.string(), reviewStatus: v.string(), ...PaymentBreakdown fields }))`
- Implementation:
  1. Validate editor role via `EDITOR_ROLES.includes(ctx.user.role)`
  2. Read all reviews for submission via `by_submissionId` index
  3. Deduplicate by reviewerId (keep most recent, matching `getPaymentEstimates` pattern)
  4. For each reviewer:
     a. Look up `payments` record (filter by reviewerId from `by_submissionId` results)
     b. Look up `reviewerAbstracts` record via `by_submissionId_reviewerId`
     c. Look up submission for PDF file size
     d. Get reviewer name from users table
     e. Call `computePaymentBreakdown(input)` with collected data
  5. Return array of breakdown objects with reviewer metadata

### New mutation: `setQualityLevel` in `convex/payments.ts`

**Editor mutation** (uses `withUser` + `EDITOR_ROLES` check):

- Args: `{ submissionId: v.id('submissions'), reviewerId: v.id('users'), qualityLevel: qualityLevelValidator }`
- Returns: `v.null()`
- Implementation:
  1. Validate editor role
  2. Verify submission exists
  3. Verify review exists for this reviewer/submission
  4. Look up existing `payments` record by submissionId, filter by reviewerId
  5. If exists: `ctx.db.patch` with new `qualityLevel` and `updatedAt`
  6. If not: `ctx.db.insert` with defaults for `pageCount` (from PDF size or 15), `weeksEarly` (0), `hasAbstractBonus` (false)

### New UI component: `app/features/editor/payment-summary-table.tsx`

**`PaymentSummaryTable` component:**
- Props: `submissionId: Id<'submissions'>`
- Calls `useQuery(api.payments.getPaymentSummary, { submissionId })`
- If query returns `undefined` (loading), shows skeleton
- If query returns empty array, returns `null` (section hidden)

**Layout:**
- Section header: dollar sign icon + "Payment Summary" (same style as other section headers in `submission-detail-editor.tsx`)
- Table rows: one per reviewer, showing:
  - Reviewer name + review status badge (using existing `Badge` pattern from `DecisionPanel`)
  - Base pay: "$[amount]" with "(N pages)" subtitle
  - Quality: dropdown Select with "Standard (1x)" / "Excellent (2x)"
  - Speed: "$[amount]" with "(N weeks early)" subtitle
  - Abstract: "$300" or "—"
  - Total: bold value
- Footer: muted text "Display-only — no payment processing"

**Quality selector:**
- Uses shadcn `Select` component
- `onValueChange` calls `setQualityLevel` mutation
- Optimistic: the `useQuery` subscription ensures immediate re-render

### Files to create

```
app/features/editor/payment-summary-table.tsx    — NEW: PaymentSummaryTable component
```

### Files to modify

```
convex/payments.ts                               — MODIFY: add getPaymentSummary query, setQualityLevel mutation
convex/decisions.ts                              — MODIFY: remove getPaymentEstimates query
app/features/editor/decision-panel.tsx           — MODIFY: remove payment estimates section
app/features/editor/submission-detail-editor.tsx — MODIFY: render PaymentSummaryTable section
app/features/editor/index.ts                     — MODIFY: export PaymentSummaryTable
```

### Implementation sequence

1. **Add `getPaymentSummary` query and `setQualityLevel` mutation to `convex/payments.ts`** — reuse `computePaymentBreakdown`, add editor auth checks.

2. **Create `app/features/editor/payment-summary-table.tsx`** — per-reviewer table with quality selector, reactive data.

3. **Update `app/features/editor/submission-detail-editor.tsx`** — add `PaymentSummaryTable` section for submissions with reviews.

4. **Remove `getPaymentEstimates` from `convex/decisions.ts`** — delete the placeholder query.

5. **Update `app/features/editor/decision-panel.tsx`** — remove the payment estimates section (the `paymentEstimates` query call and rendering block). Also remove the `DollarSignIcon` import from lucide-react (it becomes unused after removing the payment estimates rendering).

6. **Update `app/features/editor/index.ts`** — add `PaymentSummaryTable` export.

7. **Verify typecheck, lint, and build** — `bun run typecheck`, `bun run lint`, `bun run build`, `bunx convex dev --once`.

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`, `useMutation`
- Import from `~/components/ui/` for shadcn components
- Import from `~/features/editor` for feature components (barrel export)
- Import from `convex/_generated/api` for API references
- Import from `convex/payments` for shared constants and types
- Import from `convex/helpers/roles` for `EDITOR_ROLES`

### shadcn/ui components to use

- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` — quality level dropdown (check if installed, install if needed via `bunx shadcn@latest add select`)
- `Badge` — review status badges (already installed)
- `Separator` — section separation (already installed)
- lucide-react icons: `DollarSignIcon`

### Component data flow

```
$submissionId.tsx (route)
  └─ <EditorSubmissionDetail>
       ├─ ... (existing sections)
       ├─ <PaymentSummaryTable submissionId={...} />  ← NEW
       │    ├─ useQuery(api.payments.getPaymentSummary, { submissionId })
       │    │    → Array<{ reviewerId, reviewerName, reviewStatus, ...PaymentBreakdown }>
       │    └─ useMutation(api.payments.setQualityLevel)
       │         → Sets quality for a specific reviewer
       ├─ <DecisionPanel />  ← MODIFIED: payment estimates removed
       └─ ... (existing sections)
```

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `getPaymentEstimates` removal breaks imports | Build failure | Search all imports before removing; only `DecisionPanel` uses it |
| No `payments` record for most reviewers | Missing quality selector state | `setQualityLevel` creates record on first use; query shows "Standard" default |
| `Select` component not installed | Build failure | Check `~/components/ui/select.tsx` exists; install if missing |
| Multiple reviews per reviewer | Incorrect counts | Deduplicate by reviewerId (keep most recent), matching existing pattern |
| Speed bonus for in-progress reviews uses server `Date.now()` | Slightly stale | Acceptable for editor view — exact amounts computed at decision time |

### Dependencies on this story

- **Story 6.3 (In-App Notification Previews):** Independent — no dependency on payment summary.
- **Story 7.3 (Seed Data):** Seeds `payments` records, will use `setQualityLevel` or direct insert.

### What "done" looks like

- `convex/payments.ts` has `getPaymentSummary` query with editor auth + `setQualityLevel` mutation
- `getPaymentSummary` uses `computePaymentBreakdown` for each reviewer (same formula as reviewer view)
- `setQualityLevel` creates or updates `payments` record with new `qualityLevel`
- Both new functions define `args` and `returns` validators
- `app/features/editor/payment-summary-table.tsx` exists with per-reviewer table, quality selector, and "Display-only" footer
- `app/features/editor/submission-detail-editor.tsx` renders `PaymentSummaryTable` between Review Progress and Decision Panel
- `app/features/editor/index.ts` exports `PaymentSummaryTable`
- `getPaymentEstimates` removed from `convex/decisions.ts`
- Payment estimates section removed from `DecisionPanel`
- Quality level changes update totals reactively via Convex subscriptions
- Display-only — no payment processing (FR46)
- `bunx convex dev --once` succeeds
- `bun run build` succeeds
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes
- `bun run test` passes (no regressions)

## Dev Notes

- The `computePaymentBreakdown` function from Story 6.1 is already exported and takes a `PaymentInput` object. The editor query just needs to collect the input data for each reviewer and call it.
- The `payments` table schema stores `weeksEarly` and `hasAbstractBonus` but these are input parameters for record-keeping, not used directly by the computation (the computation derives them from review/abstract data). For `setQualityLevel`, set these to 0/false as defaults — they don't affect the computation since `computePaymentBreakdown` derives them from the actual data.
- The `DecisionPanel` currently imports `getPaymentEstimates` from `api.decisions`. After removing it, ensure no other files import it. The `DECISION_NOTE_MAX_LENGTH` constant stays (it's used by the decision note textarea).
- For the quality selector, a simple `Select` dropdown per row is sufficient. No need for a modal or confirmation dialog — this is a non-destructive, immediately-reversible action.
- The payment summary table should render even for submissions not yet in `DECISION_PENDING` status, as long as reviews exist. This lets editors assess payments during the review process, not just at decision time.
- The `getPaymentSummary` query reads from `reviews`, `payments`, `reviewerAbstracts`, `submissions`, and `users` tables. This is 5 table reads but each is a small, indexed query — acceptable for a Convex query.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 6 spec | Sprint Agent |
