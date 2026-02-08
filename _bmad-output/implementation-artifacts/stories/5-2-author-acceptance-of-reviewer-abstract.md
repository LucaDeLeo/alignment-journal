# Story 5.2: Author Acceptance of Reviewer Abstract

## Story

**As an** author of an accepted paper,
**I want** to review the reviewer abstract alongside my own abstract and either accept it or provide feedback for revisions,
**So that** I can ensure the published summary fairly represents my work before publication.

## Status

**Epic:** 5 - Reviewer Abstract & Publication
**Status:** ready
**Priority:** High (delivers FR37 — reviewer abstract presented for author acceptance before publication)
**Depends on:** Story 5.1 (reviewer abstract drafting and signing — provides the `reviewerAbstracts` module, `getBySubmission` query, `AbstractDraftForm` component, and the drafting/submitted/approved abstract lifecycle)

## Context

This story adds the author-facing abstract review and acceptance flow. After a reviewer drafts and submits an abstract (Story 5.1) and optionally after the editor approves it, the author sees the reviewer abstract on their submission detail page for ACCEPTED submissions. The author compares the reviewer abstract against their own abstract and either accepts it or provides feedback via the existing discussion thread for revisions.

**What exists today:**
- `convex/schema.ts` — `reviewerAbstracts` table with `submissionId`, `reviewerId`, `content`, `wordCount`, `isSigned`, `status` (drafting/submitted/approved), `revision`, `createdAt`, `updatedAt`, indexes `by_submissionId` and `by_submissionId_reviewerId`
- `convex/reviewerAbstracts.ts` — `getBySubmission` query (returns abstract data with `reviewerName`, `isOwnAbstract`; author access already permitted), `createDraft`, `updateContent`, `updateSigning`, `submitAbstract`, `approveAbstract`
- `convex/discussions.ts` — `listBySubmission` query with identity gating (author role → `canPost: true`), `postMessage` mutation
- `convex/submissions.ts` — `getById` query returning submission with `abstract` field for author's own abstract
- `convex/audit.ts` — `logAction` internalMutation (append-only)
- `convex/helpers/auth.ts` — `withUser` HOF wrapper
- `convex/helpers/errors.ts` — `notFoundError`, `unauthorizedError`, `validationError`
- `app/features/submissions/submission-detail.tsx` — author's submission detail page with title, status, abstract, authors, keywords, triage, status timeline
- `app/features/submissions/status-utils.ts` — `STATUS_COLORS`, `STATUS_LABELS`, `formatDate`
- `app/features/submissions/index.ts` — barrel exports
- `app/features/review/discussion-thread.tsx` — self-contained `DiscussionThread` component (loads own data via `useQuery`)
- `app/features/review/index.ts` — barrel exports including `DiscussionThread`
- `app/routes/submit/$submissionId.tsx` — route rendering `SubmissionDetail`
- `app/components/ui/button.tsx`, `badge.tsx`, `separator.tsx`, `alert-dialog.tsx` — shadcn/ui components (all installed)

**What this story builds:**
1. Schema update: add `authorAccepted: v.optional(v.boolean())` and `authorAcceptedAt: v.optional(v.number())` to `reviewerAbstracts` table
2. Updated `getBySubmission` query to include `authorAccepted` and `authorAcceptedAt` in response
3. New `authorAcceptAbstract` mutation — author accepts the reviewer abstract
4. New `AbstractReviewPanel` component in `app/features/submissions/abstract-review-panel.tsx` — author views and accepts the reviewer abstract
5. Updated `SubmissionDetail` to render `AbstractReviewPanel` and `DiscussionThread` for ACCEPTED submissions
6. Updated `app/features/submissions/index.ts` barrel exports

**Key architectural decisions:**

- **Author acceptance as a boolean flag, not a new status:** The `authorAccepted` field is an optional boolean on the `reviewerAbstracts` record, orthogonal to the existing status lifecycle (`drafting` → `submitted` → `approved`). This avoids complicating the status state machine. The editor's `approveAbstract` (Story 5.1) and the author's `authorAcceptAbstract` are independent sign-offs. Story 5.3 (published article page) will check both `status === 'approved'` AND `authorAccepted === true` before displaying the article as publication-ready.

- **Author can accept at submitted or approved status:** The `authorAcceptAbstract` mutation accepts abstracts in either `submitted` or `approved` status. This allows flexibility in the editorial workflow — the author might review and accept before or after the editor approves. The author cannot accept a `drafting` abstract (it's not ready for review yet).

- **Feedback via existing discussion thread:** The author provides feedback by posting in the submission's discussion thread, which already supports author participation with full identity gating. No new discussion-specific mutations are needed. The `DiscussionThread` component is self-contained and loads its own data.

- **Reviewer abstract displayed below author's own abstract:** The `AbstractReviewPanel` renders the reviewer abstract in a bordered card directly below the existing "Abstract" section in `SubmissionDetail`. The author's own abstract is already visible above, providing natural top-down comparison without layout duplication. The `AbstractReviewPanel` does not receive or render the author abstract — it only shows the reviewer abstract, status, attribution, and accept/feedback controls.

- **Discussion thread on author submission detail:** For ACCEPTED submissions with an abstract, the `SubmissionDetail` page includes the `DiscussionThread` component. This gives the author a way to post feedback directly from the same page where they review the abstract.

- **Clearing acceptance on abstract content change:** If the abstract content is updated after the author has accepted (reviewer makes further edits), the `authorAccepted` flag should be cleared. The `updateContent` mutation in `reviewerAbstracts.ts` is updated to reset `authorAccepted` to `false` when it was previously `true`.

**Key architectural references:**
- UX spec: Reviewer abstract presented for author acceptance before publication
- FR37: Reviewer abstract is presented for author acceptance before publication
- Architecture: Append-only audit trail via `ctx.scheduler.runAfter(0, internal.audit.logAction, ...)`
- Existing patterns: Discussion thread, submission detail, query-based reactive UI

## Acceptance Criteria

### AC1: Author sees reviewer abstract for comparison
**Given** an accepted submission where a reviewer abstract exists (status `submitted` or `approved`)
**When** the author views their submission detail page at `/submit/$submissionId`
**Then:**
- A new "Reviewer Abstract" section appears below the submission's own abstract
- The reviewer abstract text is displayed in Newsreader serif font (`font-serif text-base leading-relaxed`)
- Reviewer attribution shows: the reviewer's name (if signed) or "Anonymous Reviewer" (if unsigned)
- The abstract status is shown as a badge (Submitted / Approved)
- The author's own abstract is visible above for easy comparison
- If no reviewer abstract exists or the abstract is still in `drafting` status, the section is not shown

### AC2: Author accepts the reviewer abstract
**Given** a reviewer abstract in `submitted` or `approved` status
**When** the author clicks "Accept Abstract"
**Then:**
- A confirmation dialog appears: "Accept this reviewer abstract for publication? This confirms you're satisfied with how your work is represented."
- On confirm, `authorAcceptAbstract` mutation sets `authorAccepted: true` and `authorAcceptedAt: Date.now()`
- The UI updates to show a green "Accepted" badge with a checkmark
- The "Accept Abstract" button is replaced by the accepted confirmation
- An audit trail entry is logged: `abstract_author_accepted`

### AC3: Author provides feedback via discussion thread
**Given** an accepted submission with a reviewer abstract
**When** the author wants to provide feedback on the abstract
**Then:**
- The existing discussion thread is visible on the submission detail page below the abstract review section
- The author can compose and post messages using the existing `DiscussionThread` component
- The discussion thread shows all participants with appropriate identity gating (reviewer identities revealed for ACCEPTED submissions)
- A "Provide Feedback" hint text near the abstract review section guides the author to use the discussion thread

### AC4: Acceptance cleared on content change
**Given** a reviewer abstract that the author has already accepted (`authorAccepted: true`)
**When** the reviewer updates the abstract content via `updateContent`
**Then:**
- The `authorAccepted` flag is reset to `false`
- The `authorAcceptedAt` timestamp is cleared
- The author sees the abstract as no longer accepted and must re-review

### AC5: Audit trail logging
**Given** the author acceptance action
**When** the author accepts the abstract
**Then:**
- An audit trail entry is logged with action `abstract_author_accepted`
- The entry includes the submission ID and actor ID (the author)
- The audit timeline on the editor's submission detail page shows this event

## Technical Notes

### Schema change — add optional fields

Add to `reviewerAbstracts` table definition in `convex/schema.ts`:
```typescript
authorAccepted: v.optional(v.boolean()),
authorAcceptedAt: v.optional(v.number()),
```

These are optional fields — no migration needed, existing records will have `undefined` for both.

### Update `convex/reviewerAbstracts.ts`

1. **Update `getBySubmission` query** — add `authorAccepted` and `authorAcceptedAt` to the return type and response object:
   - Return type adds: `authorAccepted: v.optional(v.boolean())`, `authorAcceptedAt: v.optional(v.number())`
   - Response includes: `authorAccepted: abstract.authorAccepted`, `authorAcceptedAt: abstract.authorAcceptedAt`

2. **New `authorAcceptAbstract` mutation** (uses `withUser` + author ownership check):
   - Args: `{ submissionId: v.id('submissions') }`
   - Validates the submission exists and the caller is the submission author
   - Validates the abstract exists for this submission
   - Validates the abstract status is `submitted` or `approved` (not `drafting`)
   - Validates the abstract is not already author-accepted (idempotent — returns early if already accepted)
   - Sets `authorAccepted: true`, `authorAcceptedAt: Date.now()`, `updatedAt: Date.now()`
   - Logs audit: `abstract_author_accepted`
   - Returns: `v.null()`

3. **Update `updateContent` mutation** — clear `authorAccepted` on content change:
   - After the existing content patch, if `abstract.authorAccepted === true`, also patch `authorAccepted: false`, `authorAcceptedAt: undefined` (Convex removes optional fields set to `undefined` via `patch`)
   - This ensures the author must re-review after content changes

### New `app/features/submissions/abstract-review-panel.tsx`

`AbstractReviewPanel` component:
- Props: `submissionId: Id<'submissions'>`
- Calls `useQuery(api.reviewerAbstracts.getBySubmission, { submissionId })`
- If query returns `null` or `undefined`, renders nothing (no abstract to review)
- If abstract status is `drafting`, renders nothing (not ready for author review)
- **Layout:**
  - Section header: "Reviewer Abstract" with status badge
  - Reviewer abstract text in Newsreader serif font, in a bordered card
  - Reviewer attribution line: "By [Name]" or "By Anonymous Reviewer"
  - Word count displayed as subtle metadata
  - If `authorAccepted` is true: green "Accepted" badge with checkmark, timestamp
  - If `authorAccepted` is false/undefined: "Accept Abstract" button + "Provide Feedback" hint
  - Does NOT render the author's own abstract — it's already visible above in the existing `SubmissionDetail` "Abstract" section, providing natural top-down comparison
- **Accept flow:**
  - "Accept Abstract" button opens `AlertDialog` confirmation
  - Calls `useMutation(api.reviewerAbstracts.authorAcceptAbstract)`
  - On success, the reactive query updates the UI immediately
- Uses `useMutation` from `convex/react`, shadcn/ui `Button`, `Badge`, `AlertDialog`, `Separator`
- lucide-react icons: `CheckIcon`, `UserIcon`, `EyeOffIcon`, `MessageSquareIcon`

### Update `app/features/submissions/submission-detail.tsx`

- Import `AbstractReviewPanel` from `./abstract-review-panel`
- Import `DiscussionThread` from `~/features/review`
- After the existing Abstract section, conditionally render for `submission.status === 'ACCEPTED'`:
  ```
  <AbstractReviewPanel submissionId={submissionId} />
  <DiscussionThread submissionId={submissionId} />
  ```
- The `DiscussionThread` is self-contained — it loads its own data and handles identity gating

### Update `app/features/submissions/index.ts`

- Add export: `export { AbstractReviewPanel } from './abstract-review-panel'`

### Files to create

```
app/features/submissions/abstract-review-panel.tsx   — NEW: author abstract review and acceptance
```

### Files to modify

```
convex/schema.ts                                     — MODIFY: add authorAccepted, authorAcceptedAt to reviewerAbstracts
convex/reviewerAbstracts.ts                          — MODIFY: update getBySubmission return, add authorAcceptAbstract, update updateContent
app/features/submissions/submission-detail.tsx        — MODIFY: add AbstractReviewPanel + DiscussionThread for ACCEPTED
app/features/submissions/index.ts                    — MODIFY: export AbstractReviewPanel
app/features/editor/audit-timeline.tsx               — MODIFY: add abstract_author_accepted to ACTION_LABELS mapping
```

### Implementation sequence

1. **Modify `convex/schema.ts`** — add `authorAccepted` and `authorAcceptedAt` optional fields to `reviewerAbstracts`.

2. **Modify `convex/reviewerAbstracts.ts`** — update `getBySubmission` return type, add `authorAcceptAbstract` mutation, update `updateContent` to clear acceptance on change.

3. **Create `app/features/submissions/abstract-review-panel.tsx`** — author abstract review panel with accept flow, confirmation dialog, accepted state.

4. **Update `app/features/submissions/submission-detail.tsx`** — conditionally render `AbstractReviewPanel` and `DiscussionThread` for ACCEPTED submissions.

5. **Update `app/features/submissions/index.ts`** — add `AbstractReviewPanel` export.

6. **Update `app/features/editor/audit-timeline.tsx`** — add `abstract_author_accepted: 'Author accepted abstract'` to the `ACTION_LABELS` mapping. Verify that `abstract_assigned`, `abstract_submitted`, `abstract_approved` entries from Story 5.1 are present; if missing, add them as well (`abstract_assigned: 'Abstract assigned'`, `abstract_submitted: 'Abstract submitted'`, `abstract_approved: 'Abstract approved'`).

7. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`, `useMutation`
- Import from `~/components/ui/` for shadcn components
- Import from `~/features/submissions` for submission feature components (barrel export)
- Import from `~/features/review` for `DiscussionThread` (cross-feature import)
- Import from `convex/_generated/api` for API references

### shadcn/ui components to use

- `Button` — accept action (already installed)
- `Badge` — status indicators (already installed)
- `Separator` — section dividers (already installed)
- `AlertDialog` — accept confirmation (already installed)
- lucide-react icons: `CheckIcon`, `UserIcon`, `EyeOffIcon`, `MessageSquareIcon`

### Component data flow

```
$submissionId.tsx (route)
  ├─ <SubmissionDetail submissionId={...} />
  │    ├─ useQuery(api.submissions.getById) → { title, abstract, status, ... }
  │    ├─ Header, metadata, author abstract, authors, keywords, triage, timeline
  │    ├─ (if ACCEPTED):
  │    │    ├─ <AbstractReviewPanel submissionId={...} />
  │    │    │    ├─ useQuery(api.reviewerAbstracts.getBySubmission)
  │    │    │    │    → { content, wordCount, isSigned, status, reviewerName, authorAccepted, authorAcceptedAt }
  │    │    │    ├─ Reviewer abstract card (serif font, attribution)
  │    │    │    ├─ Status badge (Submitted / Approved / Author Accepted)
  │    │    │    ├─ Accept button (if not yet accepted) → AlertDialog → authorAcceptAbstract mutation
  │    │    │    └─ Accepted confirmation (if authorAccepted)
  │    │    └─ <DiscussionThread submissionId={...} />
  │    │         ├─ useQuery(api.discussions.listBySubmission) → messages with identity gating
  │    │         ├─ Message list with role badges
  │    │         └─ Composer for new messages
```

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Author accepts then reviewer changes abstract | Stale acceptance | `updateContent` clears `authorAccepted` flag (AC4) |
| Author tries to accept a drafting abstract | Premature acceptance | `authorAcceptAbstract` validates status is `submitted` or `approved` |
| Race condition: author accepts while reviewer is editing | Inconsistent state | Mutations are serializable in Convex; the accept will see the latest state |
| Discussion thread identity gating incorrect for author on ACCEPTED | Author sees wrong names | Already handled by `listBySubmission` — ACCEPTED submissions reveal identities |
| Multiple authors on a paper | Which author accepts? | Only the `authorId` (primary/submitting author) can accept — enforced by ownership check |

### Dependencies on this story

- **Story 5.3 (Published Article Page):** Checks `authorAccepted === true` before treating the article as publication-ready.
- **Story 7.3 (Seed Data):** Seeds sample `authorAccepted` state on published articles.

### What "done" looks like

- `convex/schema.ts` updated with `authorAccepted` and `authorAcceptedAt` optional fields on `reviewerAbstracts`
- `convex/reviewerAbstracts.ts` updated: `getBySubmission` returns new fields, new `authorAcceptAbstract` mutation, `updateContent` clears acceptance on change
- All new Convex functions define `args` and `returns` validators
- `app/features/submissions/abstract-review-panel.tsx` exists with accept flow, confirmation dialog, accepted state
- `app/features/submissions/submission-detail.tsx` updated to render `AbstractReviewPanel` and `DiscussionThread` for ACCEPTED submissions
- `app/features/submissions/index.ts` updated with new export
- Author sees reviewer abstract with attribution on their submission detail page
- Accept button with confirmation dialog marks the abstract as author-accepted
- Accepted state shows green badge with timestamp
- Discussion thread visible on submission detail page for ACCEPTED submissions
- `updateContent` clears `authorAccepted` when abstract is modified after acceptance
- Audit trail entry logged for `abstract_author_accepted`
- `app/features/editor/audit-timeline.tsx` `ACTION_LABELS` mapping includes `abstract_author_accepted`
- `bunx convex dev --once` succeeds
- `bun run build` succeeds
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The `getBySubmission` query already permits author access (checks `isSubmissionAuthor`). No auth changes needed for the query.
- The `authorAcceptAbstract` mutation must validate the caller is the submission's `authorId`, not just any user with `author` role. This is ownership-based access control.
- The `DiscussionThread` component from `~/features/review` is a cross-feature import. This is consistent with the project pattern of importing from sibling feature barrel exports.
- The `DiscussionThread` component is fully self-contained — it calls `useQuery(api.discussions.listBySubmission, { submissionId })` internally and handles all identity gating, message rendering, and composition.
- For the author's submission detail page, the discussion thread only appears for ACCEPTED submissions. This is because the author needs the discussion thread to provide feedback on the reviewer abstract. For non-accepted submissions, the author doesn't need the discussion thread on this page.
- The `authorAccepted` flag is independent of the abstract `status`. The abstract can be `submitted` + `authorAccepted: true` (author accepted before editor approved), or `approved` + `authorAccepted: true` (both signed off), etc. Story 5.3 checks both conditions.
- The `authorAcceptedAt` timestamp is useful for audit/display purposes — showing when the author signed off.
- Newsreader font for the abstract display: use `font-serif` (Newsreader is configured as the serif font in the design system).
- The `updateContent` clearing of `authorAccepted` is a safety mechanism. If the reviewer edits after the author accepted, the author should re-review. This is done in the same mutation to keep it atomic.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 5 spec | Sprint Agent |
| 2026-02-08 | Fixed: Resolved contradictory side-by-side vs single-abstract display instructions. Consolidated to single approach: reviewer abstract displayed below existing author abstract section (no duplication, no `authorAbstract` prop). Added `audit-timeline.tsx` to Files to Modify with `abstract_author_accepted` action label per CLAUDE.md requirement. | Sprint Agent |
