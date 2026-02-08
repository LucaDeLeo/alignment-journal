# Story 6.1: Reviewer Payment Calculation and Display

## Story

**As a** reviewer,
**I want** to see a transparent, real-time calculation of my compensation as I progress through the review,
**So that** I understand exactly what I'm earning and why.

## Status

**Epic:** 6 - Payment Tracking & Notifications
**Status:** ready
**Priority:** High (delivers FR44, FR46 — payment formula calculation, display-only payment)
**Depends on:** Story 4.3 (structured review form — review submission/locking creates the review record), Story 5.1 (reviewer abstract drafting — abstract bonus depends on abstract assignment), Story 3.7 (editorial decisions — quality multiplier set by editor)

## Context

This story adds a payment calculation system computed from existing data (reviews, submissions, reviewer abstracts) and a `PaymentCalculator` UI component displayed in the reviewer's workspace. The payment formula is: base ($100 + $20/page) + quality multiplier + speed bonus ($100/week early) + abstract bonus ($300). All calculations are computed on-the-fly in Convex queries — no stored derived payment data.

**What exists today:**
- `convex/schema.ts` — `payments` table with `submissionId`, `reviewerId`, `pageCount`, `qualityLevel` (standard/excellent), `weeksEarly`, `hasAbstractBonus`, timestamps, indexes `by_submissionId` and `by_reviewerId`
- `convex/decisions.ts` — `getPaymentEstimates` query returning basic min/max ranges per reviewer (placeholder for this story's detailed implementation)
- `app/features/editor/decision-panel.tsx` — renders basic payment estimate ranges using `getPaymentEstimates`
- `convex/reviews.ts` — `getSubmissionForReviewer` query returning review + submission data; `listByReviewer` query
- `convex/reviewerAbstracts.ts` — `getBySubmission` query, `createDraft`/`approveAbstract` mutations
- `convex/helpers/auth.ts` — `withUser`, `withReviewer` HOF wrappers
- `convex/helpers/roles.ts` — `EDITOR_ROLES`
- `app/features/review/review-panel.tsx` — tabbed panel with Write Review, Discussion, Abstract, and Guidelines tabs
- `app/features/review/save-indicator.tsx` — `SaveIndicator` component
- `app/routes/review/$submissionId.tsx` — reviewer workspace route with split-view layout
- `app/features/review/index.ts` — barrel exports

**What this story builds:**
1. New `convex/payments.ts` module — payment calculation query for reviewer-facing view
2. New `getPaymentBreakdown` query — computes detailed line-item payment breakdown for a reviewer on a submission
3. New `PaymentCalculator` component in `app/features/review/payment-calculator.tsx` — collapsible footer with counting-up animation
4. Updated `app/routes/review/$submissionId.tsx` — renders `PaymentCalculator` pinned to the bottom of the review panel area
5. Updated `app/features/review/index.ts` — export `PaymentCalculator`

**Key architectural decisions:**

- **Computed on-the-fly, not stored:** The `payments` table in the schema stores input parameters (pageCount, qualityLevel, weeksEarly, hasAbstractBonus) but the actual dollar amounts are computed in the query. This follows FR46 (display-only) and avoids stale data. The `payments` record is created/updated by editor actions (setting quality level, page count) — if no record exists, the query computes from available data with sensible defaults.

- **Formula breakdown (FR44):**
  - Base pay: $100 flat + $20 per page (excluding appendices). `pageCount` comes from the `payments` record or defaults to a reasonable estimate based on PDF file size.
  - Speed bonus: $100 per full week before the 4-week deadline. Computed from review creation date vs submission date. Shows a countdown to the deadline.
  - Quality multiplier: 1x for "standard" (default), 2x for "excellent" (set by editor). Applied to the base pay only.
  - Abstract bonus: $300 if the reviewer has been assigned to write the reviewer abstract (checked via `reviewerAbstracts` table).
  - Total = (base pay * quality multiplier) + speed bonus + abstract bonus.

- **Collapsible footer design:** The `PaymentCalculator` is a fixed footer bar at the bottom of the review workspace (below the resizable panels). Collapsed state shows just the total estimate. Expanded state shows all line items with the formula breakdown. This avoids taking up space in the review panel tabs.

- **Counting-up animation:** When expanding, line item values animate from 0 to their computed value using a simple `requestAnimationFrame`-based counter over 600ms. The total recalculates with a number transition.

- **Reviewer-facing only:** This story focuses on the reviewer's view. Story 6.2 handles the editor's payment summary view.

- **No payment record required:** The query gracefully handles the case where no `payments` record exists for this reviewer/submission pair. It computes what it can from available data (review exists → base pay available, abstract assignment → abstract bonus) and shows "Pending editor assessment" for quality multiplier.

**Key architectural references:**
- FR44: System calculates reviewer compensation using the formula: base ($100 + $20/page) + quality multiplier + speed bonus ($100/week early) + abstract bonus ($300)
- FR46: Payment information is display-only (no actual payment processing)
- UX spec: PaymentCalculator with collapsible breakdown and counting-up animation

## Acceptance Criteria

### AC1: PaymentCalculator renders as collapsible footer
**Given** a reviewer on the review workspace
**When** the PaymentCalculator renders
**Then:**
- It displays as a collapsible bar pinned to the bottom of the review workspace (below the resizable split panels)
- Collapsed state shows: a dollar sign icon, "Estimated Compensation", and the total estimate formatted as currency (e.g., "$820")
- Clicking the bar toggles between collapsed and expanded states
- The bar has a subtle top border and background to distinguish it from the main content

### AC2: Expanded view shows line-item breakdown
**Given** the expanded PaymentCalculator
**When** it renders
**Then:**
- It shows the following line items, each with formula and calculated value:
  - **Base Pay:** "$100 + $20 x [N] pages = $[amount]"
  - **Quality Multiplier:** "[1x standard | 2x excellent] = $[amount]" (or "Pending editor assessment" if not set)
  - **Speed Bonus:** "$100 x [N] weeks early = $[amount]" (with countdown: "[N] days until deadline")
  - **Abstract Bonus:** "$300" (if applicable) or "Not applicable" (if no abstract assignment)
  - **Total:** bold, larger text with the sum
- Each line item has a label on the left and the calculated value on the right

### AC3: Counting-up animation on expand
**Given** the payment display
**When** it first expands
**Then:**
- Line item dollar values animate from $0 to their computed value over ~600ms
- The total value also animates with the counting-up effect
- The animation uses `requestAnimationFrame` for smooth 60fps rendering
- On subsequent collapses/expands, the animation replays

### AC4: Payment calculation computed in Convex query
**Given** the payment calculation
**When** computed
**Then:**
- A `getPaymentBreakdown` query in `convex/payments.ts` computes all values on-the-fly
- It reads from: the `payments` record (if exists), the `reviews` table (for dates), and `reviewerAbstracts` table (for abstract bonus)
- No actual payment processing occurs — display-only (FR46)
- If no `payments` record exists, the query uses defaults: pageCount from submission PDF metadata or a default of 15, qualityLevel "standard", weeksEarly computed from review dates
- The query uses `withReviewer` for authorization (reviewer must be assigned to the submission)

### AC5: Speed bonus countdown
**Given** the review workspace
**When** the payment calculator renders
**Then:**
- The speed bonus line shows a countdown: "N days until 4-week deadline"
- The deadline is computed as review creation date + 28 days
- If the review is already submitted, the speed bonus is locked to the value at submission time
- If the deadline has passed, the speed bonus shows "$0 — deadline passed"
- Weeks early is computed as full weeks between submission date and the deadline

### AC6: Abstract bonus detection
**Given** the payment calculator
**When** checking for abstract bonus
**Then:**
- If a `reviewerAbstracts` record exists for this reviewer and submission, the abstract bonus shows "$300"
- If no abstract assignment exists, the line shows "Not applicable" in muted text
- The abstract bonus is reactive — if an editor assigns the abstract during the session, the bonus appears in real-time

### AC7: Responsive to data changes
**Given** the payment calculator is displayed
**When** underlying data changes (e.g., editor sets quality level, abstract is assigned)
**Then:**
- The displayed values update reactively via Convex subscriptions
- No page refresh is needed
- The total recalculates automatically

## Technical Notes

### New `convex/payments.ts` module

Create a new file (default runtime, no `"use node"`):

1. **Payment formula constants** (exported for reuse in Story 6.2):
```typescript
export const BASE_FLAT = 100
export const PER_PAGE = 20
export const SPEED_BONUS_PER_WEEK = 100
export const DEADLINE_WEEKS = 4
export const ABSTRACT_BONUS = 300
export const QUALITY_MULTIPLIERS = { standard: 1, excellent: 2 } as const
```

2. **`getPaymentBreakdown` query** (uses `withReviewer`):
   - Args: `{ submissionId: v.id('submissions') }`
   - Returns detailed breakdown object:
   ```typescript
   v.object({
     basePay: v.number(),
     pageCount: v.number(),
     qualityMultiplier: v.number(),
     qualityLevel: v.union(v.literal('standard'), v.literal('excellent')),
     qualityAssessed: v.boolean(),
     speedBonus: v.number(),
     weeksEarly: v.number(),
     deadlineMs: v.number(),
     reviewSubmittedAt: v.optional(v.number()),
     abstractBonus: v.number(),
     hasAbstractAssignment: v.boolean(),
     total: v.number(),
   })
   ```
   - Implementation:
     1. Find the review record for this reviewer + submission
     2. Look up the `payments` record (if any) via `by_submissionId` index, filter by reviewerId
     3. Look up `reviewerAbstracts` record via `by_submissionId_reviewerId` compound index (matching existing patterns in `reviewerAbstracts.ts`)
     4. Compute `pageCount`: from payments record, or estimate from `submission.pdfFileSize` (roughly 1 page per 3000 bytes for typical PDFs), default 15
     5. Compute `basePay`: `BASE_FLAT + PER_PAGE * pageCount`
     6. Compute `qualityMultiplier`: from payments record `qualityLevel`, default `standard` (1x)
     7. Compute `deadlineMs`: `review.createdAt + DEADLINE_WEEKS * 7 * 24 * 60 * 60 * 1000`
     8. Compute `weeksEarly`: if review is submitted/locked, `Math.max(0, Math.floor((deadlineMs - (review.submittedAt ?? review.updatedAt)) / (7 * 24 * 60 * 60 * 1000)))`. If not yet submitted, compute from current time (will update reactively).
     9. Compute `speedBonus`: `SPEED_BONUS_PER_WEEK * weeksEarly`
     10. Compute `abstractBonus`: `hasAbstractAssignment ? ABSTRACT_BONUS : 0`
     11. Compute `total`: `basePay * qualityMultiplier + speedBonus + abstractBonus`
     12. Return breakdown object

### New UI component: `app/features/review/payment-calculator.tsx`

**`PaymentCalculator` component:**
- Props: `submissionId: Id<'submissions'>`
- Calls `useQuery(api.payments.getPaymentBreakdown, { submissionId })` for reactive data
- If query returns `undefined` (loading), shows skeleton
- State: `isExpanded: boolean` (default `false`)

**Layout:**
- Fixed bar at the bottom of the workspace (not inside the review panel tabs)
- Collapsed: single row with DollarSignIcon + "Estimated Compensation" + total + ChevronUp/Down icon
- Expanded: all line items in a compact card that expands upward from the bar
- Uses `motion` or CSS transitions for expand/collapse animation

**Counting-up animation hook:**
```typescript
function useCountUp(target: number, duration = 600, active = true): number {
  const [value, setValue] = React.useState(0)

  React.useEffect(() => {
    if (!active) {
      setValue(target)
      return
    }

    let start: number
    let rafId: number

    function step(timestamp: number) {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setValue(Math.round(target * eased))
      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      }
    }

    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration, active])

  return value
}
```

**Deadline countdown:**
- Compute days remaining from `deadlineMs` relative to `Date.now()`
- Update every minute via `setInterval` for live countdown
- Show "N days remaining" or "Deadline passed" text

### Files to create

```
convex/payments.ts                                    — NEW: payment calculation query + constants
app/features/review/payment-calculator.tsx            — NEW: PaymentCalculator component
```

### Files to modify

```
app/routes/review/$submissionId.tsx                   — MODIFY: render PaymentCalculator below split panels
app/features/review/index.ts                          — MODIFY: export PaymentCalculator
```

### Implementation sequence

1. **Create `convex/payments.ts`** — payment constants and `getPaymentBreakdown` query.

2. **Create `app/features/review/payment-calculator.tsx`** — collapsible footer with counting-up animation, line-item breakdown, deadline countdown.

3. **Update `app/routes/review/$submissionId.tsx`** — add `PaymentCalculator` component rendered below the resizable panel group / narrow tabs, pinned to the bottom of the workspace.

4. **Update `app/features/review/index.ts`** — add `PaymentCalculator` export.

5. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`
- Import from `~/components/ui/` for shadcn components
- Import from `~/features/review` for feature components (barrel export)
- Import from `convex/_generated/api` for API references
- Import from `convex/payments` for shared constants

### shadcn/ui components to use

- `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` — expand/collapse (already installed at `~/components/ui/collapsible`)
- `Separator` — between line items (already installed)
- lucide-react icons: `DollarSignIcon`, `ChevronUpIcon`, `ChevronDownIcon`, `ClockIcon`, `AwardIcon`, `StarIcon`, `FileTextIcon`

### Component data flow

```
$submissionId.tsx (route)
  ├─ <div className="flex h-[calc(100vh-3.5rem)] flex-col">
  │    ├─ <WorkspaceHeader />
  │    ├─ <ResizablePanelGroup> or <Tabs> (existing, flex-1)
  │    │    ├─ <PaperPanel />
  │    │    └─ <ReviewPanel />
  │    └─ <PaymentCalculator submissionId={...} />  ← NEW: pinned footer
  │         └─ useQuery(api.payments.getPaymentBreakdown, { submissionId })
  │              → { basePay, pageCount, qualityMultiplier, qualityLevel,
  │                  qualityAssessed, speedBonus, weeksEarly, deadlineMs,
  │                  reviewSubmittedAt, abstractBonus, hasAbstractAssignment, total }
```

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| No `payments` record exists yet | Missing page count, quality level | Query uses sensible defaults (estimate from PDF size, standard quality) |
| Speed bonus calculation stale for live countdown | Inaccurate countdown | Client-side `setInterval` for countdown display; server value is authoritative for dollar amount |
| PDF file size not stored on submission | Can't estimate page count | Fallback to default 15 pages; `pdfFileSize` exists in schema |
| Collapsible animation jank | Poor UX | Use CSS transitions for expand/collapse; rAF for number animation |
| Payment bar covers content | Layout issues | Fixed height bar; content area accounts for bar height via flex layout |

### Dependencies on this story

- **Story 6.2 (Editor Payment Summary View):** Reuses the payment constants and formula from `convex/payments.ts`. Editor-facing query and UI.
- **Story 7.3 (Seed Data):** Seeds `payments` records for demo reviewer payment views.

### What "done" looks like

- `convex/payments.ts` exists with exported constants (`BASE_FLAT`, `PER_PAGE`, `SPEED_BONUS_PER_WEEK`, `DEADLINE_WEEKS`, `ABSTRACT_BONUS`, `QUALITY_MULTIPLIERS`) and `getPaymentBreakdown` query
- `getPaymentBreakdown` query defines both `args` and `returns` validators
- `getPaymentBreakdown` uses `withReviewer` for authorization
- `getPaymentBreakdown` computes all values on-the-fly from existing data (no stored derived amounts)
- `app/features/review/payment-calculator.tsx` exists with collapsible footer, line-item breakdown, counting-up animation, deadline countdown
- `app/routes/review/$submissionId.tsx` renders `PaymentCalculator` below the split panels
- `app/features/review/index.ts` exports `PaymentCalculator`
- Collapsed state shows total estimate; expanded shows full breakdown
- Counting-up animation plays on expand with rAF-based 600ms ease-out
- Speed bonus shows deadline countdown with live updating
- Abstract bonus reactively appears when abstract is assigned
- Display-only — no payment processing (FR46)
- `bunx convex dev --once` succeeds
- `bun run build` succeeds
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The `payments` table already exists in `convex/schema.ts` with all needed fields. No schema changes required.
- The `withReviewer` wrapper handles auth + assignment check. It requires `submissionId` in args and validates the reviewer has a review record for the submission.
- The `getPaymentBreakdown` query should handle the "no payments record" case gracefully — this is expected for new reviews before an editor has assessed quality or set page count.
- For the counting-up animation, use a custom hook rather than a library to avoid adding dependencies. The easing function `1 - (1 - t)^3` provides a smooth ease-out effect.
- The footer bar should be lightweight — not a full card component. A simple `div` with border-top and padding is sufficient.
- The deadline countdown updates client-side (not via Convex reactive query) since `Date.now()` changes every second. The Convex query provides the `deadlineMs` timestamp; the client computes the remaining time.
- The `pdfFileSize` field on submissions stores the file size in bytes (set during upload in Story 2.1). Use `Math.ceil(pdfFileSize / 3000)` as a rough page estimate when no explicit `pageCount` is available.
- Speed bonus `weeksEarly`: for submitted reviews, use `review.submittedAt` as the completion timestamp. For in-progress reviews, compute from `Date.now()` to show a live estimate that decreases as the deadline approaches.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 6 spec | Sprint Agent |
