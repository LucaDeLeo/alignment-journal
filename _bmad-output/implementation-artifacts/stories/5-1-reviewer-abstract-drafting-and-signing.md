# Story 5.1: Reviewer Abstract Drafting and Signing

## Story

**As a** selected reviewer,
**I want** to draft a reviewer abstract using material from the review discussion, and choose whether to sign it,
**So that** my professional assessment becomes a published artifact that helps readers.

## Status

**Epic:** 5 - Reviewer Abstract & Publication
**Status:** ready
**Priority:** High (delivers FR36, FR38 — reviewer abstract drafting, signing choice)
**Depends on:** Story 4.4 (semi-confidential threaded discussion — discussion thread as source material), Story 4.3 (structured review form — review submission/locking, submitted review sections as reference), Story 3.7 (editorial decisions — ACCEPTED status on submissions)

## Context

This story adds a reviewer abstract drafting interface to the review workspace for accepted submissions. It creates the backend `convex/reviewerAbstracts.ts` module and the frontend `AbstractDraftForm` component. The reviewer is "selected" by an editor to write the published abstract — this is a prestigious assignment communicated through the UI.

**What exists today:**
- `convex/schema.ts` — `reviewerAbstracts` table with `submissionId`, `reviewerId`, `content`, `wordCount`, `isSigned`, `status` (drafting/submitted/approved), `revision`, `createdAt`, `updatedAt`, index `by_submissionId`
- `convex/reviews.ts` — `getSubmissionForReviewer` query returning review + submission data; `listByReviewer` query listing all assigned reviews
- `convex/discussions.ts` — `listBySubmission` query with full semi-confidential identity gating
- `convex/helpers/auth.ts` — `withUser`, `withReviewer`, `withRole` HOF wrappers
- `convex/helpers/errors.ts` — structured `ConvexError` helpers (`validationError`, `notFoundError`, `unauthorizedError`, `versionConflictError`)
- `convex/helpers/roles.ts` — `EDITOR_ROLES` (editor_in_chief, action_editor, admin)
- `convex/audit.ts` — `logAction` internalMutation for audit trail
- `app/features/review/review-panel.tsx` — tabbed panel with Write Review, Discussion, and Guidelines tabs
- `app/features/review/review-form.tsx` — auto-save pattern with 500ms debounce, optimistic concurrency, version conflict resolution, mutex serialization, edit countdown
- `app/features/review/save-indicator.tsx` — `SaveIndicator` component with idle/saving/saved/error states
- `app/features/review/discussion-thread.tsx` — `DiscussionThread` component (self-contained, loads own data)
- `app/features/review/index.ts` — barrel exports
- `app/routes/review/$submissionId.tsx` — reviewer workspace route with split-view layout
- `app/components/ui/textarea.tsx`, `button.tsx`, `badge.tsx`, `switch.tsx`, `separator.tsx` — shadcn/ui components (all installed)

**What this story builds:**
1. New `convex/reviewerAbstracts.ts` module — all reviewer abstract queries and mutations
2. New `getBySubmission` query — fetches the reviewer abstract record for a submission
3. New `createDraft` mutation — editor selects a reviewer, creates the initial drafting record
4. New `updateContent` mutation — auto-save abstract content with optimistic concurrency
5. New `updateSigning` mutation — toggle signed/anonymous choice
6. New `submitAbstract` mutation — reviewer submits the draft (stays editable until editor approves — Tier 2)
7. New `approveAbstract` mutation — editor approves the abstract
8. New `AbstractDraftForm` component in `app/features/review/abstract-draft-form.tsx` — drafting interface with auto-save, word counter, signing toggle
9. Updated `ReviewPanel` to add an "Abstract" tab for accepted submissions when the reviewer has an abstract assignment
10. Updated `app/features/review/index.ts` barrel exports

**Key architectural decisions:**

- **Editor-initiated assignment:** An editor calls `createDraft` to select a reviewer for abstract writing. This creates a `reviewerAbstracts` record with status `drafting`. The reviewer sees the drafting interface in their workspace. This story focuses on the reviewer's drafting flow; the editor selection UI is minimal (a "Select for abstract" button in the editor's reviewer list view, to be built in a future editor-side story or as a simple mutation call for now).

- **Auto-save identical to review form:** The abstract drafting form follows the exact same auto-save pattern as `review-form.tsx`: 500ms debounce, optimistic concurrency control via `revision` field, version conflict detection, mutex serialization. This ensures a consistent UX across all writing interfaces.

- **Word count validation:** 150-500 word target. The `updateContent` mutation computes and stores `wordCount` server-side. The UI shows a live word counter. The `submitAbstract` mutation validates the word count is within range.

- **Signing choice:** The `isSigned` boolean is toggled via `updateSigning` mutation. When `true`, the reviewer's name will appear on the published abstract. When `false`, it shows "Anonymous Reviewer". The default is `false` (anonymous). The signing choice can be changed any time before editor approval.

- **Tier 2 edit window — editor approval based:** Unlike the review form's 15-minute timer, the abstract remains fully editable in `drafting` and `submitted` states until the editor approves it (transitions to `approved`). The `submitAbstract` mutation transitions from `drafting` to `submitted`, signaling the reviewer considers it ready. The editor's `approveAbstract` mutation transitions from `submitted` to `approved`, at which point edits are no longer possible.

- **Discussion thread as source material:** The drafting interface shows the discussion thread alongside the drafting form (or accessible in a tab). The reviewer can reference discussion content while writing. No copy/paste automation — the reviewer composes the abstract in their own words.

- **Prestigious messaging:** The UI communicates the selection as an honor: "You've been selected to write the published abstract for this paper."

- **Query approach:** The `getBySubmission` query uses `withUser` (not `withReviewer`) since editors also need to view the abstract. It returns `null` if no abstract exists for the submission. Access control: the reviewer assigned to the abstract, the submission author (for Story 5.2), and editor-level roles can view it.

**Key architectural references:**
- UX spec: Auto-save at 500ms debounce with persistent save indicator
- UX spec: Newsreader serif font for drafting interface
- UX spec: Tier 2 edit window — editable until editor approves
- FR36: Selected reviewer can draft a reviewer abstract (150-500 words) using material from the review discussion
- FR38: Reviewers can choose to sign or remain anonymous on the published reviewer abstract
- Architecture: `convex/reviewerAbstracts.ts` — abstract drafting queries + mutations

## Acceptance Criteria

### AC1: Abstract drafting interface for selected reviewer
**Given** an accepted submission where the reviewer has been selected for abstract writing (a `reviewerAbstracts` record exists with `reviewerId` matching the current user)
**When** the reviewer opens the review workspace
**Then:**
- A new "Abstract" tab appears in the ReviewPanel tabs alongside Write Review, Discussion, and Guidelines
- The Abstract tab shows a drafting interface with: a Newsreader serif font textarea for the abstract content, a live word counter showing current/target (e.g., "127 / 150-500"), and editorial guidance text
- The guidance text reads: "Write the abstract a potential reader would most want to read. Summarize the paper's key contribution and significance in 150-500 words."
- A prominent header communicates prestige: "You've been selected to write the published abstract for this paper"
- The discussion thread is accessible via the existing Discussion tab for reference

### AC2: Auto-save with 500ms debounce
**Given** the abstract drafting form
**When** the reviewer types
**Then:**
- Auto-save triggers at 500ms debounce with persistent save indicator (reusing `SaveIndicator` component)
- The save uses optimistic concurrency control via `revision` field (identical pattern to `ReviewForm`)
- Version conflict detection shows reload/keep options on conflict
- A mutex serializes concurrent saves to prevent race conditions
- The `wordCount` is computed and stored server-side on each save

### AC3: Word count validation
**Given** the abstract content
**When** the word counter renders
**Then:**
- The counter shows "N words" with the current count
- When below 150 words, the counter shows amber/warning color with "150 min"
- When between 150-500 words, the counter shows green/success color
- When above 500 words, the counter shows red/error color with "500 max"
- The "Submit Abstract" button is disabled when the word count is outside the 150-500 range
- The `submitAbstract` mutation validates the word count server-side (rejects if < 150 or > 500)

### AC4: Signing choice
**Given** the abstract drafting form
**When** the reviewer views the signing section
**Then:**
- A toggle/switch appears with label: "Sign this abstract with your name"
- Default is off (anonymous)
- When on, a preview shows: "Published as: [Reviewer Name]"
- When off, a preview shows: "Published as: Anonymous Reviewer"
- Toggling calls `updateSigning` mutation immediately (no debounce needed — single boolean)
- The signing choice can be changed any time the abstract is editable (before editor approval)

### AC5: Abstract submission
**Given** the abstract draft with content in the 150-500 word range
**When** the reviewer clicks "Submit Abstract"
**Then:**
- A confirmation dialog appears: "Submit your abstract for editor review? You can continue editing until the editor approves it."
- On confirm, `submitAbstract` mutation transitions status from `drafting` to `submitted`
- A success banner appears: "Abstract submitted. You can continue editing until the editor approves it."
- The form remains editable (Tier 2 — editable until editor approves)
- An audit trail entry is logged: `abstract_submitted`

### AC6: Editable until editor approval
**Given** a submitted abstract (status `submitted`)
**When** the reviewer returns to the drafting interface
**Then:**
- The abstract content is still fully editable
- The save indicator and auto-save continue to function
- The signing toggle continues to function
- A note shows: "Submitted — awaiting editor approval. You can still make edits."
- Once the editor approves (status `approved`), the form becomes read-only with a "Locked" indicator

### AC7: Editor abstract approval
**Given** an abstract with status `submitted`
**When** an editor calls `approveAbstract`
**Then:**
- The abstract status transitions from `submitted` to `approved`
- The abstract is no longer editable by the reviewer
- An audit trail entry is logged: `abstract_approved`
- The drafting form shows a read-only view with "Approved" badge

### AC8: Create draft (editor action)
**Given** an accepted submission with completed reviews
**When** an editor calls `createDraft` with a `submissionId` and `reviewerId`
**Then:**
- A new `reviewerAbstracts` record is created with status `drafting`, empty content, `wordCount: 0`, `isSigned: false`, `revision: 0`
- The mutation validates the submission status is `ACCEPTED`
- The mutation validates the reviewer has a review record (submitted or locked) for this submission
- The mutation validates no abstract already exists for this submission (one abstract per submission)
- An audit trail entry is logged: `abstract_assigned`

## Technical Notes

### Schema — index addition only

The `reviewerAbstracts` table already exists in `convex/schema.ts` with all needed fields:
```
submissionId: v.id('submissions')
reviewerId: v.id('users')
content: v.string()
wordCount: v.number()
isSigned: v.boolean()
status: v.union(v.literal('drafting'), v.literal('submitted'), v.literal('approved'))
revision: v.number()
createdAt: v.number()
updatedAt: v.number()
```

Existing index: `by_submissionId` on `['submissionId']`.

### Schema change required: add composite index

Add to `reviewerAbstracts` table definition in `convex/schema.ts`:
```typescript
.index('by_submissionId_reviewerId', ['submissionId', 'reviewerId'])
```

### New `convex/reviewerAbstracts.ts` module

Create a new file (default runtime, no `"use node"`):

1. **`getBySubmission` query** (uses `withUser`):
   - Args: `{ submissionId: v.id('submissions') }`
   - Returns the reviewer abstract record for the submission, or null
   - Access control: viewer must be the assigned reviewer, the submission author, or an editor-level role
   - Enriches the response with the reviewer's name (for display)
   - Returns: `v.union(v.null(), v.object({ _id: v.id('reviewerAbstracts'), content: v.string(), wordCount: v.number(), isSigned: v.boolean(), status: v.union(v.literal('drafting'), v.literal('submitted'), v.literal('approved')), revision: v.number(), reviewerName: v.string(), isOwnAbstract: v.boolean(), createdAt: v.number(), updatedAt: v.number() }))`

2. **`createDraft` mutation** (uses `withUser` + manual editor role check):
   - Args: `{ submissionId: v.id('submissions'), reviewerId: v.id('users') }`
   - Validates submission status is `ACCEPTED`
   - Validates the reviewer has a review record (submitted or locked) for this submission
   - Validates no `reviewerAbstracts` record exists for this submission already
   - Validates the caller has an editor-level role (`EDITOR_ROLES`)
   - Creates the record with `content: ''`, `wordCount: 0`, `isSigned: false`, `status: 'drafting'`, `revision: 0`
   - Logs audit: `abstract_assigned` with reviewer name in details
   - Returns: `v.object({ _id: v.id('reviewerAbstracts') })`

3. **`updateContent` mutation** (uses `withUser` + ownership check):
   - Args: `{ submissionId: v.id('submissions'), content: v.string(), expectedRevision: v.number() }`
   - Validates user is the assigned reviewer for this abstract
   - Validates abstract status is `drafting` or `submitted` (not `approved`)
   - Validates content length <= 5000 characters (generous limit, word count enforced at submit)
   - Checks optimistic concurrency: `abstract.revision === args.expectedRevision`
   - Computes `wordCount` server-side: `content.trim().split(/\s+/).filter(Boolean).length`
   - Patches: `content`, `wordCount`, `revision: revision + 1`, `updatedAt`
   - Returns: `v.object({ revision: v.number() })`

4. **`updateSigning` mutation** (uses `withUser` + ownership check):
   - Args: `{ submissionId: v.id('submissions'), isSigned: v.boolean() }`
   - Validates user is the assigned reviewer
   - Validates abstract status is `drafting` or `submitted`
   - Patches: `isSigned`, `updatedAt`
   - Returns: `v.null()`

5. **`submitAbstract` mutation** (uses `withUser` + ownership check):
   - Args: `{ submissionId: v.id('submissions'), expectedRevision: v.number() }`
   - Validates user is the assigned reviewer
   - Validates abstract status is `drafting` (idempotent if already `submitted`)
   - Validates `wordCount >= 150 && wordCount <= 500`
   - Checks optimistic concurrency
   - Patches: `status: 'submitted'`, `revision: revision + 1`, `updatedAt`
   - Logs audit: `abstract_submitted`
   - Returns: `v.null()`

6. **`approveAbstract` mutation** (uses `withUser` + editor role check):
   - Args: `{ submissionId: v.id('submissions') }`
   - Validates the caller has an editor-level role
   - Validates abstract status is `submitted`
   - Patches: `status: 'approved'`, `updatedAt`
   - Logs audit: `abstract_approved`
   - Returns: `v.null()`

### New UI component in `app/features/review/`

1. **`abstract-draft-form.tsx`** — `AbstractDraftForm` component:
   - Props: `submissionId: Id<'submissions'>`
   - Calls `useQuery(api.reviewerAbstracts.getBySubmission, { submissionId })` for reactive data
   - If query returns `null`, shows nothing (no abstract assignment for this reviewer)
   - State management follows `ReviewForm` pattern exactly:
     - Local `content` state synced with server
     - `localRevisionRef` for optimistic concurrency
     - `saveMutexRef` for serialized saves
     - `pendingSaveRef` to prevent sync overwrites
     - 500ms debounce timer for auto-save
   - **Layout:**
     - Prestigious header: "You've been selected to write the published abstract for this paper" (with an award/star icon)
     - Guidance text in a collapsible section
     - Textarea with Newsreader serif font (`font-serif text-base leading-[1.6]`)
     - Word counter below the textarea
     - Signing toggle with preview
     - Submit button (when in `drafting` status)
     - Status banner (submitted/approved states)
     - `SaveIndicator` component reused from review feature
   - **Read-only state:** When `status === 'approved'`, the form is disabled with an "Approved" badge
   - **Optimistic update:** On `updateContent`, optimistically update the local query cache (same pattern as `ReviewForm`)

### Files to create

```
convex/reviewerAbstracts.ts                        — NEW: reviewer abstract queries + mutations
app/features/review/abstract-draft-form.tsx        — NEW: abstract drafting interface
```

### Files to modify

```
convex/schema.ts                                   — MODIFY: add by_submissionId_reviewerId index to reviewerAbstracts
app/features/review/review-panel.tsx               — MODIFY: add Abstract tab for accepted submissions with abstract assignment
app/features/review/index.ts                       — MODIFY: export AbstractDraftForm
```

### Implementation sequence

1. **Modify `convex/schema.ts`** — add `by_submissionId_reviewerId` index to `reviewerAbstracts` table.

2. **Create `convex/reviewerAbstracts.ts`** — all 6 functions: `getBySubmission`, `createDraft`, `updateContent`, `updateSigning`, `submitAbstract`, `approveAbstract`.

3. **Create `app/features/review/abstract-draft-form.tsx`** — drafting interface with auto-save, word counter, signing toggle, submit flow, read-only approved state.

4. **Update `app/features/review/review-panel.tsx`** — add Abstract tab that renders when submission status is ACCEPTED. The `AbstractDraftForm` component inside the tab handles its own data loading via `useQuery(api.reviewerAbstracts.getBySubmission)` and gracefully handles the null state (no assignment). Requires new `submissionStatus` prop on `ReviewPanel`.

5. **Update `app/features/review/index.ts`** — add `AbstractDraftForm` export.

6. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`, `useMutation`
- Import from `~/components/ui/` for shadcn components
- Import from `~/features/review` for feature components (barrel export)
- Import from `convex/_generated/api` for API references

### shadcn/ui components to use

- `Textarea` — abstract content input (already installed)
- `Button` — submit action (already installed)
- `Switch` — signing toggle (already installed)
- `Badge` — status indicators (already installed)
- `Label` — form labels (already installed)
- `Separator` — section dividers (already installed)
- `AlertDialog` — submit confirmation (already installed)
- lucide-react icons: `AwardIcon`, `SendIcon`, `LockIcon`, `CheckIcon`, `UserIcon`, `EyeOffIcon`

### Component data flow

```
$submissionId.tsx (route)
  ├─ useQuery(api.reviews.getSubmissionForReviewer) → { submission, review }
  ├─ <ReviewPanel
  │    submissionId={submission._id}
  │    reviewId={review._id}
  │    sections={review.sections}
  │    revision={review.revision}
  │    status={review.status}
  │    submittedAt={review.submittedAt}
  │    submissionStatus={submission.status}   ← NEW PROP
  │  />
  │    ├─ Tab "Write Review": <ReviewForm ... />
  │    ├─ Tab "Discussion": <DiscussionThread ... />
  │    ├─ Tab "Abstract" (conditional — only for ACCEPTED submissions):
  │    │    └─ <AbstractDraftForm submissionId={...} />
  │    │         ├─ useQuery(api.reviewerAbstracts.getBySubmission)
  │    │         │    → { content, wordCount, isSigned, status, revision, reviewerName, isOwnAbstract }
  │    │         ├─ Prestigious header + guidance
  │    │         ├─ Textarea (Newsreader font, auto-save at 500ms)
  │    │         ├─ Word counter (colored by range)
  │    │         ├─ Signing toggle + preview
  │    │         ├─ Submit button (if drafting + valid word count)
  │    │         ├─ Status banner (submitted/approved)
  │    │         └─ SaveIndicator
  │    └─ Tab "Guidelines": static content (unchanged)
```

### Auto-save pattern (from ReviewForm — replicate exactly)

```typescript
// 500ms debounce
const DEBOUNCE_MS = 500

// Mutex to serialize saves
const saveMutexRef = useRef<Promise<void>>(Promise.resolve())

// Local revision tracking
const localRevisionRef = useRef(serverRevision)

// Pending save flag to prevent sync overwrites
const pendingSaveRef = useRef(false)

// Timer ref for debounce
const timerRef = useRef<ReturnType<typeof setTimeout>>()

function handleContentChange(newContent: string) {
  setLocalContent(newContent)
  if (timerRef.current) clearTimeout(timerRef.current)
  timerRef.current = setTimeout(() => {
    timerRef.current = undefined
    void saveContent(newContent)
  }, DEBOUNCE_MS)
}
```

### Word count algorithm

```typescript
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
```

Used both client-side (for live counter) and server-side (stored in `wordCount` field).

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| One abstract per submission constraint violated | Multiple conflicting abstracts | `createDraft` checks for existing record; schema allows only one per submission via validation |
| Reviewer edits after editor approval | Data inconsistency | `updateContent` and `updateSigning` check status !== 'approved'; `approveAbstract` transitions to terminal editable state |
| Word count mismatch between client and server | Confusing UX, submit fails unexpectedly | Same `countWords` algorithm on both sides; server is authoritative |
| Version conflict during auto-save | Lost edits | Same conflict resolution pattern as ReviewForm: reload/keep options |
| Editor selects reviewer who didn't review | Invalid assignment | `createDraft` validates reviewer has submitted/locked review for submission |
| Abstract tab visible when no assignment | Confusing empty tab | Tab only renders when `getBySubmission` returns non-null for the current user |

### Dependencies on this story

- **Story 5.2 (Author Acceptance):** Author reviews the abstract submitted here and either accepts or requests revisions via discussion.
- **Story 5.3 (Published Article Page):** Displays the approved reviewer abstract alongside the author abstract.
- **Story 7.3 (Seed Data):** Seeds sample reviewer abstracts in various states (drafting, submitted, approved).

### What "done" looks like

- `convex/schema.ts` updated with `by_submissionId_reviewerId` index on `reviewerAbstracts`
- `convex/reviewerAbstracts.ts` exists with `getBySubmission`, `createDraft`, `updateContent`, `updateSigning`, `submitAbstract`, `approveAbstract`
- All new Convex functions define `args` and `returns` validators
- `app/features/review/abstract-draft-form.tsx` exists with auto-save, word counter, signing toggle
- `app/features/review/review-panel.tsx` updated with conditional Abstract tab
- `app/features/review/index.ts` updated with new export
- Auto-save pattern matches ReviewForm: 500ms debounce, optimistic concurrency, mutex, conflict resolution
- Word counter shows colored state: amber (< 150), green (150-500), red (> 500)
- Signing toggle with preview of published attribution
- Submit flow with confirmation dialog and validation (150-500 words)
- Editable until editor approves (Tier 2 edit window)
- Approved state shows read-only view with badge
- Audit trail entries for: `abstract_assigned`, `abstract_submitted`, `abstract_approved`
- Prestigious messaging communicates the selection as an honor
- `bunx convex dev --once` succeeds
- `bun run build` succeeds
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The `withUser` wrapper is appropriate for most abstract functions since multiple roles need access (reviewer drafts, editor approves, author will view in Story 5.2). Use `withUser` + manual checks rather than `withReviewer` (which is too restrictive — only allows the reviewer role).
- The `reviewerAbstracts` table uses `reviewerId` to refer to the reviewer writing the abstract. This is the user who was selected by the editor.
- For the word counter, use `text.trim().split(/\s+/).filter(Boolean).length` both client-side and server-side to ensure consistency.
- The `content` field starts as empty string `''` when the draft is created. The `wordCount` starts at `0`.
- The `revision` field starts at `0` and increments on each `updateContent` call. The `submitAbstract` mutation also increments revision.
- The signing toggle uses `useMutation(api.reviewerAbstracts.updateSigning)` directly (no debounce — it's a single boolean toggle).
- **Abstract tab visibility (matches AC1):** The Abstract tab in `ReviewPanel` is only rendered when the submission status is ACCEPTED. Inside the tab, `AbstractDraftForm` calls `useQuery(api.reviewerAbstracts.getBySubmission)` and handles the null state (no assignment) by showing nothing or a brief "No abstract assignment" message. The tab itself is always visible for ACCEPTED submissions to avoid needing to prop-drill query results, but the content inside handles the null/loading states gracefully. This is consistent with how `DiscussionThread` handles its own data loading.
- The `createDraft` mutation is called from the editor UI, not from the reviewer workspace. For this story, focus on the reviewer-facing drafting experience. The editor-side "select reviewer for abstract" UI is minimal — just ensure the mutation works correctly. Future editor-side stories can build a proper selection UI.
- Reuse `SaveIndicator` from `./save-indicator.tsx` — it's already exported from the barrel.
- Newsreader font for the textarea: use `font-serif` (Newsreader is configured as the serif font in the design system).
- The `getBySubmission` query should also return `isOwnAbstract: boolean` (true when the viewer is the assigned reviewer). This helps the frontend determine whether to show the editing interface or a read-only preview.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 5 spec | Sprint Agent |
| 2026-02-08 | Fixed: Resolved conflicting Abstract tab visibility strategies. Consolidated to single approach: tab renders for ACCEPTED submissions, AbstractDraftForm handles null state internally (consistent with DiscussionThread pattern). Fixed contradictory schema headers. Added submissionStatus prop to component data flow. | Sprint Agent |
