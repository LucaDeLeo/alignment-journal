# Retrospective: Epic 5 - Reviewer Abstract & Publication

**Date:** 2026-02-08
**Epic:** 5 - Reviewer Abstract & Publication
**FRs Covered:** FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR43
**Duration:** ~80 minutes (~1h 20m)
**Sprint Mode:** YOLO (rapid implementation, no pre-implementation test gates)
**Stories:** 3

---

## 1. Epic Summary

Epic 5 delivered the final stage of the editorial pipeline: reviewer abstract authoring with auto-save and signing, author acceptance of the reviewer abstract, and public article pages with dual abstract display. The epic covers the complete lifecycle from post-acceptance abstract drafting through publication as a web-first article page.

Story 5-1 added the `reviewerAbstracts` Convex module (537 lines, 7 functions) and the `AbstractDraftForm` component (487 lines) with full auto-save, optimistic concurrency, word count validation, signing toggle, and submission flow. Story 5-2 added `authorAcceptAbstract` mutation and the `AbstractReviewPanel` component for the author's submission detail view. Story 5-3 created the `articles` Convex module (139 lines, 2 public queries) and the `app/features/article/` feature folder (3 components) for the published article experience.

All 3 stories were implemented and merged. Each completed in a single commit with zero review fix cycles -- the first epic with a perfect review record. TypeScript clean, ESLint clean. No new tests were added during this epic. Three tech debt items were identified and resolved inline (countWords duplication, word count constant duplication, Record<string,unknown> type safety).

### Stories Delivered

| Story | Title | Duration | Commits | Review Fix Cycles |
|-------|-------|----------|---------|-------------------|
| 5-1 | Reviewer Abstract Drafting and Signing | 25m 35s | 1 | 0 |
| 5-2 | Author Acceptance of Reviewer Abstract | 24m 50s | 1 | 0 |
| 5-3 | Published Article Page with Dual Abstracts | 29m 29s | 1 | 0 |

**Total commits:** 3
**Total files changed:** 40 (4,216 insertions, 537 deletions)

---

## 2. Key Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Stories completed | 3/3 (100%) | Excellent |
| Stories failed | 0 | Excellent |
| Total duration | ~80 minutes | Fastest 3-story epic |
| Average story duration | ~27 minutes | Best average across all epics |
| Total commits | 3 | Cleanest history (1 per story) |
| Average review fix cycles | 0.0 | Perfect -- first epic with zero fixes |
| Tests passing | 73/73 (100%) | No regressions |
| New tests added | 0 | None -- YOLO mode |
| Tech debt items resolved (inline) | 3 (TD-029, TD-030, TD-031) | All resolved in debt-fix pass |
| New tech debt identified | 3 (TD-032, TD-033, TD-034) | All are zero-test-coverage gaps |
| P0 tech debt items open (total) | 13 | Critical accumulation (11 carried + 2 new) |

### Velocity Comparison Across All Epics

| Metric | Epic 1 | Epic 2 | Epic 3 | Epic 4 | Epic 5 | Trend |
|--------|--------|--------|--------|--------|--------|-------|
| Stories | 4 | 4 | 7 | 4 | 3 | -- |
| Total duration | ~160 min | ~116 min | ~207 min | ~155 min | ~80 min | New low |
| Avg story duration | ~40 min | ~29 min | ~30 min | ~39 min | ~27 min | Best yet |
| Fastest story | 22 min (1-1) | 17 min (2-4) | 22 min (3-6) | 30 min (4-2) | 25 min (5-2) | -- |
| Slowest story | 50 min (1-3) | 34 min (2-1) | 41 min (3-7) | 54 min (4-3) | 29 min (5-3) | New low |
| Stories/hour | 1.5 | 2.1 | 2.0 | 1.5 | 2.25 | New high |
| Commits per story | 2.5 | 2.0 | 2.6 | 2.25 | 1.0 | Best (zero fixes) |
| Review fix cycles avg | -- | -- | -- | 1.0 | 0.0 | Perfect |

**Velocity analysis:** Epic 5 achieved the highest stories/hour (2.25) and lowest average story duration (27 min) of any epic, with the tightest duration spread (25-29 min range, only 4 minutes between fastest and slowest). This is attributable to three factors:

1. **Established patterns reused extensively.** The auto-save with optimistic concurrency, save mutex serialization, version conflict UI, and audit trail patterns were all established in Epic 4. Story 5-1 replicated these patterns for the abstract editor without inventing new architecture. The `AbstractDraftForm` (487 lines) follows the same structure as `ReviewForm` from Story 4-3.

2. **Narrow scope per story.** Each story had a clearly defined domain boundary: 5-1 = reviewer writes abstract, 5-2 = author accepts abstract, 5-3 = public reads article. No story crossed multiple participant roles or required coordinating concurrent state across different user sessions.

3. **Zero review fix cycles.** No story required any post-review corrections. This is the first epic to achieve a perfect review record. Contributing factors include pattern familiarity, narrow scope, and the absence of novel concurrency challenges (the abstract auto-save is simpler than the review form because it has one text field rather than five independent sections).

### Story Complexity Pattern

| Story | Type | New Files | Modified Files | Duration | Fix Cycles | Notes |
|-------|------|-----------|----------------|----------|------------|-------|
| 5-1 | Full-stack (6 functions + 1 component + schema update + tab addition) | 3 | 11 | 25 min | 0 | Heaviest; reused OCC + auto-save patterns |
| 5-2 | Full-stack (1 mutation + 1 component + submission detail integration) | 1 | 4 | 25 min | 0 | Lightest new code; most integration points |
| 5-3 | Full-stack (2 queries + 3 components + route file + index update) | 6 | 4 | 29 min | 0 | Most new files; established feature folder |

**Observation:** Story 5-1 was the largest in code volume (1,697 net lines including the 537-line `reviewerAbstracts.ts` and 487-line `abstract-draft-form.tsx`) yet completed in 25 minutes because it reused proven patterns from Epic 4. In contrast, Story 4-3 (which established those same patterns for the first time) took 54 minutes with 3 fix cycles. This confirms that pattern reuse provides a ~2x velocity improvement for stories of comparable complexity.

---

## 3. What Went Well

### 3.1 Pattern reuse from Epic 4 eliminated review fix cycles entirely

The auto-save with optimistic concurrency pattern (save mutex, version conflict detection, debounced mutations, `withOptimisticUpdate`) was established in Story 4-3 at high cost (54 minutes, 3 fix cycles). Story 5-1 replicated the pattern for the abstract editor in 25 minutes with zero fixes. The code structure is nearly identical:

**Evidence:** `app/features/review/abstract-draft-form.tsx` follows the same architecture as `app/features/review/review-form.tsx`:
- `localRevisionRef` + `saveMutexRef` + `pendingSaveRef` (lines 150-152)
- Debounced save with timer cleanup (lines 254-261)
- `.withOptimisticUpdate()` on mutation (lines 183-202)
- Conflict banner with "Reload server version" / "Keep my version" (lines 379-401)
- `SaveIndicator` component reuse (line 374)

### 3.2 Clean separation of concerns across the 3-story sequence

Each story handled a distinct participant perspective (reviewer, author, reader) with minimal overlap. Story 5-2's integration into the author's submission detail view required only 19 lines of changes to `submission-detail.tsx`. Story 5-3's public article page was completely standalone -- the `articles.ts` module has no imports from other domain modules.

**Evidence:** `convex/articles.ts` imports only `query` from `_generated/server` and `notFoundError` from `helpers/errors`. It reads from `submissions`, `reviewerAbstracts`, and `users` tables directly rather than calling other module functions. This eliminates cross-module coupling.

### 3.3 Inline tech debt resolution pattern (3 items fixed during implementation)

Three tech debt items were identified and resolved during the Epic 5 debt-fix pass without requiring separate stories:

1. **TD-029 (countWords duplication):** Removed duplicate `countWords` in `abstract-draft-form.tsx`, imported from `review-section-field.tsx` instead.
2. **TD-030 (word count constants):** Exported `ABSTRACT_MIN_WORDS` and `ABSTRACT_MAX_WORDS` from `convex/reviewerAbstracts.ts`; frontend imports from backend module. Same pattern as TD-022 resolution.
3. **TD-031 (Record<string,unknown>):** Replaced unsafe patch object with two properly typed `ctx.db.patch()` branches.

This is the first epic where tech debt was proactively resolved during the implementation phase rather than being carried forward.

### 3.4 Public query security model is well-defined

The `articles.ts` module introduces the project's second set of public queries (after `getInviteStatus` in Epic 4). Both `getPublishedArticle` and `listPublished` omit the auth wrapper entirely (Diamond Open Access, CC-BY 4.0). The security boundary is enforced by data filtering:

**Evidence:** `convex/articles.ts` line 36: `if (!submission || submission.status !== 'PUBLISHED') throw notFoundError('Article')`. Only PUBLISHED submissions are accessible. The reviewer abstract is further gated: `abstract.status === 'approved' && abstract.authorAccepted === true` (lines 58-62).

### 3.5 New feature folder `app/features/article/` follows established conventions

The article feature folder was created in Story 5-3 with 3 components and a barrel export, following the same pattern as `submissions/`, `editor/`, and `review/`. The naming convention (`article-page.tsx`, `dual-abstract-display.tsx`, `article-metadata.tsx`) is consistent with the project's `feature-verb.tsx` convention.

### 3.6 Schema changes were minimal and backward-compatible

Only two schema additions across the entire epic:
- `authorAccepted` (optional boolean) and `authorAcceptedAt` (optional number) fields on `reviewerAbstracts` table
- `by_submissionId_reviewerId` composite index on `reviewerAbstracts` table

Both additions are backward-compatible (optional fields, additive index). No existing data requires migration.

---

## 4. What Could Improve

### 4.1 Zero tests written across all 3 stories (fifth consecutive epic)

Epic 5 added zero new tests. The test count remains at 73 (same as end of Epic 3). This is the fifth consecutive epic where YOLO mode produced zero test coverage for new code. The accumulated untested code now spans:

- **Backend:** 4 new Convex modules from Epics 4-5 (`convex/reviews.ts`, `convex/discussions.ts`, `convex/reviewerAbstracts.ts`, `convex/articles.ts`) with 21 exported functions
- **Frontend:** 19 new components from Epics 4-5 across 3 feature folders with complex state management
- **Across all epics:** 45+ frontend components, 35+ Convex functions, zero component tests, zero integration tests

The P0 tech debt count has grown from 7 (end of Epic 3) to 11 (end of Epic 4) to 13 (end of Epic 5). Each epic adds more untested code while never resolving any test debt. The pattern of "add features, defer testing" is now firmly embedded across 5 epics.

### 4.2 Public article queries introduce a new attack surface without test coverage

`convex/articles.ts` contains the only unauthenticated data-serving queries in the system (besides `getInviteStatus`). A regression in the status filter (`submission.status !== 'PUBLISHED'`) or the reviewer abstract gating logic (`abstract.status === 'approved' && abstract.authorAccepted === true`) would expose unpublished content to anonymous readers. This is security-critical code with zero automated verification (TD-033).

### 4.3 `reviewerAbstracts.ts` has a redundant ownership check

In the `updateContent` mutation (lines 237-243), the query uses `by_submissionId_reviewerId` composite index which already filters by `ctx.user._id`, but then performs an explicit `abstract.reviewerId !== ctx.user._id` check on line 241. Since the index query guarantees the reviewerId matches, this check is always false. The same pattern appears in `updateSigning` (line 316) and `submitAbstract` (line 367). While redundant checks are defense-in-depth (not harmful), they suggest the pattern was copied from `updateContent` without analyzing whether the check is necessary given the index-based lookup.

### 4.4 Epic 4 retrospective recommendations were partially addressed

The Epic 4 retrospective made 10 recommendations for Epic 5. Compliance is assessed in Section 8 below.

### 4.5 P0 tech debt accumulation is now at 13 items across 5 epics

| Age | Count | Items |
|-----|-------|-------|
| 5 epics | 1 | TD-010 (auth wrappers) |
| 4 epics | 2 | TD-013 (triage safety), TD-014 (submission auth) |
| 3 epics | 4 | TD-024 (audit), TD-025 (embeddings), TD-026 (invitations), TD-027 (undo decision) |
| 2 epics | 4 | TD-029* (reviews OCC), TD-030* (discussion identity), TD-031* (review functions), TD-032* (discussions) |
| 1 epic | 2 | TD-032 (reviewer abstracts), TD-033 (public article queries) |

*Note: TD-029 through TD-032 from Epic 4 were renumbered in the tech debt registry. The references here use the Epic 4 retrospective numbering (TD-029 through TD-032 from that document correspond to different items than the TD-029-031 resolved during Epic 5.)

TD-010 has been carried for 5 consecutive epics. This is the project's most persistent quality gap.

---

## 5. Key Patterns Established

### 5.1 Reviewer Abstract Lifecycle State Machine

The `reviewerAbstracts` module implements a 3-state lifecycle: `drafting` -> `submitted` -> `approved`. Unlike the submission state machine (which uses `helpers/transitions.ts` with `assertTransition`), the abstract lifecycle uses inline status checks per mutation. This is appropriate because the abstract lifecycle is simpler (3 states, 2 transitions, no branching) and does not need the generic transition map infrastructure.

**State transitions:**
- `createDraft` -> `drafting` (editor assigns reviewer)
- `submitAbstract` -> `submitted` (reviewer submits for review, idempotent)
- `approveAbstract` -> `approved` (editor approves, terminal state)

**Cross-cutting field:** `authorAccepted` (boolean) is orthogonal to status. It can be set/cleared at any time except when `status === 'drafting'`. Content edits clear `authorAccepted` automatically via the `updateContent` mutation.

### 5.2 Author Acceptance Clearing on Content Edit

When the reviewer edits abstract content after the author has already accepted it, the `updateContent` mutation automatically clears `authorAccepted` and `authorAcceptedAt`. This ensures the author always accepts the final version.

**Implementation:** `convex/reviewerAbstracts.ts` lines 265-281 -- two typed `ctx.db.patch()` branches: one that includes `authorAccepted: false, authorAcceptedAt: undefined` (when clearing acceptance) and one without (when no acceptance exists to clear).

### 5.3 Public Query Pattern (No Auth Wrapper)

The `articles.ts` module establishes the pattern for public queries:

```typescript
// No auth wrapper -- Diamond Open Access
export const getPublishedArticle = query({
  args: { articleId: v.id('submissions') },
  returns: v.object({ ... }),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get('submissions', args.articleId)
    if (!submission || submission.status !== 'PUBLISHED') {
      throw notFoundError('Article')
    }
    // ... return projected fields only
  },
})
```

**Key properties:**
- No `withUser` wrapper (unauthenticated access)
- Status filter as security boundary (`status !== 'PUBLISHED'` throws NOT_FOUND)
- Projected return shape (only expose fields appropriate for public consumption)
- Conditional includes for sensitive sub-data (reviewer abstract only if `approved && authorAccepted`)

### 5.4 Cross-Feature Component Reuse Pattern

Story 5-2 demonstrated a clean cross-feature reuse pattern: the author's `submission-detail.tsx` (in `features/submissions/`) imports and renders `DiscussionThread` from `features/review/` for ACCEPTED submissions. This works because `DiscussionThread` is self-contained (loads its own data via `useQuery`).

**Evidence:** `app/features/submissions/submission-detail.tsx` adds:
```typescript
import { DiscussionThread } from '~/features/review'
// ...
{submission.status === 'ACCEPTED' && (
  <DiscussionThread submissionId={submissionId} />
)}
```

This confirms the Epic 4 recommendation (Section 11.5) that self-contained components are portable across feature boundaries.

### 5.5 Feature Folder Pattern: `app/features/article/`

Epic 5 established the fourth major feature folder:

```
app/features/article/
  index.ts                    -- barrel export (3 exports)
  article-page.tsx            -- main article view with composition
  dual-abstract-display.tsx   -- conditional dual/single abstract rendering
  article-metadata.tsx        -- authors, dates, DOI, license, PDF download
```

This is the smallest feature folder in the project (3 components vs 11-14 in others), reflecting the read-only nature of the publication view. The components are purely presentational (no mutations, no local state management).

---

## 6. Tech Debt Inventory

### Tech Debt Resolved During Epic 5

| ID | Description | Resolution |
|----|-------------|------------|
| TD-029 | `countWords` duplicated in `abstract-draft-form.tsx` | Removed duplicate; imports from `review-section-field.tsx` |
| TD-030 | Word count constants (150/500) duplicated between backend and frontend | Exported `ABSTRACT_MIN_WORDS`/`ABSTRACT_MAX_WORDS` from backend; frontend imports |
| TD-031 | `Record<string, unknown>` in `updateContent` lost type safety | Replaced with two typed `ctx.db.patch()` branches |

### New Tech Debt from Epic 5

| ID | Story | Description | Priority | Location |
|----|-------|-------------|----------|----------|
| TD-032 | 5-1 | Zero tests for reviewer abstract lifecycle mutations (createDraft validation, updateContent OCC, submitAbstract word count, approveAbstract terminal state, authorAcceptAbstract ownership) | P0 | `convex/reviewerAbstracts.ts` |
| TD-033 | 5-3 | Zero tests for public article queries (getPublishedArticle status filter, reviewer abstract conditional inclusion, listPublished pagination) | P0 | `convex/articles.ts` |
| TD-034 | 5-1/5-2/5-3 | Zero component tests for Epic 5 frontend (AbstractDraftForm, AbstractReviewPanel, ArticlePage, DualAbstractDisplay, ArticleMetadata) | P1 | `app/features/article/`, `app/features/review/`, `app/features/submissions/` |

### Carried Tech Debt (from prior epics, still open)

| ID | Source | Priority | Epics Carried |
|----|--------|----------|---------------|
| TD-010 | Epic 1 | P0 | 5 |
| TD-013 | Epic 2 | P0 | 4 |
| TD-014 | Epic 2 | P0 | 4 |
| TD-015 | Epic 2 | P1 | 4 |
| TD-016 | Epic 2 | P2 | 4 |
| TD-017 | Epic 3 | P2 | 3 |
| TD-018 | Epic 3 | P2 | 3 |
| TD-019 | Epic 3 | P2 | 3 |
| TD-024 | Epic 3 | P0 | 3 |
| TD-025 | Epic 3 | P0 | 3 |
| TD-026 | Epic 3 | P0 | 3 |
| TD-027 | Epic 3 | P0 | 3 |
| TD-028 | Epic 3 | P1 | 3 |
| TD-004 | Epic 1 | Low | 5 (deferred to Convex platform) |

**P0 summary:** 13 P0 items open across 5 epics. All are zero-test-coverage gaps for security-critical and data-integrity-critical code paths. Zero P0 items were resolved in Epic 5 (the 3 resolved items were structural/duplication issues, not test coverage). TD-010 (auth wrappers) has now been carried for 5 consecutive epics.

---

## 7. CLAUDE.md Recommendations

Based on patterns established in Epic 5, the following additions should be made to CLAUDE.md files:

### Root `CLAUDE.md`

**Update "Feature Folder Pattern" subsection:**
Add `app/features/article/` (3 files) to the established folders list. Current text lists `submissions/` (11), `auth/`, `editor/` (14), `review/` (13), `admin/` (3). Add: `app/features/article/` (3 files).

The review feature folder also grew: `app/features/review/` now has 14 files (was 13, added `abstract-draft-form.tsx`). The submissions feature folder grew to 12 files (added `abstract-review-panel.tsx`).

**Already present and accurate:**
- Auto-Save with Optimistic Concurrency pattern (line 94-98) -- covers the abstract editor since it reuses the same pattern
- Semi-Confidential Identity Gating (line 100-103) -- unchanged
- Scheduled State Transitions (line 105-107) -- unchanged
- Audit Trail Pattern (line 87-92) -- the new audit action types (`abstract_assigned`, `abstract_submitted`, `abstract_approved`, `abstract_author_accepted`) follow the existing pattern documented here

**No new sections needed.** Epic 5 reused existing patterns rather than establishing new ones. The only novel pattern (public queries without auth wrapper) is simple enough to not warrant a CLAUDE.md section -- it is documented inline in `articles.ts`.

### `convex/CLAUDE.md`

No changes needed. The existing documentation covers all patterns used in Epic 5.

---

## 8. Epic 4 Retrospective Follow-Through

The Epic 4 retrospective identified 10 recommendations. Here is how they were addressed in Epic 5:

| # | Recommendation | Status | Notes |
|---|---------------|--------|-------|
| 1 | [CRITICAL] Establish Convex function testing pattern and resolve at least 3 P0 items | NOT DONE | Zero P0 test items resolved |
| 2 | Write at least one proof-of-concept component test | NOT DONE | Zero component tests written (4th consecutive retro recommendation) |
| 3 | Separate infrastructure refactoring from feature commits | NOT APPLICABLE | No infrastructure refactoring occurred in Epic 5 |
| 4 | Include concurrency analysis in specs | DONE | Abstract auto-save is simpler (single field); no new concurrency issues emerged |
| 5 | Reuse the self-contained component pattern | DONE | `DiscussionThread` embedded in author `submission-detail.tsx` via `submissionId` prop |
| 6 | Cap per-story complexity | DONE | All stories completed in 25-29 min range, well within baseline |
| 7 | Add review feature folder to "Feature Folder Pattern" | DONE | Already in CLAUDE.md (13 files) |
| 8 | Add auto-save OCC pattern to "Key Patterns" | DONE | Already in CLAUDE.md lines 94-98 |
| 9 | Add semi-confidential identity model to "Key Patterns" | DONE | Already in CLAUDE.md lines 100-103 |
| 10 | Add scheduled state transitions to "Key Patterns" | DONE | Already in CLAUDE.md lines 105-107 |

**Assessment:** 7 of 10 recommendations addressed (70%, up from 40% in Epic 4). However, the two highest-priority items (test coverage) remain unresolved for the fifth consecutive epic. The CLAUDE.md updates (items 7-10) were completed between Epics 4 and 5. Story complexity was well-controlled (item 6). The self-contained component pattern was successfully reused (item 5).

**Critical gap:** Items 1 and 2 (Convex function testing and component testing) have been recommended in every retrospective since Epic 1. They remain the project's most persistent quality risk.

---

## 9. Cross-Story Patterns

### Pattern 1: Abstract auto-save is a simplified variant of review auto-save

The abstract editor (`abstract-draft-form.tsx`, 487 lines) and the review form (`review-form.tsx`) share identical auto-save architecture:

| Mechanism | Review Form (Epic 4) | Abstract Editor (Epic 5) |
|-----------|---------------------|-------------------------|
| Debounce timer | 500ms per section | 500ms single field |
| Save mutex | `saveMutexRef` serializing concurrent saves | Same |
| Pending save tracking | `pendingSavesRef` (Map per section) | `pendingSaveRef` (single boolean) |
| Revision tracking | `localRevisionRef` | Same |
| Version conflict UI | Banner with reload/keep options | Same |
| Optimistic updates | `.withOptimisticUpdate()` | Same |
| Server OCC | `expectedRevision` check, `versionConflictError()` | Same |

The abstract editor is simpler because it has one text field rather than five independently-saveable sections. This eliminated the per-section save tracking complexity and the pre-submit summary logic.

**Pattern rule:** For future auto-save features, copy the abstract editor pattern (simpler) unless the feature requires independent field-level saves (in which case copy the review form pattern).

### Pattern 2: Conditional tab rendering based on submission status

Story 5-1 added the "Abstract" tab to `ReviewPanel` that only appears when `submissionStatus === 'ACCEPTED'`. This is the first use of conditional tab rendering in the project.

**Implementation:** `review-panel.tsx` lines 45-65:
```typescript
const showAbstractTab = submissionStatus === 'ACCEPTED'
// ...
{showAbstractTab && (
  <TabsTrigger value="abstract" className="flex-1 gap-1.5">
    <AwardIcon className="size-3.5" aria-hidden="true" />
    Abstract
  </TabsTrigger>
)}
```

The `submissionStatus` prop was added to `ReviewPanel` (replacing the previous `reviewStatus` prop) to enable this gating. The change also fixed a naming inconsistency where the discussion thread received `reviewStatus={reviewStatus}` but actually needed the review's status, which is now correctly passed as `reviewStatus={status}`.

### Pattern 3: Feature folder growth follows epic boundaries

Each epic establishes or extends exactly one feature folder:

| Epic | Feature Folder | Files at End | Components Added |
|------|---------------|-------------|-----------------|
| Epic 2 | `app/features/submissions/` | 11 -> 12 | +1 (AbstractReviewPanel in Epic 5) |
| Epic 3 | `app/features/editor/` | 14 | 0 new in Epic 5 |
| Epic 4 | `app/features/review/` | 13 -> 14 | +1 (AbstractDraftForm in Epic 5) |
| Epic 5 | `app/features/article/` | 3 | +3 (new folder) |

Epic 5 created one new folder (`article/`) and extended two existing folders (`review/`, `submissions/`) by one component each. This cross-folder extension is a natural outcome of the reviewer abstract lifecycle spanning three participant perspectives.

### Pattern 4: Audit trail follows established deferred-write pattern

All 4 new audit action types in Epic 5 use the same `ctx.scheduler.runAfter(0, internal.audit.logAction, {...})` pattern established in Epic 3:

- `abstract_assigned` (from `createDraft`)
- `abstract_submitted` (from `submitAbstract`)
- `abstract_approved` (from `approveAbstract`)
- `abstract_author_accepted` (from `authorAcceptAbstract`)

The `AuditTimeline` component in `app/features/editor/audit-timeline.tsx` was updated with 4 new `ACTION_LABELS` entries. No architectural changes were needed -- the audit system scaled cleanly to accommodate the new action types.

---

## 10. Metrics Summary

### Files Created in Epic 5

**Backend (2 files):**
- `convex/reviewerAbstracts.ts` -- 7 functions (getBySubmission, createDraft, updateContent, updateSigning, submitAbstract, approveAbstract, authorAcceptAbstract) + 2 exported constants
- `convex/articles.ts` -- 2 public queries (getPublishedArticle, listPublished)

**Frontend components (5 files across 3 feature folders):**
- `app/features/review/abstract-draft-form.tsx` -- auto-save abstract editor with signing
- `app/features/submissions/abstract-review-panel.tsx` -- author acceptance UI
- `app/features/article/article-page.tsx` -- article composition root
- `app/features/article/dual-abstract-display.tsx` -- conditional dual/single abstract
- `app/features/article/article-metadata.tsx` -- authors, date, DOI, license, PDF download
- `app/features/article/index.ts` -- barrel export

**Routes (1 file):**
- `app/routes/article/$articleId.tsx` -- article detail route

**shadcn/ui components installed (1 file):**
- `app/components/ui/switch.tsx` -- Switch toggle (used for signing toggle)

### Files Modified in Epic 5

- `convex/schema.ts` -- added `authorAccepted`, `authorAcceptedAt` fields and `by_submissionId_reviewerId` index to `reviewerAbstracts`
- `app/features/review/review-panel.tsx` -- added Abstract tab (conditional on ACCEPTED status)
- `app/features/review/index.ts` -- added `AbstractDraftForm` export
- `app/features/review/pre-submit-summary.tsx` -- refactored to use `SECTION_DEFS` from `review-form.tsx`
- `app/features/review/discussion-thread.tsx` -- minor cleanup
- `app/features/review/review-form.tsx` -- exported `SECTION_DEFS` constant
- `app/features/review/save-indicator.tsx` -- minor cleanup
- `app/features/submissions/submission-detail.tsx` -- added AbstractReviewPanel and DiscussionThread for ACCEPTED
- `app/features/submissions/index.ts` -- added `AbstractReviewPanel` export
- `app/features/editor/audit-timeline.tsx` -- added 4 new `ACTION_LABELS` entries
- `app/routes/article/index.tsx` -- replaced placeholder with paginated article list
- `app/routes/review/$submissionId.tsx` -- pass `submissionStatus` prop to ReviewPanel
- `convex/discussions.ts` -- consolidated `ViewerRole`/`DisplayRole` types into single `DiscussionRole`
- `convex/reviews.ts` -- minor adjustments
- `CLAUDE.md` -- pattern updates (review folder size, new patterns from Epic 4)

### Commit Summary

| Commit | Story | Type | Files | Insertions | Deletions |
|--------|-------|------|-------|------------|-----------|
| 4de6bec | 5-1 | feat | 24 | 2,654 | 538 |
| f854bf3 | 5-2 | feat | 10 | 623 | 6 |
| e5823ba | 5-3 | feat | 13 | 959 | 13 |

**Total:** 3 commits, 40 files changed, 4,216 insertions, 537 deletions (net +3,679 lines)

Note: Story 5-1's deletion count (538) includes the Epic 4 retrospective and traceability documents that were generated during the sprint but not related to the story's feature work.

### Velocity Summary

| Metric | Value |
|--------|-------|
| Stories completed | 3/3 (100%) |
| Total duration | ~80 minutes |
| Average story duration | ~27 minutes |
| Stories per hour | 2.25 |
| Total commits | 3 |
| Average review fix cycles | 0.0 |
| New Convex functions | 9 (7 reviewer abstracts + 2 articles) |
| New frontend components | 5 |
| New route files | 1 |
| shadcn/ui components installed | 1 (Switch) |
| Tests added | 0 |
| Tests passing | 73/73 |
| P0 tech debt items (total open) | 13 |

### Cumulative Project Metrics (End of Epic 5)

| Metric | Value |
|--------|-------|
| Total stories completed | 22 (4+4+7+4+3) |
| Total implementation time | ~718 minutes (~12 hours) |
| Total commits | 48 |
| Total Convex functions | ~45 |
| Total frontend components | ~50 |
| Total feature folders | 5 (submissions, editor, review, article, admin) |
| Total tests | 73 |
| Total P0 tech debt | 13 |

---

## 11. Recommendations for Epic 6

### Before Starting Epic 6 Feature Stories

1. **[CRITICAL] Address test debt.** 13 P0 tech debt items across 5 epics is the project's defining quality risk. At minimum, resolve TD-010 (auth wrappers, carried 5 epics) and TD-033 (public article queries, security-critical) before adding more code. Every retrospective since Epic 1 has flagged this. The debt compounds with each epic because new code depends on untested foundations.

2. **Write at least one proof-of-concept test -- any test.** This has been recommended in 4 consecutive retrospectives (Epic 2, 3, 4, 5) and never executed. At this point, the recommendation is to write literally any test -- Convex function, component, or integration -- to break the pattern. Recommended targets:
   - **Easiest:** `DualAbstractDisplay` component test -- pure presentational, no data fetching, two render paths (with/without reviewer abstract)
   - **Most impactful:** `articles.getPublishedArticle` unit test -- verifies the status filter security boundary for the project's only public data-serving endpoint

### During Epic 6 Story Planning

3. **Payment calculation is pure logic -- ideal for testing.** FR44 specifies a formula: `base ($100 + $20/page) + quality multiplier + speed bonus ($100/week early) + abstract bonus ($300)`. This is the most testable feature in the project -- pure arithmetic with deterministic inputs and outputs. Include tests as a story acceptance criterion, not as deferred debt.

4. **Notification previews (FR52, FR53) should reuse the self-contained component pattern.** Notification preview components should load their own data via `useQuery` rather than receiving all data as props. This makes them embeddable in multiple contexts (dedicated notification page, inline in editor dashboard, command palette results).

5. **Follow the article feature folder pattern for `app/features/payment/` or `app/features/notifications/`.** Create new feature folders with barrel exports. Do not add payment or notification components to existing feature folders.

### CLAUDE.md Updates

6. **Update feature folder sizes in CLAUDE.md:**
   - `app/features/submissions/` (12 files, was 11)
   - `app/features/review/` (14 files, was 13)
   - Add `app/features/article/` (3 files)

7. **Add audit trail action types reference.** The `ACTION_LABELS` mapping in `audit-timeline.tsx` now has 15 entries across 5 epics. Consider adding a cross-reference comment in CLAUDE.md noting that new audit action types require updating both the backend (where `logAction` is called) and the frontend `ACTION_LABELS` mapping.

---

**Generated:** 2026-02-08
**Analyst:** Retrospective Agent (claude-opus-4-6)
