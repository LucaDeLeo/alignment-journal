# Story 2.2: Submission Status Tracking

## Story

**As an** author,
**I want** to view the status of my submissions at any time,
**So that** I know where my paper is in the editorial pipeline.

## Status

**Epic:** 2 - Author Submission & LLM Triage Pipeline
**Status:** ready
**Priority:** High (required for downstream stories 2.3, 2.4 which extend this view)
**Depends on:** Story 2.1 (submission form, `listByAuthor` query, submission records, status chip colors)

## Context

This story replaces the placeholder at `/submit/$submissionId` with a real submission detail page. Story 2.1 already created the submissions list that links to this route, the Convex schema with all status values, the `STATUS_COLORS` / `STATUS_LABELS` mappings, and the `listByAuthor` query. This story adds:

1. A Convex query to fetch a single submission by ID (with author ownership enforcement)
2. A detail page component showing title, abstract, authors, keywords, submission date, current status, and a status timeline
3. Real-time reactivity via Convex — status changes appear instantly without page refresh

The status timeline shows the ordered progression of a submission through the editorial pipeline. Since audit logs are not yet populated (that's story 3.3), the timeline is derived from the submission's current status position within the `VALID_TRANSITIONS` state machine — showing completed steps (before current), the current step, and upcoming steps (after current).

**Key architectural decisions:**

- **Query pattern:** A new `submissions.getById` query uses `withUser` wrapper (not `withAuthor`) so admin users can also access the page (the `/submit` route allows `['author', 'admin']` roles). The query enforces ownership — `authorId` must match `ctx.user._id`.
- **Feature folder:** Adds `submission-detail.tsx` and `status-timeline.tsx` to the existing `app/features/submissions/` folder. The barrel export is updated.
- **Shared mappings:** `STATUS_COLORS` and `STATUS_LABELS` are extracted from `submission-list.tsx` into a shared `status-utils.ts` file so both the list and detail views use the same mappings.
- **Real-time updates:** The detail page uses `useQuery(api.submissions.getById, { submissionId })` — Convex reactive queries automatically re-render when the submission document changes.
- **Timeline from state machine:** The timeline is computed client-side from `SUBMISSION_STATUSES` and `VALID_TRANSITIONS` — no new database table needed. This shows the full pipeline path for the current status.

**Key architectural references:**
- Route: story 1.4 — `/submit/$submissionId` placeholder route
- Schema: `convex/schema.ts` — submissions table with all fields
- State machine: `convex/helpers/transitions.ts` — `SUBMISSION_STATUSES`, `VALID_TRANSITIONS`
- Auth: `convex/helpers/auth.ts` — `withUser` wrapper
- Status colors: `app/features/submissions/submission-list.tsx` — `STATUS_COLORS`, `STATUS_LABELS`
- Error helpers: `convex/helpers/errors.ts` — `notFoundError`, `unauthorizedError`

## Acceptance Criteria

### AC1: Convex query returns full submission detail for the owner
**Given** an authenticated author with an existing submission
**When** the `submissions.getById` query is called with the submission's ID
**Then:**
- The query uses the `withUser` wrapper
- It returns the full submission document: `_id`, `title`, `authors`, `abstract`, `keywords`, `status`, `pdfFileName`, `pdfFileSize`, `createdAt`, `updatedAt`
- If the submission does not exist, it throws `NOT_FOUND`
- If `authorId` does not match `ctx.user._id`, it throws `UNAUTHORIZED`
- The query has both `args` and `returns` validators

### AC2: Submission detail page shows all metadata
**Given** an authenticated author navigating to `/submit/$submissionId`
**When** the page loads
**Then:**
- The page displays the submission title as a heading
- A color-coded status Badge shows the current status (using the same `STATUS_COLORS` and `STATUS_LABELS` from the list view)
- The abstract is displayed in Newsreader serif font (`font-serif`)
- The authors are listed with name and affiliation
- The keywords are shown as Badge components
- The submission date is displayed as a formatted date string
- A "Back to submissions" link navigates to `/submit/`
- If the submission is not found or not owned by the current user, an error state is shown

### AC3: Status timeline shows pipeline progression
**Given** a submission in any status
**When** the detail page renders
**Then:**
- A vertical timeline shows the ordered steps in the submission's pipeline path
- Completed steps (statuses that come before the current status in the pipeline) show a check icon with muted styling
- The current step shows with the appropriate status color and a filled indicator
- Future steps (statuses that come after the current status) show with muted/dashed styling
- Terminal states (DESK_REJECTED, REJECTED) show with destructive coloring
- The timeline derives its steps from the `SUBMISSION_STATUSES` constant and `VALID_TRANSITIONS` map — it follows the linear path: SUBMITTED → TRIAGING → TRIAGE_COMPLETE → UNDER_REVIEW → DECISION_PENDING → ACCEPTED → PUBLISHED
- Branch outcomes (DESK_REJECTED, REJECTED, REVISION_REQUESTED) are shown only when the submission is actually in that status

### AC4: Real-time status updates without page refresh
**Given** a submission displayed on the detail page
**When** the submission's status changes in the database (e.g., from SUBMITTED to TRIAGING)
**Then:**
- The status Badge updates automatically
- The timeline updates to reflect the new current step
- No page refresh or manual action is required
- This is achieved via `useQuery` from `convex/react` (standard Convex reactive query)

### AC5: Shared status utilities
**Given** the status color and label mappings
**When** used across the codebase
**Then:**
- `STATUS_COLORS`, `STATUS_LABELS`, and `formatDate` are extracted to `app/features/submissions/status-utils.ts`
- Both `submission-list.tsx` and `submission-detail.tsx` import from `status-utils.ts`
- The `formatDate` function is also exported from the shared file
- No duplication of status mappings between components

## Technical Notes

### New files to create

```
convex/
  (modify) submissions.ts     — add getById query

app/features/submissions/
  status-utils.ts              — shared STATUS_COLORS, STATUS_LABELS, formatDate
  submission-detail.tsx        — detail page component
  status-timeline.tsx          — vertical timeline component
  (modify) index.ts            — update barrel export
  (modify) submission-list.tsx — import from status-utils.ts instead of local constants
```

### Files to modify

```
app/routes/submit/$submissionId.tsx — replace placeholder with SubmissionDetail component
```

### Implementation sequence

1. **Create `app/features/submissions/status-utils.ts`** — Extract `STATUS_COLORS`, `STATUS_LABELS`, and `formatDate` from `submission-list.tsx` into a shared module. Export all three.

2. **Update `app/features/submissions/submission-list.tsx`** — Remove the local `STATUS_COLORS`, `STATUS_LABELS`, and `formatDate` definitions. Import them from `./status-utils`.

3. **Add `getById` query to `convex/submissions.ts`** — New query with `withUser` wrapper:
   - `args: { submissionId: v.id('submissions') }`
   - `returns: v.object(...)` with full submission shape (all fields except `authorId` which is internal)
   - Fetches submission by ID via `ctx.db.get`
   - Throws `notFoundError` if not found
   - Throws `unauthorizedError` if `authorId !== ctx.user._id`
   - Returns the submission projection

4. **Create `app/features/submissions/status-timeline.tsx`** — Timeline component:
   - Accepts `currentStatus: SubmissionStatus` prop
   - Computes the linear pipeline path from `SUBMISSION_STATUSES`
   - The "happy path" is: SUBMITTED → TRIAGING → TRIAGE_COMPLETE → UNDER_REVIEW → DECISION_PENDING → ACCEPTED → PUBLISHED
   - Shows completed/current/future steps with appropriate styling
   - Handles terminal/branch states (DESK_REJECTED, REJECTED, REVISION_REQUESTED)
   - Uses lucide-react icons: `CheckCircle2`, `Circle`, `CircleDot`

5. **Create `app/features/submissions/submission-detail.tsx`** — Detail component:
   - Uses `useQuery(api.submissions.getById, { submissionId })` from `convex/react`
   - Renders title, status Badge, abstract (serif font), authors, keywords, date
   - Includes `StatusTimeline` component
   - "Back to submissions" Link to `/submit/`
   - Error state for not found / unauthorized

6. **Update `app/features/submissions/index.ts`** — Add exports for `SubmissionDetail`, `StatusTimeline`, and all `status-utils` exports.

7. **Update `app/routes/submit/$submissionId.tsx`** — Replace the placeholder with the real `SubmissionDetail` component, passing the `submissionId` route param.

8. **Verify typecheck, lint, and dev server** — `bun run typecheck`, `bun run lint`, `bun dev`.

### Convex query signature

```typescript
// convex/submissions.ts — new getById query
export const getById = query({
  args: {
    submissionId: v.id('submissions'),
  },
  returns: v.object({
    _id: v.id('submissions'),
    _creationTime: v.number(),
    title: v.string(),
    authors: v.array(v.object({ name: v.string(), affiliation: v.string() })),
    abstract: v.string(),
    keywords: v.array(v.string()),
    status: submissionStatusValidator,
    pdfFileName: v.optional(v.string()),
    pdfFileSize: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  handler: withUser(async (ctx: QueryCtx & { user: Doc<'users'> }, args: { submissionId: Id<'submissions'> }) => {
    const submission = await ctx.db.get(args.submissionId)
    if (!submission) {
      throw notFoundError('Submission', args.submissionId)
    }
    if (submission.authorId !== ctx.user._id) {
      throw unauthorizedError('You can only view your own submissions')
    }
    return {
      _id: submission._id,
      _creationTime: submission._creationTime,
      title: submission.title,
      authors: submission.authors,
      abstract: submission.abstract,
      keywords: submission.keywords,
      status: submission.status,
      pdfFileName: submission.pdfFileName,
      pdfFileSize: submission.pdfFileSize,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    }
  }),
})
```

### Timeline computation logic

```typescript
// The "happy path" through the pipeline
const HAPPY_PATH: ReadonlyArray<SubmissionStatus> = [
  'SUBMITTED',
  'TRIAGING',
  'TRIAGE_COMPLETE',
  'UNDER_REVIEW',
  'DECISION_PENDING',
  'ACCEPTED',
  'PUBLISHED',
]

// Branch/terminal states — only shown when submission is in that state
const BRANCH_STATES: ReadonlyArray<SubmissionStatus> = [
  'DESK_REJECTED',
  'REJECTED',
  'REVISION_REQUESTED',
]

function getTimelineSteps(currentStatus: SubmissionStatus) {
  const happyIndex = HAPPY_PATH.indexOf(currentStatus)

  if (happyIndex >= 0) {
    // On the happy path — show all steps with current position
    return HAPPY_PATH.map((status, i) => ({
      status,
      label: STATUS_LABELS[status],
      state: i < happyIndex ? 'completed' : i === happyIndex ? 'current' : 'future',
    }))
  }

  // In a branch state — show happy path up to the branch point, then the branch
  if (currentStatus === 'DESK_REJECTED') {
    // Branches from TRIAGE_COMPLETE
    const branchIndex = HAPPY_PATH.indexOf('TRIAGE_COMPLETE')
    return [
      ...HAPPY_PATH.slice(0, branchIndex + 1).map((status) => ({
        status, label: STATUS_LABELS[status], state: 'completed' as const,
      })),
      { status: currentStatus, label: STATUS_LABELS[currentStatus], state: 'current' as const },
    ]
  }

  if (currentStatus === 'REJECTED' || currentStatus === 'REVISION_REQUESTED') {
    // Branches from DECISION_PENDING
    const branchIndex = HAPPY_PATH.indexOf('DECISION_PENDING')
    return [
      ...HAPPY_PATH.slice(0, branchIndex + 1).map((status) => ({
        status, label: STATUS_LABELS[status], state: 'completed' as const,
      })),
      { status: currentStatus, label: STATUS_LABELS[currentStatus], state: 'current' as const },
    ]
  }

  // DRAFT — just show as current with no prior steps
  return [{ status: currentStatus, label: STATUS_LABELS[currentStatus], state: 'current' as const }]
}
```

### shadcn/ui components to use

- `Badge` — status chip, keyword tags (already installed)
- `Button` — back link (already installed)
- `Card` — optional wrapper for sections (already installed)
- lucide-react icons: `CheckCircle2`, `Circle`, `CircleDot`, `ArrowLeft`, `FileTextIcon`, `CalendarIcon`, `UsersIcon`, `TagIcon`

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Submission ID in URL could be probed by other users | Data leak | `getById` query enforces `authorId === ctx.user._id` |
| Status timeline becomes stale if transitions change | Wrong UX | Timeline derives from `VALID_TRANSITIONS` constant — single source of truth |
| Abstract may be very long | Poor layout | Max-width container with `prose` typography class handles long text |
| `getById` returns `undefined` during initial Convex sync | Flash of error state | Return `null` from `useQuery` and show skeleton/loading state until data arrives |

### Dependencies on this story

- **Story 2.3 (PDF Text Extraction & Triage):** Triggers status transitions that this page displays in real-time
- **Story 2.4 (Triage Progress Display):** Extends this detail page with triage report data

### What "done" looks like

- An author can click on a submission in the list at `/submit/` and navigate to `/submit/$submissionId`
- The detail page shows: title, status Badge, abstract (serif font), authors, keywords, and submission date
- A status timeline visualizes the submission's progression through the pipeline
- The status Badge and timeline update in real-time when the status changes (no refresh needed)
- If a non-owner tries to access the URL, they see an error state
- `STATUS_COLORS`, `STATUS_LABELS`, and `formatDate` are shared between list and detail views via `status-utils.ts`
- `convex/submissions.ts` has a `getById` query with `withUser` wrapper, ownership check, and both `args` and `returns` validators
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes
- `bun dev` runs without errors

## Dev Notes

- The `getById` query uses `withUser` (not `withAuthor`) matching the pattern from `listByAuthor` — the `/submit` route allows `['author', 'admin']` roles. Ownership is enforced inside the handler.
- The `useQuery` hook from `convex/react` returns `undefined` while the query is loading — handle this by returning `null` (the route-level Suspense boundary from story 1.4 handles the loading state).
- The abstract textarea should use `font-serif` class to render in Newsreader, matching the submission form's pattern.
- Import conventions: value imports before type imports, separate `import type` statements, `Array<T>` syntax.
- The timeline is a purely visual/derived component — no new database writes or schema changes needed. Future stories can enhance it with actual timestamps from audit logs.
- The route param is `submissionId` (from the `$submissionId.tsx` filename). Access via `Route.useParams()`.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 2 spec | Sprint Agent |
