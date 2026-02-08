# ATDD Checklist: 2-2 Submission Status Tracking

## AC1: Convex query returns full submission detail for the owner

- [x] `getById` query exists in `convex/submissions.ts`
- [x] Query uses `withUser` wrapper (not `withAuthor`)
- [x] Query has `args` validator with `submissionId: v.id('submissions')`
- [x] Query has `returns` validator with full submission shape
- [x] Returns full submission document fields: `_id`, `title`, `authors`, `abstract`, `keywords`, `status`, `pdfFileName`, `pdfFileSize`, `createdAt`, `updatedAt`, `_creationTime`
- [x] Throws `NOT_FOUND` error if submission does not exist
- [x] Throws `UNAUTHORIZED` error if `authorId` does not match `ctx.user._id`

## AC2: Submission detail page shows all metadata

- [x] `/submit/$submissionId` route renders `SubmissionDetail` component
- [x] Page displays submission title as a heading
- [x] Color-coded status Badge using shared `STATUS_COLORS` and `STATUS_LABELS`
- [x] Abstract displayed in Newsreader serif font (`font-serif`)
- [x] Authors listed with name and affiliation
- [x] Keywords shown as Badge components
- [x] Submission date displayed as formatted date string
- [x] "Back to submissions" link navigates to `/submit/`
- [x] Error state shown for not found / unauthorized

## AC3: Status timeline shows pipeline progression

- [x] Vertical timeline component exists (`status-timeline.tsx`)
- [x] Shows ordered steps in the submission pipeline path
- [x] Completed steps show check icon with muted styling
- [x] Current step shows with appropriate status color and filled indicator
- [x] Future steps show with muted/dashed styling
- [x] Terminal states (DESK_REJECTED, REJECTED) show with destructive coloring
- [x] Timeline follows happy path: SUBMITTED → TRIAGING → TRIAGE_COMPLETE → UNDER_REVIEW → DECISION_PENDING → ACCEPTED → PUBLISHED
- [x] Branch outcomes shown only when submission is in that status

## AC4: Real-time status updates without page refresh

- [x] Detail page uses `useQuery(api.submissions.getById, { submissionId })` from `convex/react`
- [x] Status Badge updates automatically via reactive query
- [x] Timeline updates to reflect new current step via reactive query

## AC5: Shared status utilities

- [x] `STATUS_COLORS`, `STATUS_LABELS`, and `formatDate` extracted to `app/features/submissions/status-utils.ts`
- [x] `submission-list.tsx` imports from `status-utils.ts`
- [x] `submission-detail.tsx` imports from `status-utils.ts`
- [x] No duplication of status mappings

## Unit Tests

- [x] `getTimelineSteps` returns correct steps for each happy path status
- [x] `getTimelineSteps` returns correct steps for branch states (DESK_REJECTED, REJECTED, REVISION_REQUESTED)
- [x] `getTimelineSteps` marks completed/current/future correctly
- [x] `STATUS_COLORS` covers all submission statuses
- [x] `STATUS_LABELS` covers all submission statuses
- [x] `formatDate` formats timestamps correctly

## Verification

- [x] `bun run typecheck` passes
- [x] `bun run lint` passes
- [x] `bun run test` passes
