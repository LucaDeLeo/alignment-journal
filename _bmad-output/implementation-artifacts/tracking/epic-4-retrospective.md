# Retrospective: Epic 4 - Review Process & Semi-Confidential Discussion

**Date:** 2026-02-08
**Epic:** 4 - Review Process & Semi-Confidential Discussion
**FRs Covered:** FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35
**Duration:** ~155 minutes (~2h 35m)
**Sprint Mode:** YOLO (rapid implementation, no pre-implementation test gates)
**Stories:** 4

---

## 1. Epic Summary

Epic 4 delivered the complete reviewer-facing experience for the Alignment Journal: secure invitation acceptance with inline Clerk sign-up and automatic role upgrade, a split-view review workspace with inline PDF rendering and responsive layout, a structured 5-section review form with per-section auto-save via debounced mutations and optimistic concurrency control, and a semi-confidential threaded discussion system with server-side identity gating, role-based pseudonym assignment, tiered edit/retraction windows, and public conversation toggle for rejected submissions.

This is the first epic to build an entirely new user-facing role experience (reviewer) end-to-end, from onboarding through task completion. All 4 stories were implemented and merged. TypeScript clean, ESLint clean, and all 73 tests pass. No new tests were added during this epic.

### Stories Delivered

| Story | Title | Duration | Commits | Review Fix Cycles |
|-------|-------|----------|---------|-------------------|
| 4-1 | Reviewer Invitation Acceptance and Onboarding | 31m 14s | 1 | 0 |
| 4-2 | Split-View Review Workspace with Inline PDF | 30m 21s | 1 | 0 |
| 4-3 | Structured Review Form with Auto-Save | 53m 58s | 4 | 3 |
| 4-4 | Semi-Confidential Threaded Discussion | 39m 04s | 3 | 1 |

**Total commits:** 9
**Total files changed:** 54 (6,917 insertions, 811 deletions)

---

## 2. Key Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Stories completed | 4/4 (100%) | Excellent |
| Stories failed | 0 | Excellent |
| Total duration | ~155 minutes | Consistent with 4-story epics |
| Average story duration | ~39 minutes | Up from ~30 min (Epics 2-3) |
| Total commits | 9 | Clean history |
| Average review fix cycles | 1.0 | Acceptable (skewed by 4-3) |
| Tests passing | 73/73 (100%) | No regressions |
| New tests added | 0 | None -- YOLO mode |
| Tech debt items resolved | 0 | None |
| New tech debt identified | 6 (see Section 6) | Significant |
| P0 tech debt items open (carried) | 7 (TD-010, TD-013, TD-014, TD-024, TD-025, TD-026, TD-027) | Critical accumulation |

### Velocity Comparison Across All Epics

| Metric | Epic 1 | Epic 2 | Epic 3 | Epic 4 | Trend |
|--------|--------|--------|--------|--------|-------|
| Stories | 4 | 4 | 7 | 4 | -- |
| Total duration | ~160 min | ~116 min | ~207 min | ~155 min | Epic 4 proportional |
| Avg story duration | ~40 min | ~29 min | ~30 min | ~39 min | Up 30% vs E2/E3 |
| Fastest story | 22 min (1-1) | 17 min (2-4) | 22 min (3-6) | 30 min (4-2) |
| Slowest story | 50 min (1-3) | 34 min (2-1) | 41 min (3-7) | 54 min (4-3) | New max |
| Stories/hour | 1.5 | 2.1 | 2.0 | 1.5 | Regression |
| Commits per story | 2.5 | 2.0 | 2.6 | 2.25 | Consistent |

**Velocity analysis:** Epic 4's average story duration (39 min) is 30% higher than Epics 2-3 (~30 min), and stories/hour dropped from ~2.0 to ~1.5. This is attributable to two factors:

1. **Higher per-story complexity.** Epic 4 stories are architecturally denser than prior epics. Story 4-3 alone introduced optimistic concurrency control, per-section debounce timers with save mutex serialization, version conflict resolution UI, a scheduled auto-lock mechanism, and a pre-submission summary dialog. Story 4-4 implemented server-side identity gating with pseudonym assignment, a threaded message model with edit/retract windows, and reactive new-message highlighting. These are not simple CRUD stories.

2. **Story 4-3 required 3 review fix cycles.** This single story consumed 54 minutes and 4 commits (1 feat + 3 fix), making it the longest story across all 4 epics. The fix cycles addressed: (a) extracting `ReviewForm` state management from `ReviewPanel`, (b) adding a save mutex to prevent concurrent `VERSION_CONFLICT` errors from racing debounce timers, and (c) adding server-side edit window validation in `updateSection` for submitted reviews.

### Story Complexity Pattern

| Story | Type | New Files | Modified Files | Duration | Fix Cycles | Notes |
|-------|------|-----------|----------------|----------|------------|-------|
| 4-1 | Full-stack (2 mutations/queries + 1 route + layout update) | 1 | 2 | 31 min | 0 | Clean first-pass; reused hashToken helper |
| 4-2 | Full-stack (3 queries/mutations + 1 action + 6 components + 3 shadcn installs) | 12 | 3 | 30 min | 0 | Most new files; established feature folder |
| 4-3 | Full-stack (3 mutations + 4 components + optimistic updates) | 4 | 4 | 54 min | 3 | Highest complexity; most review cycles |
| 4-4 | Full-stack (5 mutations/queries + 3 components + identity gating) | 4 | 3 | 39 min | 1 | Server-side confidentiality logic |

**Observation:** Story 4-2 created 12 new files in 30 minutes with zero review cycles -- the fastest large-scope story across all epics. This is because it was primarily structural (layout, panels, placeholders) with well-defined backend contracts. In contrast, Story 4-3 with only 4 new files took 54 minutes because it contained the most complex state management logic in the codebase.

---

## 3. What Went Well

### 3.1 Clean separation between workspace structure and interactive behavior

Story 4-2 established the workspace shell (split-view panels, tab structure, PDF rendering, responsive layout) with placeholder content, and Stories 4-3 and 4-4 filled in the placeholders with interactive behavior. This allowed 4-2 to complete in 30 minutes with zero review cycles, despite creating 12 new files. The pattern of "structure first, behavior second" proved effective for the review workspace.

**Evidence:** `app/features/review/review-panel.tsx` started with a placeholder card in the Write tab and a placeholder message in the Discussion tab. Story 4-3 replaced the Write tab with `<ReviewForm>` and Story 4-4 replaced the Discussion tab with `<DiscussionThread>`. No layout changes were needed.

### 3.2 Server-side identity gating eliminates client-side confidentiality risks

The semi-confidential discussion system (`convex/discussions.ts`, `listBySubmission` query) computes display names server-side based on viewer role and submission status. The client never receives real reviewer names when the viewer is an author and the submission has not been accepted. This is a security-by-design decision that prevents confidentiality leaks from client-side rendering bugs or browser devtools inspection.

**Evidence:** Lines 149-188 of `convex/discussions.ts` implement the identity gating logic:
- `shouldAnonymizeReviewers` is computed from `viewerRole === 'author' && submission.status !== 'ACCEPTED'`
- Reviewer names are replaced with deterministic pseudonyms ("Reviewer 1", "Reviewer 2") based on first message appearance order
- Avatar initials are derived from pseudonyms ("R1", "R2") when anonymized
- The enriched message objects returned to the client contain only the gated `displayName`, never the raw user name

### 3.3 Feature folder `app/features/review/` scaled from 0 to 13 components across 3 stories

The review feature folder was created in Story 4-2 with 6 initial components and grew to 13 by Story 4-4. The barrel export (`index.ts`) was updated incrementally in each story. The naming convention (`workspace-header.tsx`, `review-form.tsx`, `discussion-thread.tsx`) is consistent and discoverable.

**Evidence:** `app/features/review/index.ts` exports 13 components and 1 type:
- Workspace: `WorkspaceHeader`, `PaperPanel`, `ReviewPanel`, `ConfidentialityBadge`, `ProgressRing`
- Review form: `ReviewForm`, `ReviewSectionField`, `SaveIndicator`, `PreSubmitSummary`
- Discussion: `DiscussionThread`, `DiscussionMessage`, `DiscussionComposer`
- Type: `SaveState`

### 3.4 Invitation acceptance flow reused existing helpers cleanly

Story 4-1 added `acceptInvitation` and `getInviteStatus` to the existing `convex/invitations.ts` without refactoring. The existing `hashToken()` helper and `deriveInviteStatus()` function were reused directly. The route layout bypass for `/review/accept/*` was implemented with a clean `pathname.startsWith` check in both `beforeLoad` and the layout component.

**Evidence:** `app/routes/review/route.tsx` lines 19-20 and 34-37 show the dual path check:
```typescript
// beforeLoad
if (location.pathname.startsWith('/review/accept/')) return
// component
const isAcceptRoute = location.pathname.startsWith('/review/accept/')
const hasAccess = isAcceptRoute || (user && hasRole(user.role, ALLOWED_ROLES))
```

### 3.5 Optimistic concurrency control pattern is well-implemented

The `updateSection` mutation in `convex/reviews.ts` implements a proper optimistic concurrency control (OCC) pattern: the mutation accepts an `expectedRevision` parameter, compares it against `review.revision`, throws `versionConflictError()` on mismatch, and increments `revision` on success. The frontend uses `withOptimisticUpdate` from Convex to update the local cache immediately, with automatic rollback on server rejection.

**Evidence:** `convex/reviews.ts` lines 256-258:
```typescript
if (review.revision !== args.expectedRevision) {
  throw versionConflictError()
}
```

The frontend in `review-form.tsx` implements a save mutex (`saveMutexRef`) to serialize concurrent saves and prevent race conditions between debounce timers. This addresses a real concurrency issue where typing in Section A and Section B simultaneously could produce concurrent mutations that both read the same `revision`, causing the second to fail. The mutex chains saves sequentially.

### 3.6 Story 4-1 completed with zero review cycles

The invitation acceptance story was the cleanest implementation in the epic. One commit, zero fix cycles, 31 minutes. This demonstrates that well-specified stories with clear backend contracts and limited frontend scope (a single route page) can complete efficiently.

---

## 4. What Could Improve

### 4.1 Story 4-3 was the longest and most review-intensive story across all epics

At 54 minutes and 3 review fix cycles, Story 4-3 is an outlier. The 3 fix commits (`f177e48`, `a8e683f`, `45e5998`) addressed:

1. **Cycle 1 (`a8e683f`):** Extracted `ReviewForm` from being inline in `ReviewPanel` to its own component. This suggests the initial implementation conflated form state with panel layout.
2. **Cycle 2 (`45e5998`):** Added save mutex serialization, `pendingSavesRef` tracking, and improved server sync logic. This was a concurrency fix that should have been part of the initial implementation.
3. **CLAUDE.md update (`33d1c0d`):** A separate commit just to update the project-level CLAUDE.md -- unusual for a story commit.

**Root cause:** The auto-save with optimistic concurrency control is the most complex client-side state management in the project. The spec described the debounce pattern and OCC pattern independently, but their interaction (concurrent debounce timers creating concurrent mutations with the same expected revision) was not anticipated in the story spec. The save mutex was a fix, not a planned feature.

**Recommendation:** Future stories involving concurrent state updates should include an explicit "concurrency analysis" section in the spec, identifying potential race conditions and their mitigations.

### 4.2 Zero tests written across all 4 stories

Epic 4 added zero new tests. The test count remains at 73 (same as end of Epic 3). This is the fourth consecutive epic where YOLO mode produced zero test coverage for new code. The accumulated untested code now spans:

- **Backend:** 3 new Convex modules (`convex/reviews.ts`, `convex/discussions.ts`, `convex/pdfExtraction.ts` / `convex/pdfExtractionActions.ts`) with 14 exported functions
- **Frontend:** 13 new components in `app/features/review/` with complex state management (debounce, optimistic updates, version conflicts, edit windows, real-time highlights)
- **Across all epics:** 40+ frontend components, 30+ Convex functions, zero component tests, zero integration tests

### 4.3 Node.js action file split happened as a side effect of Story 4-4

The final commit of Story 4-4 (`9660b27`) contains a significant refactoring: splitting three `"use node"` files into separate action files:

- `convex/triage.ts` -> `convex/triageActions.ts` (392 lines moved)
- `convex/matching.ts` -> `convex/matchingActions.ts` (391 lines moved)
- `convex/pdfExtraction.ts` -> `convex/pdfExtractionActions.ts` (84 lines moved)

This refactoring was necessary (Convex requires `"use node"` files to only export actions, not queries/mutations) but was done as part of a feature story rather than as a dedicated infrastructure task. The commit changed 15 files and moved 867 lines of code. It accounts for over half of the 945 insertions / 883 deletions in that commit. This made the feature commit harder to review and introduced risk of regressions to the triage and matching subsystems.

**Evidence:** The `git log --stat` for commit `9660b27` shows 6 Convex files changed (triage.ts, triageActions.ts, matching.ts, matchingActions.ts, pdfExtraction.ts, pdfExtractionActions.ts) with a combined 1,332 lines of churn.

**Recommendation:** Infrastructure refactoring should be done in a separate commit, not bundled with feature work. The `convex/CLAUDE.md` was correctly updated to document the split pattern, but the commit hygiene was poor.

### 4.4 `pdfExtractionActions.ts` naming follows new split pattern but was created during Epic 4-2

Story 4-2 created `convex/pdfExtraction.ts` as a `"use node"` file containing both internal queries/mutations and the `extractPdfText` action. This worked initially because all exports were actions or internal functions. However, when Story 4-4 needed to split all `"use node"` files, `pdfExtraction.ts` was retroactively split into `pdfExtraction.ts` (queries/mutations) and `pdfExtractionActions.ts` (actions). The API reference changed from `api.pdfExtraction.extractPdfText` to `api.pdfExtractionActions.extractPdfText`, requiring a route file update.

### 4.5 Accumulated P0 tech debt is now at 7 items from 3 prior epics

The following P0 items remain unresolved across 4 epics:

| ID | Source | Description | Epics Open |
|----|--------|-------------|------------|
| TD-010 | Epic 1 | Auth/RBAC wrappers zero test coverage | 4 epics |
| TD-013 | Epic 2 | Triage safety mechanisms zero test coverage | 3 epics |
| TD-014 | Epic 2 | Submission mutation/query auth zero test coverage | 3 epics |
| TD-024 | Epic 3 | Audit log creation and append-only invariant zero tests | 2 epics |
| TD-025 | Epic 3 | Embedding generation pipeline zero tests | 2 epics |
| TD-026 | Epic 3 | Invitation token hashing zero tests | 2 epics |
| TD-027 | Epic 3 | Undo decision time window validation zero tests | 2 epics |

TD-010 has been carried for 4 consecutive epics. This is a systemic pattern: each epic adds more code that depends on untested foundations without ever paying down the debt.

---

## 5. Key Patterns Established

### 5.1 Feature Folder Pattern: `app/features/review/`

Epic 4 established the `app/features/review/` feature folder as the third major feature folder in the project (after `app/features/submissions/` and `app/features/editor/`). The folder grew from 0 to 13 components across 3 stories.

**Established pattern:**
```
app/features/review/
  index.ts                    -- barrel export (13 exports)
  workspace-header.tsx        -- breadcrumb + confidentiality badge
  paper-panel.tsx             -- inline paper content with typography
  review-panel.tsx            -- tabbed panel container (Write/Discussion/Guidelines)
  confidentiality-badge.tsx   -- green "Hidden from authors" pill badge
  progress-ring.tsx           -- SVG circular progress (0-5 sections)
  review-form.tsx             -- 5-section form with auto-save, OCC, submit
  review-section-field.tsx    -- individual section: textarea + badge + word count + guidance
  save-indicator.tsx          -- Saved/Saving.../Error persistent indicator
  pre-submit-summary.tsx     -- AlertDialog with full review preview
  discussion-thread.tsx       -- threaded message container with identity gating
  discussion-message.tsx      -- individual message: avatar + role badge + edit/retract
  discussion-composer.tsx     -- message input: Cmd+Enter, character counter, reply-to
```

**Key conventions:**
- Components named by domain-concern: `review-form`, `discussion-thread`, `save-indicator`
- Self-contained discussion components: `DiscussionThread` loads its own data via `useQuery` (does not depend on parent props for data)
- Exported types alongside components: `SaveState` type from `save-indicator.tsx`
- Utility functions co-located with consuming component: `countWords()`, `getSectionStatus()` in `review-section-field.tsx`

### 5.2 Convex Auth Wrapper Pattern: `withReviewer` for Assignment-Aware Access

The review workspace uses `withReviewer` (from `convex/helpers/auth.ts`) for queries and mutations that require both reviewer role AND a matching review record for the specified submission. This is stricter than `withUser` + manual role check.

**Usage in Epic 4:**
- `getSubmissionForReviewer` -- uses `withReviewer` (assignment-gated read)
- `startReview` -- uses `withReviewer` (assignment-gated status transition)
- `updateSection` -- uses `withReviewer` (assignment-gated section save)
- `submitReview` -- uses `withReviewer` (assignment-gated submission)

**Contrast with discussion functions:**
- `listBySubmission`, `postMessage`, `editMessage`, `retractMessage`, `togglePublicConversation` -- use `withUser` (discussion participants include authors and editors, not just reviewers)

**Pattern rule:** Use `withReviewer` when the operation is specific to a reviewer's assignment for a particular submission. Use `withUser` when the operation spans multiple participant roles (author, reviewer, editor).

### 5.3 Optimistic Concurrency for Auto-Save

The auto-save pattern established in Story 4-3 is the first use of optimistic concurrency control in the project.

**Server side (`convex/reviews.ts`):**
- `updateSection` mutation accepts `expectedRevision: v.number()`
- Compares `review.revision !== args.expectedRevision` before writing
- Throws `versionConflictError()` on mismatch
- Increments `revision` on every successful write
- Guards against saves to `locked` or `assigned` status
- For `submitted` status, validates the 15-minute edit window (`submittedAt + 15min > Date.now()`)

**Client side (`review-form.tsx`):**
- `localRevisionRef` tracks the current known revision
- `saveMutexRef` serializes concurrent saves (prevents concurrent mutations from reading the same revision)
- `pendingSavesRef` tracks in-flight saves per section (prevents server sync from overwriting local edits)
- `withOptimisticUpdate` updates the local cache immediately
- On `VERSION_CONFLICT` error: preserves local draft, shows conflict banner with "Reload server version" / "Keep my version" buttons

### 5.4 Semi-Confidential Identity Model

The semi-confidential identity model is enforced server-side in `convex/discussions.ts`:

**Identity visibility matrix:**

| Viewer Role | Submission Status | Reviewer Display | Author Display | Editor Display |
|------------|-------------------|-----------------|----------------|----------------|
| Author | UNDER_REVIEW / DECISION_PENDING | Pseudonym (Reviewer N) | Own name | Real name |
| Author | ACCEPTED | Real name (revealed) | Own name | Real name |
| Author | REJECTED | Pseudonym (permanent) | Own name | Real name |
| Reviewer | Any | Real names | Real name | Real name |
| Editor | Any | Real names | Real name | Real name |

**Pseudonym assignment algorithm:**
1. Sort all messages by `createdAt` ascending
2. Iterate messages; for each reviewer author not yet seen, assign incrementing "Reviewer N"
3. Map is deterministic per submission (consistent across page loads)

**Implementation location:** `convex/discussions.ts` lines 116-189

### 5.5 Scheduled State Transitions

Two scheduled state transitions were implemented in Epic 4:

1. **Review auto-lock** (`convex/reviews.ts`): `submitReview` schedules `lockReview` via `ctx.scheduler.runAfter(15 * 60 * 1000, internal.reviews.lockReview, { reviewId })`. The `lockReview` internalMutation is idempotent (only transitions from `submitted`).

2. **Discussion edit window** (`convex/discussions.ts`): Messages have `editableUntil: Date.now() + 5 * 60 * 1000` set at insert time. No scheduler needed -- the mutation checks `Date.now() < editableUntil` at edit time.

**Pattern difference:** The review lock uses a scheduler because the state transition must happen reliably even if the reviewer closes the browser. The discussion edit window uses a server-side time check because no state transition is needed -- the edit simply fails if the window has passed.

### 5.6 Node.js Action File Split Pattern

Epic 4 formalized the pattern of splitting Convex modules into two files:
- `{name}.ts` -- queries, mutations, internalQueries, internalMutations (default Convex runtime)
- `{name}Actions.ts` -- actions and internalActions with `"use node"` (Node.js runtime)

**Files following this pattern:**
- `convex/triage.ts` + `convex/triageActions.ts`
- `convex/matching.ts` + `convex/matchingActions.ts`
- `convex/pdfExtraction.ts` + `convex/pdfExtractionActions.ts`

This pattern was documented in `convex/CLAUDE.md` during Epic 4.

---

## 6. Tech Debt Inventory

### New Tech Debt from Epic 4

| ID | Story | Description | Priority | Location |
|----|-------|-------------|----------|----------|
| TD-029 | 4-1 | Zero tests for `acceptInvitation` mutation (token validation, role upgrade, audit logging) and `getInviteStatus` query | P0 | `convex/invitations.ts` |
| TD-030 | 4-2 | Zero tests for `listByReviewer`, `getSubmissionForReviewer`, `startReview` functions; `extractPdfText` action untested | P0 | `convex/reviews.ts`, `convex/pdfExtractionActions.ts` |
| TD-031 | 4-3 | Zero tests for `updateSection` OCC logic, `submitReview` validation, `lockReview` scheduler, auto-save debounce | P0 | `convex/reviews.ts`, `app/features/review/review-form.tsx` |
| TD-032 | 4-4 | Zero tests for `listBySubmission` identity gating, `postMessage` participant validation, `editMessage` time window, `retractMessage` idempotency, `togglePublicConversation` author guard | P0 | `convex/discussions.ts` |
| TD-033 | 4-4 | Pseudonym assignment is non-persistent -- relies on message sort order; adding a future "reviewer posted but deleted all messages" edge case would break assignment | P2 | `convex/discussions.ts` |
| TD-034 | 4-4 | Node.js action file split bundled with feature commit; `matching.ts` and `triage.ts` code moved in same commit as 4-4 feature work | P3 | Git history |

### Carried Tech Debt (from prior epics, still open)

| ID | Source | Priority | Epics Carried |
|----|--------|----------|---------------|
| TD-010 | Epic 1 | P0 | 4 |
| TD-013 | Epic 2 | P0 | 3 |
| TD-014 | Epic 2 | P0 | 3 |
| TD-015 | Epic 2 | P1 | 3 |
| TD-016 | Epic 2 | P2 | 3 |
| TD-017 | Epic 3 | P2 | 2 |
| TD-018 | Epic 3 | P2 | 2 |
| TD-019 | Epic 3 | P2 | 2 |
| TD-024 | Epic 3 | P0 | 2 |
| TD-025 | Epic 3 | P0 | 2 |
| TD-026 | Epic 3 | P0 | 2 |
| TD-027 | Epic 3 | P0 | 2 |
| TD-028 | Epic 3 | P1 | 2 |
| TD-004 | Epic 1 | Low | 4 (deferred to Convex platform) |

**P0 summary:** 11 P0 items open across 4 epics. All are zero-test-coverage gaps for security-critical and data-integrity-critical code paths. Zero P0 items were resolved in Epic 4.

---

## 7. CLAUDE.md Recommendations

Based on patterns established in Epic 4, the following additions/changes should be made to CLAUDE.md files:

### Root `CLAUDE.md`

**Add to "Key Patterns" section:**

1. **Review Feature Folder:**
   ```
   - Established folder: `app/features/review/` (13 files) -- workspace, review form, discussion
   ```
   (Add to the existing "Feature Folder Pattern" subsection alongside submissions and editor)

2. **Optimistic Concurrency Pattern:**
   ```
   ### Auto-Save with Optimistic Concurrency
   - Server: `expectedRevision` arg, compare against `review.revision`, throw `versionConflictError()`, increment on success
   - Client: `localRevisionRef` + `saveMutexRef` for serialized saves + `withOptimisticUpdate` for instant cache
   - Conflict UI: preserve local draft, show "Reload server version" / "Keep my version" buttons
   - Used by: `convex/reviews.ts` `updateSection` + `app/features/review/review-form.tsx`
   ```

3. **Semi-Confidential Identity Model:**
   ```
   ### Semi-Confidential Identity Gating
   - Server-side only: `convex/discussions.ts` `listBySubmission` computes display names based on viewer role + submission status
   - Authors see pseudonyms ("Reviewer 1") unless submission is ACCEPTED; reviewers/editors always see real names
   - Client never receives real reviewer names when anonymization applies
   ```

4. **Scheduled State Transitions:**
   ```
   ### Scheduled State Transitions
   - Review auto-lock: `ctx.scheduler.runAfter(15 * 60 * 1000, internal.reviews.lockReview, ...)` -- idempotent, only from `submitted`
   - Edit windows (discussion): server-side `editableUntil` check, no scheduler needed
   ```

### `convex/CLAUDE.md`

**Already updated during Epic 4** with the Node.js action split pattern. No further changes needed.

### `app/CLAUDE.md` (create if needed)

Consider creating `app/CLAUDE.md` if the root file grows beyond 150 lines, with:
- Feature folder inventory (`submissions/` 11 files, `editor/` 14 files, `review/` 13 files, `admin/` 3 files, `auth/` 4 files)
- Component composition pattern (self-contained components that load their own data vs prop-driven components)
- Debounce and timer cleanup patterns (`timersRef`, `useEffect` cleanup)

---

## 8. Epic 3 Retrospective Follow-Through

The Epic 3 retrospective identified several recommendations. Here is how they were addressed in Epic 4:

| # | Recommendation | Status | Notes |
|---|---------------|--------|-------|
| 1 | Write proof-of-concept component test (TD-028) | NOT DONE | Zero component tests written in Epic 4 |
| 2 | Address P0 test gaps (TD-024 through TD-027) | NOT DONE | All 4 items carried forward |
| 3 | Follow feature folder pattern for `app/features/review/` | DONE | Feature folder created with 13 components |
| 4 | Sequence backend before frontend | DONE | 4-2 built backend + workspace shell; 4-3/4-4 added behavior |
| 5 | Document new patterns in CLAUDE.md | PARTIAL | `convex/CLAUDE.md` updated; root CLAUDE.md needs additions |

**Assessment:** 2 of 5 actionable recommendations addressed (40%). The two highest-priority items (test coverage) remain unresolved for the fourth consecutive epic. The pattern of "address structure, defer testing" is now firmly established and represents the project's primary quality risk.

---

## 9. Cross-Story Patterns

### Pattern 1: Self-contained components reduce prop threading

The `DiscussionThread` component in `discussion-thread.tsx` loads its own data via `useQuery(api.discussions.listBySubmission, { submissionId })` rather than receiving discussion data as props from the route. This makes it portable -- it can be embedded in the editor view or author view in future epics without refactoring the data flow.

**Contrast:** `ReviewForm` receives all data as props from `ReviewPanel`, which receives them from the route. This is appropriate because the review form's state (local sections, debounce timers, revision tracking) is tightly coupled to the route's lifecycle.

**Pattern rule:** Components that display data from a different Convex query than their parent should be self-contained. Components that share state with their parent should receive props.

### Pattern 2: Edit windows at two tiers

Epic 4 introduced two edit window tiers:
- **Tier 2 (review):** 15-minute edit window after review submission, enforced by scheduled `lockReview` mutation
- **Tier 2 (discussion):** 5-minute edit window after message post, enforced by `editableUntil` field check at edit time

Both tiers use the same fundamental pattern (time-bounded mutability) but differ in enforcement mechanism. Reviews use a scheduler because the lock state must persist even if the user leaves. Discussion edit windows are stateless -- the edit simply fails after the deadline.

### Pattern 3: Stories with placeholder tabs complete faster than tab-filling stories

| Story | Action | Duration | Fix Cycles |
|-------|--------|----------|------------|
| 4-2 | Created tab structure with placeholders | 30 min | 0 |
| 4-3 | Filled Write tab with review form | 54 min | 3 |
| 4-4 | Filled Discussion tab with threading | 39 min | 1 |

The placeholder-first pattern enables rapid structural progress while deferring complexity to subsequent stories. This is the same pattern observed in Epics 2-3 where backend-only or structure-only stories completed faster.

### Pattern 4: Convex `withReviewer` wrapper provides assignment-level access control

The `withReviewer` wrapper enforces that the authenticated user has both `reviewer` role AND a matching `reviews` record for the given `submissionId`. This is used exclusively in `convex/reviews.ts` for review-specific operations. Discussion operations use `withUser` because they span multiple participant roles.

This two-tier auth pattern (role-level via `withUser` + `EDITOR_ROLES` check, assignment-level via `withReviewer`) is a clean separation of concerns. Future modules that need assignment-level access (e.g., author-specific operations) could follow the same pattern with a `withAuthor` wrapper that checks `submissionId` ownership.

---

## 10. Metrics Summary

### Files Created in Epic 4

**Backend (6 files):**
- `convex/reviews.ts` -- 7 functions (listByReviewer, getSubmissionForReviewer, startReview, updateSection, submitReview, lockReview, sectionNameValidator)
- `convex/discussions.ts` -- 5 functions (listBySubmission, postMessage, editMessage, retractMessage, togglePublicConversation)
- `convex/pdfExtraction.ts` -- 3 functions (internal query, internal mutation, extractPdfText split to actions file)
- `convex/pdfExtractionActions.ts` -- 1 action (extractPdfText, `"use node"`)
- `convex/triageActions.ts` -- actions split from triage.ts
- `convex/matchingActions.ts` -- actions split from matching.ts

**Frontend components (13 files in `app/features/review/`):**
- `index.ts`, `workspace-header.tsx`, `paper-panel.tsx`, `review-panel.tsx`
- `confidentiality-badge.tsx`, `progress-ring.tsx`
- `review-form.tsx`, `review-section-field.tsx`, `save-indicator.tsx`, `pre-submit-summary.tsx`
- `discussion-thread.tsx`, `discussion-message.tsx`, `discussion-composer.tsx`

**Routes (2 files):**
- `app/routes/review/$submissionId.tsx` -- review workspace route
- `app/routes/review/accept/$token.tsx` -- invitation acceptance route

**shadcn/ui components installed (3 files):**
- `app/components/ui/resizable.tsx`
- `app/components/ui/scroll-area.tsx`
- `app/components/ui/tabs.tsx`

**Other:**
- `app/components/ui/avatar.tsx` -- Avatar component (shadcn/ui, installed during 4-4)

### Files Modified in Epic 4

- `convex/schema.ts` -- added `extractedText` field to submissions
- `convex/invitations.ts` -- added `acceptInvitation`, `getInviteStatus`
- `convex/matching.ts` -- actions extracted to matchingActions.ts
- `convex/triage.ts` -- actions extracted to triageActions.ts
- `app/routes/review/route.tsx` -- accept route bypass in layout
- `app/routes/review/index.tsx` -- replaced placeholder with review list
- `CLAUDE.md` -- pattern updates
- `convex/CLAUDE.md` -- Node.js action split pattern documented

### Commit Summary

| Commit | Story | Type | Files | Insertions | Deletions |
|--------|-------|------|-------|------------|-----------|
| d30b60f | 4-1 | feat | -- | -- | -- |
| 066d1ac | 4-2 | feat | 22 | 1,632 | 16 |
| f177e48 | 4-3 | feat | 12 | 1,501 | 22 |
| a8e683f | 4-3 | fix | 3 | 23 | 22 |
| 45e5998 | 4-3 | fix | 2 | 94 | 62 |
| 33d1c0d | 4-3 | fix | 3 | 20 | 2 |
| f1b4357 | 4-4 | feat | 12 | 1,959 | 7 |
| b6d9537 | 4-4 | fix | 3 | 17 | 21 |
| 9660b27 | 4-4 | feat | 15 | 945 | 883 |

**Total:** 9 commits, 54 files changed, 6,917 insertions, 811 deletions (net +6,106 lines)

### Velocity Summary

| Metric | Value |
|--------|-------|
| Stories completed | 4/4 (100%) |
| Total duration | ~155 minutes |
| Average story duration | ~39 minutes |
| Stories per hour | 1.5 |
| Total commits | 9 |
| Average review fix cycles | 1.0 |
| New Convex functions | 15 |
| New frontend components | 13 |
| New route files | 2 |
| shadcn/ui components installed | 4 |
| Tests added | 0 |
| Tests passing | 73/73 |
| P0 tech debt items (total open) | 11 |

---

## 11. Recommendations for Epic 5

### Before Starting Epic 5 Feature Stories

1. **[CRITICAL] Establish Convex function testing pattern and resolve at least 3 P0 items.** 11 P0 tech debt items across 4 epics is unsustainable. At minimum, resolve TD-010 (auth wrappers), TD-031 (review OCC), and TD-032 (discussion identity gating) before adding more code.

2. **Write at least one proof-of-concept component test.** This has been recommended in 3 consecutive retrospectives and never done. Recommended target: `ReviewSectionField` -- small, pure (no data fetching), testable inputs/outputs (name, value, status badge rendering).

3. **Separate infrastructure refactoring from feature commits.** The Node.js action file split in commit `9660b27` should not be repeated. Create a separate commit for structural refactoring.

### During Epic 5 Story Planning

4. **Include concurrency analysis in specs.** Stories involving state that can be modified from multiple sources (e.g., auto-save, real-time updates) should explicitly document potential race conditions and mitigations.

5. **Reuse the self-contained component pattern.** `DiscussionThread` demonstrates that components loading their own data are more portable. Author-facing and editor-facing views can embed it with just a `submissionId` prop.

6. **Cap per-story complexity.** Story 4-3 exceeded the project's complexity baseline (54 min vs 30 min average). If a story has both optimistic concurrency AND state machine transitions AND scheduled mutations AND a multi-step submission flow, consider splitting it.

### CLAUDE.md Updates

7. **Add review feature folder** to the "Feature Folder Pattern" section (13 files).
8. **Add auto-save OCC pattern** to "Key Patterns" section.
9. **Add semi-confidential identity model** to "Key Patterns" section.
10. **Add scheduled state transitions** to "Key Patterns" section.

---

**Generated:** 2026-02-08
**Analyst:** Retrospective Agent (claude-opus-4-6)
