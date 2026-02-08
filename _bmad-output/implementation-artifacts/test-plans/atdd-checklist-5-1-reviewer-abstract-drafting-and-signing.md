# ATDD Checklist: 5-1 Reviewer Abstract Drafting and Signing

## AC1: Abstract drafting interface for selected reviewer

- [x] `ReviewPanel` accepts `submissionStatus` prop
- [x] "Abstract" tab appears in `ReviewPanel` when `submissionStatus === 'ACCEPTED'`
- [x] Abstract tab does NOT appear for non-ACCEPTED submissions
- [x] `AbstractDraftForm` component renders loading state while query is pending
- [x] `AbstractDraftForm` shows "No abstract assignment" when `getBySubmission` returns null
- [x] `AbstractDraftForm` shows read-only view for non-assigned viewers (`isOwnAbstract === false`)
- [x] Prestigious header: "You've been selected to write the published abstract for this paper"
- [x] Guidance text: "Write the abstract a potential reader would most want to read..."
- [x] Textarea uses `font-serif` class for Newsreader serif font
- [x] Award icon present in header

## AC2: Auto-save with 500ms debounce

- [x] `updateContent` mutation implements optimistic concurrency via `revision` field
- [x] Client uses 500ms debounce timer before triggering save
- [x] `SaveIndicator` component reused from review feature (idle/saving/saved/error states)
- [x] Mutex serializes concurrent save requests (`saveMutexRef`)
- [x] `pendingSaveRef` prevents server sync from overwriting in-flight edits
- [x] Version conflict detection shows reload/keep options on `VERSION_CONFLICT` error
- [x] Optimistic update via `.withOptimisticUpdate()` on `updateContent` mutation
- [x] `wordCount` computed server-side on each save via `countWords()`

## AC3: Word count validation

- [x] Live word counter shows current count
- [x] Counter shows amber color when below 150 words
- [x] Counter shows green color when between 150-500 words
- [x] Counter shows red color when above 500 words
- [x] "Submit Abstract" button disabled when word count outside 150-500 range
- [x] `submitAbstract` mutation validates word count server-side (rejects < 150 or > 500)
- [x] Word count algorithm: `text.trim().split(/\s+/).filter(Boolean).length` (same client/server)

## AC4: Signing choice

- [x] Switch toggle with label: "Sign this abstract with your name"
- [x] Default is off (anonymous) — `isSigned: false` in `createDraft`
- [x] When on, preview shows: "Published as: [Reviewer Name]"
- [x] When off, preview shows: "Published as: Anonymous Reviewer"
- [x] Toggle calls `updateSigning` mutation immediately (no debounce)
- [x] Signing toggle disabled when abstract is approved
- [x] `updateSigning` validates status is not `approved`

## AC5: Abstract submission

- [x] "Submit Abstract" button visible in `drafting` status
- [x] AlertDialog confirmation: "Submit your abstract for editor review? You can continue editing until the editor approves it."
- [x] `submitAbstract` mutation transitions from `drafting` to `submitted`
- [x] Success banner: "Submitted — awaiting editor approval. You can still make edits."
- [x] Form remains editable after submission (Tier 2 — until editor approves)
- [x] Audit trail: `abstract_submitted` logged via scheduler
- [x] `submitAbstract` is idempotent if already `submitted`
- [x] `submitAbstract` checks optimistic concurrency (expectedRevision)

## AC6: Editable until editor approval

- [x] Submitted abstract content is still fully editable
- [x] SaveIndicator and auto-save continue to function in submitted state
- [x] Signing toggle continues to function in submitted state
- [x] Status banner shows for submitted state
- [x] Once approved, form becomes read-only with "Approved" badge and "Locked" indicator

## AC7: Editor abstract approval

- [x] `approveAbstract` mutation requires editor-level role (`EDITOR_ROLES`)
- [x] Transitions from `submitted` to `approved`
- [x] Rejects if status is not `submitted`
- [x] Audit trail: `abstract_approved` logged via scheduler
- [x] Read-only view shows "Approved" badge with CheckIcon

## AC8: Create draft (editor action)

- [x] `createDraft` mutation requires editor-level role
- [x] Creates record with `content: ''`, `wordCount: 0`, `isSigned: false`, `status: 'drafting'`, `revision: 0`
- [x] Validates submission status is `ACCEPTED`
- [x] Validates reviewer has submitted or locked review for this submission
- [x] Validates no abstract already exists for this submission
- [x] Audit trail: `abstract_assigned` with reviewer name in details
- [x] Returns `{ _id }` of created record

## Schema & Infrastructure

- [x] `by_submissionId_reviewerId` composite index added to `reviewerAbstracts` table
- [x] `getSubmissionForReviewer` query returns `submission.status` for `submissionStatus` prop
- [x] `AbstractDraftForm` exported from `app/features/review/index.ts` barrel
- [x] `convex/reviewerAbstracts.ts` created with all 6 functions
- [x] All Convex functions define `args` and `returns` validators

## Verification

- [x] `bunx convex dev --once` succeeds (index deployed)
- [x] `bun run typecheck` passes with zero errors
- [x] `bun run lint` passes
- [x] `bun run build` succeeds
- [x] `bun run test` — 73 tests pass, no regressions
