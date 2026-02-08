# Story 4.3: Structured Review Form with Auto-Save

## Story

**As a** reviewer,
**I want** to write a structured review with auto-saving sections,
**So that** I can provide a thorough assessment without worrying about losing my work.

## Status

**Epic:** 4 - Review Process & Semi-Confidential Discussion
**Status:** ready
**Priority:** High (delivers FR29, core reviewer writing experience)
**Depends on:** Story 4.2 (split-view workspace, `ReviewPanel` placeholder, `ProgressRing` placeholder, `getSubmissionForReviewer` query, `startReview` mutation, `reviews` table schema with sections/revision/status), Story 4.1 (reviewer invitation acceptance, reviewer role, review records), Story 1.2 (schema with `reviews` table), Story 1.4 (review route layout with role guard)

## Context

This story replaces the placeholder "Write Review" tab content in the review panel with a fully functional structured review form. The form has 5 sections (Summary, Strengths, Weaknesses, Questions, Recommendation) with auto-save, progress tracking, and a pre-submission confirmation flow. This is the core reviewer writing experience — it must feel like document composition, not form filling.

**What exists today:**
- `app/features/review/review-panel.tsx` — tabbed panel with placeholder "Review form coming in the next update" card in the Write tab
- `app/features/review/progress-ring.tsx` — SVG progress ring accepting `completed` and `total` props, currently hardcoded to 0/5 from the Write tab placeholder
- `app/routes/review/$submissionId.tsx` — workspace route rendering `<ReviewPanel />` with no props
- `convex/reviews.ts` — `listByReviewer`, `getSubmissionForReviewer`, `startReview` (no section update or submit mutations)
- `convex/schema.ts` — `reviews` table with `sections: { summary?, strengths?, weaknesses?, questions?, recommendation? }`, `status` (assigned/in_progress/submitted/locked), `revision: number`, `submittedAt?`, `lockedAt?`
- `convex/helpers/errors.ts` — `versionConflictError()` helper returning structured `VERSION_CONFLICT` error
- `convex/helpers/auth.ts` — `withReviewer` HOF (assignment-aware: reviewer role + matching review record)
- `app/components/ui/textarea.tsx` — shadcn/ui Textarea component (already installed)
- `app/components/ui/badge.tsx` — Badge component (already installed)
- `app/components/ui/collapsible.tsx` — Collapsible component (already installed)
- `app/components/ui/alert-dialog.tsx` — AlertDialog for confirmation (already installed)
- `app/components/ui/tabs.tsx` — Tabs component used in review panel
- `app/components/ui/separator.tsx` — Separator component (already installed)

**What this story builds:**
1. New `updateSection` mutation in `convex/reviews.ts` — auto-saves a single review section with optimistic concurrency (revision check)
2. New `submitReview` mutation in `convex/reviews.ts` — transitions review to `submitted` status with validation, sets `submittedAt` and schedules auto-lock
3. New `lockReview` internalMutation in `convex/reviews.ts` — auto-locks review after 15-minute Tier 2 edit window
4. New `ReviewForm` component in `app/features/review/review-form.tsx` — the structured 5-section form with auto-save
5. New `ReviewSectionField` component in `app/features/review/review-section-field.tsx` — individual section with status badge, word count, guidance
6. New `SaveIndicator` component in `app/features/review/save-indicator.tsx` — persistent save status display
7. New `PreSubmitSummary` component in `app/features/review/pre-submit-summary.tsx` — full review preview before submission
8. Updated `ReviewPanel` to accept review data props and render the form
9. Updated workspace route to pass review data through to `ReviewPanel`
10. Wired `ProgressRing` to actual section completion count

**Key architectural decisions:**

- **Section-level auto-save with optimistic concurrency:** Each section saves independently via `updateSection` mutation. The mutation checks the `revision` field — if the server revision doesn't match the expected revision, a `VERSION_CONFLICT` error is thrown. The frontend preserves the local draft and shows merge/reload options. The mutation increments `revision` on every successful write. This prevents silent overwrites in multi-tab scenarios.
- **500ms debounce for auto-save:** Each section has its own debounce timer. Typing in one section doesn't reset another section's pending save. The debounce uses a ref-based pattern to avoid stale closures.
- **Optimistic update on the Convex client:** The `updateSection` mutation uses Convex's `withOptimisticUpdate` to update the local cache immediately. The UI shows "Saving..." during the network round-trip and "Saved" when confirmed. If the mutation fails (e.g., version conflict), the optimistic update is rolled back automatically by Convex.
- **Section completion detection:** A section is "complete" if it contains at least 10 words. The `ProgressRing` counts completed sections (0-5). The recommendation section is "complete" if it's non-empty (any content counts since it's a structured choice).
- **Pre-submission summary:** Before final submit, a dialog shows the full review in readable format with word counts per section and a completeness check. All 5 sections must have content to submit. The submit button is disabled until all sections are filled.
- **15-minute Tier 2 edit window:** After submission, the reviewer can still edit for 15 minutes. A `ctx.scheduler.runAfter(15 * 60 * 1000, ...)` call schedules `lockReview` internal mutation. During the edit window, the UI shows a countdown. After lock, sections become read-only with a message about using the discussion thread for addenda.
- **No rich text / markdown for prototype:** The UX spec mentions "markdown support" but for prototype scope, plain text areas with Newsreader font are sufficient. The text areas feel like document composition through typography (Newsreader serif, generous line height) rather than through editor features. This avoids the complexity of a rich text editor library.

**Key architectural references:**
- UX spec: `ReviewSectionForm` — section header (Satoshi), status badge, rich text area (Newsreader), word count, collapsible guidance
- UX spec: Auto-save pattern — 500ms debounce, "Saved" / "Saving..." / "Offline" indicator
- UX spec: Pre-submission summary — readable format, word count, completeness check
- UX spec: Tier 2 edit window — 15 minutes after submit review, then locked
- UX spec: Spring animation 200ms on submit confirmation
- FR29: Structured reviews with summary, strengths, weaknesses, questions, recommendation
- Architecture: `withReviewer` HOF for assignment-aware auth
- Architecture: `revision` field for optimistic concurrency control

## Acceptance Criteria

### AC1: Structured review form with 5 sections
**Given** the review workspace at `/review/$submissionId` with a review in `in_progress` status
**When** the "Write Review" tab renders
**Then:**
- The form displays 5 sections in order: Summary, Strengths, Weaknesses, Questions, Recommendation
- Each section has: a header label (Satoshi `font-medium`), a status badge ("Not started" / "In progress" / "Complete"), a text area (Newsreader font, `text-lg`, `leading-[1.7]`), a word count indicator (muted text), and collapsible guidance text (italic, muted)
- Sections are laid out vertically with `space-y-6` between them
- Text areas use Newsreader serif font to feel like document composition, not form filling
- The form fills the available review panel height via `ScrollArea`
- Each section is a `fieldset` with `legend` for accessibility
- Status badges use semantic styling: gray for "Not started", accent for "In progress", green for "Complete"

### AC2: Auto-save with 500ms debounce
**Given** a reviewer typing in any review section
**When** they pause typing for 500ms
**Then:**
- An `updateSection` mutation is called with the section name, content, and expected revision number
- The save indicator shows "Saving..." during the mutation
- On success, the save indicator shows "Saved" with a subtle check icon
- The mutation increments the `revision` field on the review document
- Each section has its own independent debounce timer
- Typing in one section does not cancel the pending save for another section
- The mutation uses `withReviewer` wrapper for assignment-aware auth
- The mutation defines both `args` and `returns` validators
- The `updateSection` mutation only allows saves when review status is `in_progress` or `submitted` (within edit window)

### AC3: Optimistic updates for instant UI feedback
**Given** an auto-save triggered by the debounce
**When** the mutation is called
**Then:**
- The local Convex cache is updated immediately via `withOptimisticUpdate` so the UI reflects changes without waiting for the server round-trip
- If the mutation succeeds, the optimistic update is confirmed
- If the mutation fails (e.g., version conflict), the optimistic update is rolled back automatically by Convex
- The text area content always reflects the latest local input (never reverts to stale server state on successful saves)

### AC4: Version conflict handling
**Given** an auto-save where the server's `revision` doesn't match the expected revision
**When** the `updateSection` mutation detects the mismatch
**Then:**
- The mutation throws a `VERSION_CONFLICT` error (using the existing `versionConflictError()` helper)
- The frontend catches the error and preserves the local draft text (does not discard the user's work)
- An alert banner appears below the section: "This section was updated elsewhere. [Reload server version] [Keep my version]"
- "Reload server version" discards local changes and reloads from the reactive query
- "Keep my version" retries the save with the current server revision (force-save)
- The save indicator shows an amber warning state during conflict

### AC5: Progress ring wired to actual section completion
**Given** the reviewer has content in some review sections
**When** the review panel renders
**Then:**
- The `ProgressRing` in the panel header updates to show the count of completed sections (e.g., "3/5")
- A section is "complete" when it contains at least 10 words (for summary, strengths, weaknesses, questions) or any non-empty content (for recommendation)
- A section is "in progress" when it has content but fewer than 10 words
- The progress count updates reactively as the reviewer types (via local state, not waiting for server confirmation)
- The `ReviewPanel` receives the review data as props and computes completion from sections

### AC6: Pre-submission summary and submit flow
**Given** the reviewer has content in all 5 sections
**When** they click the "Submit Review" button
**Then:**
- An `AlertDialog` opens showing the full review in a readable format:
  - Each section displayed with its header and content
  - Word count per section shown in muted text
  - Total word count summary
  - A completeness indicator (all sections filled)
- The dialog has "Cancel" and "Submit Review" buttons
- The "Submit Review" button is disabled if any section is empty
- On confirm, a `submitReview` mutation is called that:
  - Validates all 5 sections have content
  - Sets review `status` to `submitted`
  - Sets `submittedAt` to `Date.now()`
  - Schedules `lockReview` internal mutation to run after 15 minutes
  - Increments the `revision`
  - Uses `withReviewer` wrapper
  - Defines both `args` and `returns` validators
- On success, the form transitions to a "submitted" state with a confirmation message
- The confirmation includes: "Review submitted successfully", current payment estimate area (placeholder text for future story), and "You can edit your review for the next 15 minutes"

### AC7: 15-minute Tier 2 edit window after submission
**Given** a review in `submitted` status within the 15-minute edit window
**When** the reviewer views the review form
**Then:**
- The form remains editable (auto-save continues to work)
- A banner shows: "Review submitted. You can make edits for the next [MM:SS]" with a live countdown timer
- The countdown updates every second, computed from `submittedAt + 15 minutes`
- When the countdown reaches zero, the `lockReview` internal mutation runs (scheduled by `submitReview`)
- The `lockReview` mutation sets `status` to `locked` and `lockedAt` to `Date.now()`
- After locking, the form becomes read-only with a message: "Review locked. Use the discussion thread for any addenda."
- The `updateSection` mutation rejects saves when status is `locked`

### AC8: Save indicator component
**Given** the review form header area
**When** it renders
**Then:**
- A persistent save indicator displays next to the progress ring
- States: "Saved" (muted text + check icon), "Saving..." (muted text + animated spinner), "Error" (amber text + warning icon with retry hint)
- The indicator reflects the most recent save operation across all sections
- The indicator uses `aria-live="polite"` for screen reader announcements

## Technical Notes

### No schema changes required

The `reviews` table already has all needed fields: `sections` with all 5 optional string fields, `status` with all 4 states, `revision` for optimistic concurrency, `submittedAt` and `lockedAt` for the edit window.

### Update existing `getSubmissionForReviewer` query

The existing `getSubmissionForReviewer` query in `convex/reviews.ts` returns the review object with `{ _id, status, sections, revision }` but does NOT include `submittedAt`. This story needs `submittedAt` for the AC7 edit window countdown timer. Update the query:
- Add `submittedAt: v.optional(v.number())` to the review object in the `returns` validator
- Add `submittedAt: review.submittedAt` to the handler's review return object

### New Convex functions in `convex/reviews.ts`

Add to the existing `convex/reviews.ts` file (default runtime, no `"use node"`):

1. **`updateSection` mutation** (uses `withReviewer`):
   - Args: `{ submissionId: v.id('submissions'), section: v.union(v.literal('summary'), v.literal('strengths'), v.literal('weaknesses'), v.literal('questions'), v.literal('recommendation')), content: v.string(), expectedRevision: v.number() }`
   - Looks up review via `by_submissionId_reviewerId` index
   - Guards: review must exist, status must be `in_progress` or `submitted`
   - If `review.revision !== expectedRevision`, throws `versionConflictError()`
   - Patches the specific section and increments `revision`, sets `updatedAt`
   - Returns: `v.object({ revision: v.number() })` (new revision for the client to track)

2. **`submitReview` mutation** (uses `withReviewer`):
   - Args: `{ submissionId: v.id('submissions'), expectedRevision: v.number() }`
   - Looks up review via `by_submissionId_reviewerId` index
   - Guards: review must exist, status must be `in_progress`, all 5 sections must have non-empty content
   - If any section is empty, throws `validationError('All sections must be completed before submitting')`
   - Patches: `status: 'submitted'`, `submittedAt: Date.now()`, `revision: review.revision + 1`, `updatedAt: Date.now()`
   - Schedules `lockReview` via `ctx.scheduler.runAfter(15 * 60 * 1000, internal.reviews.lockReview, { reviewId: review._id })`
   - Returns: `v.null()`

3. **`lockReview` internalMutation**:
   - Args: `{ reviewId: v.id('reviews') }`
   - Fetches review by ID
   - Only locks if status is still `submitted` (idempotent — no-op if already locked or other state)
   - Patches: `status: 'locked'`, `lockedAt: Date.now()`, `updatedAt: Date.now()`
   - Returns: `v.null()`

### New UI components in `app/features/review/`

1. **`review-form.tsx`** — `ReviewForm` component:
   - Props: `sections` (the 5 section strings), `reviewId`, `submissionId`, `revision`, `status`, `submittedAt`
   - Manages local state for each section (initialized from server data)
   - Per-section debounce timers via refs
   - Calls `updateSection` mutation on debounce
   - Uses `withOptimisticUpdate` on the mutation for instant cache updates
   - Tracks save state per section: 'idle' | 'saving' | 'saved' | 'error' | 'conflict'
   - Computes section completion for `ProgressRing`
   - Shows "Submit Review" button when status is `in_progress`
   - Shows edit window countdown when status is `submitted`
   - Shows read-only view when status is `locked`

2. **`review-section-field.tsx`** — `ReviewSectionField` component:
   - Props: `name`, `label`, `guidance`, `value`, `onChange`, `status` ('not-started' | 'in-progress' | 'complete'), `disabled`, `conflictState?`
   - Renders: section header with status badge, Newsreader text area, word count, collapsible guidance
   - The text area uses `font-serif text-lg leading-[1.7]` for Newsreader styling
   - Word count computed from `value.trim().split(/\s+/).filter(Boolean).length`
   - Status badge: gray "Not started", accent "In progress", green "Complete"
   - Guidance text uses `Collapsible` component (already installed)
   - Conflict state renders alert banner with reload/keep options

3. **`save-indicator.tsx`** — `SaveIndicator` component:
   - Props: `state` ('idle' | 'saving' | 'saved' | 'error')
   - Renders: "Saved" with check, "Saving..." with spinner animation, "Error" with warning icon
   - Uses `aria-live="polite"` for accessibility

4. **`pre-submit-summary.tsx`** — `PreSubmitSummary` component:
   - Props: `sections`, `open`, `onOpenChange`, `onConfirm`, `isSubmitting`
   - Renders within `AlertDialog`: full review content per section, word counts, total word count, completeness check
   - "Cancel" and "Submit Review" buttons

### Files to create

```
app/features/review/review-form.tsx             — NEW: structured review form with auto-save
app/features/review/review-section-field.tsx     — NEW: individual section component
app/features/review/save-indicator.tsx           — NEW: save status display
app/features/review/pre-submit-summary.tsx       — NEW: pre-submission review summary dialog
```

### Files to modify

```
convex/reviews.ts                                — MODIFY: add updateSection, submitReview, lockReview; update getSubmissionForReviewer to return submittedAt
app/features/review/review-panel.tsx             — MODIFY: replace placeholder with ReviewForm
app/features/review/index.ts                     — MODIFY: export new components
app/routes/review/$submissionId.tsx              — MODIFY: pass review data to ReviewPanel
```

### Implementation sequence

1. **Update `convex/reviews.ts`** — add `updateSection`, `submitReview` mutations and `lockReview` internalMutation. Also update the existing `getSubmissionForReviewer` query to include `submittedAt: v.optional(v.number())` in the review return object (needed for edit window countdown).

2. **Create `app/features/review/save-indicator.tsx`** — simple save status component.

3. **Create `app/features/review/review-section-field.tsx`** — the individual section field with text area, badge, word count, guidance, conflict UI.

4. **Create `app/features/review/pre-submit-summary.tsx`** — the pre-submit dialog.

5. **Create `app/features/review/review-form.tsx`** — the main form component wiring all sections, debounce, auto-save, submit flow.

6. **Update `app/features/review/review-panel.tsx`** — replace the Write tab placeholder with `<ReviewForm>`, wire props.

7. **Update `app/features/review/index.ts`** — add new exports.

8. **Update `app/routes/review/$submissionId.tsx`** — pass review data (sections, revision, status, submittedAt, reviewId, submissionId) as props to `<ReviewPanel>`.

9. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`, `useMutation`
- Import from `@tanstack/react-router` for router utilities
- Import from `~/components/ui/` for shadcn components
- Import from `~/features/review` for feature components (barrel export)
- Import from `convex/_generated/api` for API references

### shadcn/ui components to use

- `Textarea` — review section text areas (already installed)
- `Badge` — section status badges (already installed)
- `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` — guidance text (already installed)
- `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger` — pre-submit confirmation (already installed)
- `Separator` — between sections and in summary (already installed)
- `Button` — submit button, conflict resolution actions (already installed)
- `ScrollArea` — form scrolling (already installed)
- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` — existing review panel tabs (already installed)
- lucide-react icons: `CheckIcon`, `LoaderIcon`, `AlertTriangleIcon`, `ChevronDownIcon`, `SendIcon`, `LockIcon`, `ClockIcon`

### Component data flow

```
$submissionId.tsx (route)
  ├─ useQuery(api.reviews.getSubmissionForReviewer) → { submission, review }
  ├─ <ReviewPanel
  │    reviewId={review._id}
  │    submissionId={submission._id}
  │    sections={review.sections}
  │    revision={review.revision}
  │    status={review.status}
  │    submittedAt={review.submittedAt}
  │  />
  │    ├─ Tab "Write Review":
  │    │    ├─ <ProgressRing completed={completedCount} total={5} />
  │    │    ├─ <SaveIndicator state={globalSaveState} />
  │    │    └─ <ReviewForm ...props />
  │    │         ├─ <ReviewSectionField name="summary" ... />
  │    │         ├─ <ReviewSectionField name="strengths" ... />
  │    │         ├─ <ReviewSectionField name="weaknesses" ... />
  │    │         ├─ <ReviewSectionField name="questions" ... />
  │    │         ├─ <ReviewSectionField name="recommendation" ... />
  │    │         ├─ <Button>Submit Review</Button>
  │    │         └─ <PreSubmitSummary ... /> (AlertDialog)
  │    ├─ Tab "Discussion": placeholder (Story 4.4)
  │    └─ Tab "Guidelines": static content
```

### Section guidance text

| Section | Placeholder | Guidance |
|---------|------------|----------|
| Summary | "Summarize the paper's main contribution..." | "Describe the paper's central argument, methodology, and contribution to theoretical AI alignment research. Focus on what the paper attempts to do and how it approaches the problem." |
| Strengths | "Identify specific strengths..." | "Highlight specific methodological, argumentative, or conceptual strengths. Be concrete — cite specific sections, theorems, or examples that demonstrate quality." |
| Weaknesses | "Point out weaknesses with suggestions..." | "Identify gaps, logical issues, or areas needing improvement. For each weakness, suggest a concrete path to resolution. Constructive criticism helps authors improve their work." |
| Questions | "Raise substantive questions..." | "Ask questions that could strengthen the work if addressed. These might probe assumptions, request clarification of methodology, or suggest additional considerations." |
| Recommendation | "Provide your recommendation..." | "State your recommendation (accept, minor revisions, major revisions, reject) with supporting rationale. Explain what specifically would need to change for a different recommendation." |

### Optimistic update pattern

```typescript
const updateSection = useMutation(api.reviews.updateSection).withOptimisticUpdate(
  (localStore, args) => {
    const currentData = localStore.getQuery(api.reviews.getSubmissionForReviewer, {
      submissionId: args.submissionId,
    })
    if (currentData) {
      localStore.setQuery(api.reviews.getSubmissionForReviewer, {
        submissionId: args.submissionId,
      }, {
        ...currentData,
        review: {
          ...currentData.review,
          sections: {
            ...currentData.review.sections,
            [args.section]: args.content,
          },
          revision: args.expectedRevision + 1,
        },
      })
    }
  }
)
```

### Debounce pattern

Use a ref-based debounce per section to avoid stale closure issues:

```typescript
const timersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({})

function handleSectionChange(section: string, content: string) {
  // Update local state immediately
  setLocalSections(prev => ({ ...prev, [section]: content }))

  // Clear existing timer for this section
  if (timersRef.current[section]) {
    clearTimeout(timersRef.current[section])
  }

  // Set new debounce timer
  timersRef.current[section] = setTimeout(() => {
    void saveSection(section, content)
  }, 500)
}
```

### Edit window countdown

When `status === 'submitted'` and `submittedAt` exists, compute remaining time:

```typescript
const EDIT_WINDOW_MS = 15 * 60 * 1000

function useEditCountdown(submittedAt: number | undefined) {
  const [remaining, setRemaining] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (!submittedAt) return
    const deadline = submittedAt + EDIT_WINDOW_MS
    const tick = () => {
      const left = Math.max(0, deadline - Date.now())
      setRemaining(left)
      if (left <= 0) return
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [submittedAt])

  return remaining
}
```

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rapid typing causes many mutation calls despite debounce | Unnecessary server load | 500ms debounce is industry-standard; Convex handles concurrent mutations well |
| Version conflict on simultaneous multi-tab editing | User loses context of conflict | Preserve local draft, show clear merge/reload UI, never silently overwrite |
| `lockReview` scheduler fires before reviewer finishes editing in window | Review locked prematurely | The 15-minute window is generous; scheduler is the source of truth for consistency |
| Large review text exceeds Convex document size limits | Save fails | Convex documents support up to 1MB; reviews are unlikely to approach this limit |
| `withOptimisticUpdate` rollback on version conflict confuses user | Text appears to revert | Catch the error, restore from local state, show conflict UI before Convex rollback is visible |
| Text area performance with very long content | Laggy typing experience | Newsreader textarea is plain text (no rich text editor overhead); React Compiler optimizes re-renders |

### Dependencies on this story

- **Story 4.4 (Semi-Confidential Discussion):** The "Discussion" tab remains as placeholder — unchanged by this story.
- **Story 5.1 (Reviewer Abstract):** Uses the `submitted` review status to determine when a reviewer is eligible for abstract drafting.
- **Story 6.1 (Payment Calculation):** Uses the `submitted` / `locked` status to include the review in payment calculations.

### What "done" looks like

- `convex/reviews.ts` has `updateSection`, `submitReview` mutations and `lockReview` internalMutation
- All new Convex functions define `args` and `returns` validators
- `app/features/review/review-form.tsx` exists with structured 5-section form
- `app/features/review/review-section-field.tsx` exists with text area, status badge, word count, guidance
- `app/features/review/save-indicator.tsx` exists with Saved/Saving/Error states
- `app/features/review/pre-submit-summary.tsx` exists with AlertDialog pre-submit review
- `app/features/review/review-panel.tsx` updated to render `ReviewForm` in Write tab instead of placeholder
- `app/features/review/index.ts` updated to export new components
- `app/routes/review/$submissionId.tsx` passes review data as props to `ReviewPanel`
- `ProgressRing` shows actual section completion count (0-5)
- Auto-save fires at 500ms debounce per section
- Optimistic updates provide instant UI feedback
- Version conflict shows merge/reload options (never silent overwrite)
- Pre-submission summary dialog shows full review with word counts
- Submit transitions review to `submitted` status and schedules 15-minute lock
- Edit window countdown shows remaining time after submission
- Locked reviews display read-only with message about discussion thread
- Sections use Newsreader serif font for document composition feel
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The `withReviewer` wrapper in `convex/helpers/auth.ts` requires both reviewer role AND a matching `reviews` record for the `submissionId`. It passes `ctx.user` on the context. Reuse it for `updateSection` and `submitReview`.
- The `versionConflictError()` helper already exists in `convex/helpers/errors.ts`. Import and use it in `updateSection` when `review.revision !== expectedRevision`.
- The `validationError()` helper already exists for the submit validation check.
- Convex's `withOptimisticUpdate` works on the `useMutation` return value. It receives the `localStore` and the mutation `args`. Use `localStore.getQuery` / `localStore.setQuery` to update the cached query result for `getSubmissionForReviewer`.
- For the `lockReview` internalMutation, use `import { internal } from './_generated/api'` and `import { internalMutation } from './_generated/server'`. The scheduler call is `ctx.scheduler.runAfter(ms, internal.reviews.lockReview, { reviewId })`.
- The `Textarea` component from shadcn/ui uses `field-sizing-content` which auto-sizes based on content. Override with `min-h-[120px]` for a comfortable starting size and `resize-y` for manual resize.
- The `Collapsible` component from shadcn/ui wraps Radix UI Collapsible. Use `CollapsibleTrigger` with a chevron icon for the guidance text toggle.
- Section status computation: count words with `value.trim().split(/\s+/).filter(Boolean).length`. Less than 1 word = "not-started", 1-9 words = "in-progress", 10+ words = "complete". Recommendation section: any non-empty content = "complete".
- The `ScrollArea` wrapping already exists in `review-panel.tsx`. The `ReviewForm` renders inside it.
- When updating `review-panel.tsx`, keep the Discussion and Guidelines tabs unchanged. Only replace the Write tab content.
- The route file `$submissionId.tsx` currently renders `<ReviewPanel />` with no props. Update to pass the review data destructured from the query result.
- Clean up debounce timers in a `useEffect` cleanup function to prevent memory leaks on unmount.
- The epic spec calls for "spring animation" on the `ProgressRing` and "spring animation (200ms)" on submit confirmation. Use a CSS `transition: stroke-dashoffset 200ms cubic-bezier(0.34, 1.56, 0.64, 1)` on the `ProgressRing` SVG circle for a spring-like ease. For the submit confirmation, apply a brief scale transform (`transform: scale(1.02)` with 200ms transition) on the confirmation message card.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 4 spec | Sprint Agent |
| 2026-02-08 | Fixed: Added `getSubmissionForReviewer` query update to return `submittedAt` — needed for edit window countdown (AC7). Updated Files to modify, Implementation sequence, and Technical Notes. Added spring animation guidance in Dev Notes. | Sprint Agent |
