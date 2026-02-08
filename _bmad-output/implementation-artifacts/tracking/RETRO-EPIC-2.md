# Retrospective: Epic 2 - Author Submission & LLM Triage Pipeline

**Date:** 2026-02-08
**Epic:** 2 - Author Submission & LLM Triage Pipeline
**FRs Covered:** FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15
**Duration:** ~116 minutes (~1h 56m)
**Sprint Mode:** YOLO (rapid implementation, no pre-implementation test gates)

---

## 1. Epic Summary

Epic 2 delivered the complete author-facing submission pipeline and automated LLM triage system: a submission form with PDF upload via Convex's 3-step pattern, real-time submission status tracking with a derived timeline, a 4-pass chained-action LLM triage pipeline (scope, formatting, citations, claims) with idempotent writes and bounded exponential backoff, and a real-time triage progress display with collapsible report cards.

All 4 stories were implemented and merged. The implementation is functionally complete -- TypeScript clean, ESLint clean, and all 52 tests pass. However, the quality gate **FAILED** due to critically low acceptance criteria coverage (8% overall, 0% at P0). The gap is purely in test evidence, not implementation completeness.

### Stories Delivered

| Story | Title | Duration | Commits | Review Cycles |
|-------|-------|----------|---------|---------------|
| 2-1 | Author Submission Form and PDF Upload | 33m 51s | 2 | 1 |
| 2-2 | Submission Status Tracking | 31m 48s | 3 | 2 |
| 2-3 | PDF Text Extraction and Triage Orchestration | 32m 47s | 2 | 1 |
| 2-4 | Real-Time Triage Progress and Report Display | 17m 7s | 1 | 0 |

---

## 2. Key Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Stories completed | 4/4 (100%) | Excellent |
| Stories failed | 0 | Excellent |
| Total duration | ~116 minutes | 28% faster than Epic 1 |
| Average story duration | ~29 minutes | Efficient |
| Total commits | 8 | Clean history |
| Average review cycles | 1.0 | Strong (down from 1.0 in Epic 1 due to 0-cycle story) |
| Tests passing | 52/52 (100%) | Good |
| New tests added (vs Epic 1) | 23 | Moderate |
| Tech debt items from registry | 3 (TD-010, TD-011, TD-012) | |
| Tech debt resolved | 2 (TD-011, TD-012) | Good |
| Tech debt skipped | 1 (TD-010 -- auth tests) | Concerning |
| Additional code quality fixes | 3 | Proactive |
| P0 AC coverage | 0/5 (0%) | FAIL |
| P1 AC coverage | 2/12 (17%) | FAIL |
| Overall AC coverage | 2/25 (8%) | FAIL |
| Quality gate | FAIL | Blocking |

### Velocity Comparison with Epic 1

| Metric | Epic 1 | Epic 2 | Delta |
|--------|--------|--------|-------|
| Stories | 4 | 4 | Same |
| Total duration | ~160 min | ~116 min | -28% |
| Avg story duration | ~40 min | ~29 min | -28% |
| Fastest story | 22 min (1-1) | 17 min (2-4) | |
| Slowest story | 50 min (1-3) | 34 min (2-1) | |
| Commits | 10 | 8 | -20% |
| Stories/hour | 1.5 | 2.1 | +40% |

The velocity improvement is attributable to: (a) established conventions from Epic 1 reducing decision overhead, (b) YOLO mode skipping pre-implementation test gates, and (c) consistent scope per story (each story was well-bounded to one layer or one feature slice).

### Story Complexity Pattern

| Story | Type | Scope | Duration | Notes |
|-------|------|-------|----------|-------|
| 2-1 | Full-stack (form + mutation + upload) | 6 new files + 1 modified | 34 min | Most files touched |
| 2-2 | Full-stack (query + detail page + timeline) | 4 new files + 3 modified | 32 min | 2 review cycles |
| 2-3 | Backend-only (pipeline + actions + mutations + queries) | 1 new file + 1 modified | 33 min | Most complex logic |
| 2-4 | Frontend-only (3 components + integration) | 3 new files + 2 modified | 17 min | Smallest scope, zero review cycles |

Observation: Backend-only (2-3) and full-stack stories (2-1, 2-2) take similar time (~32-34 min). Frontend-only stories with well-defined backend APIs (2-4) are significantly faster (~17 min). This suggests that the backend contract definition is the bottleneck, not the UI rendering.

---

## 3. Epic 1 Retrospective Follow-Through

The Epic 1 retrospective made 7 recommendations. Here is how they were addressed:

| # | Recommendation | Status | Notes |
|---|---------------|--------|-------|
| 1 | Write auth/RBAC tests (P0 blockers) | NOT DONE | TD-010 skipped -- requires Convex test harness. Carried forward again. |
| 2 | Install Vitest coverage plugin | DONE | TD-012 resolved. `@vitest/coverage-v8` installed and configured. |
| 3 | Set up component test infrastructure | DONE | TD-011 resolved. `happy-dom` installed, Vitest projects config (unit + component). |
| 4 | Include test coverage as P0 acceptance criteria | NOT DONE | YOLO mode bypassed test gates. No P0 tests written. |
| 5 | Add "Deferred From" tracking | NOT APPLICABLE | No cross-story test deferrals in Epic 2. |
| 6 | Allocate extra time for full-stack stories | OBSERVED | Full-stack stories averaged ~33 min, consistent with Epic 1's non-auth stories. |
| 7 | Extract shared utilities before building consumers | DONE | `status-utils.ts` and `triage-constants.ts` extracted as shared modules. |

**Assessment:** 3 of 5 actionable recommendations were addressed (60%). The two that were not -- auth tests and P0 test gates -- are the highest-priority items and the same items that caused Epic 1's quality gate failure. This is a recurring pattern that must be addressed before Epic 3.

---

## 4. What Went Well

### Consistent, fast execution across all stories

All 4 stories passed validation and code review on or near the first attempt. Story 2-4 (frontend-only) required zero review cycles -- the spec-to-implementation path was clean. The overall velocity of 2.1 stories/hour (vs 1.5 in Epic 1) demonstrates that established conventions compound: once the route layout pattern, auth wrapper pattern, and feature folder structure are in place, subsequent stories slot in with less friction.

### Well-structured feature folder organization

All submission-related code lives in `app/features/submissions/` with clear responsibilities:

```
app/features/submissions/
  submission-form.tsx        -- creation form with Zod validation
  pdf-upload.tsx             -- 3-step Convex upload widget
  submission-list.tsx        -- author's submission list
  submission-detail.tsx      -- full detail page
  status-utils.ts            -- shared STATUS_COLORS, STATUS_LABELS, formatDate
  status-timeline.tsx        -- derived pipeline timeline
  triage-display.tsx         -- triage wrapper (progress vs report mode)
  triage-progress.tsx        -- live progress indicator
  triage-report-card.tsx     -- collapsible severity card
  triage-constants.ts        -- shared PASS_DISPLAY_NAMES, PASS_ORDER
  index.ts                   -- barrel export
```

This co-location pattern makes it easy to find related code and reduces import path complexity. The barrel export (`index.ts`) keeps route files clean.

### Robust triage pipeline architecture

The chained-action pattern (`runScope` -> `runFormatting` -> `runCitations` -> `runClaims` -> `completeTriageRun`) provides:

- **Fault isolation:** Each pass is a separate Convex action with its own 10-minute execution budget
- **Progress tracking:** Each `writeResult` mutation triggers Convex reactive updates, enabling real-time UI progress
- **Retry granularity:** Only the failed pass retries, not the entire pipeline
- **Idempotency:** The `idempotencyKey` index prevents duplicate writes from retried passes
- **Sanitization:** Error messages are mapped to safe strings before writing to client-visible tables

This architecture pattern is reusable for any future multi-step backend pipeline (e.g., reviewer matching embedding generation in Epic 3).

### Proactive tech debt management during debt-fix pass

The debt-fix pass between Epic 1 and Epic 2 implementation resolved 2 registry items and 3 additional code quality issues:

- **TD-011 resolved:** Component test infrastructure (happy-dom + Vitest projects) -- enabling future component tests
- **TD-012 resolved:** Code coverage reporting (@vitest/coverage-v8) -- enabling coverage visibility
- **Duplicated PASS_DISPLAY_NAMES consolidated** into `triage-constants.ts`
- **Duplicated triage access checks consolidated** into generic `assertTriageAccess<TCtx>`
- **Inconsistent string quoting fixed** in `convex/triage.ts`

These fixes prevent debt from compounding and demonstrate that the code review process catches real issues.

### Strong test quality where tests exist

The 23 new tests added in Epic 2 (`status-utils.test.ts`) are thorough: they cover all 11 submission statuses for timeline derivation, happy path progression, branch state handling (DESK_REJECTED, REJECTED, REVISION_REQUESTED), STATUS_COLORS completeness, STATUS_LABELS mapping, and formatDate output. The test quality sets a good template for future test files.

### Shared utility extraction prevented DRY violations early

Epic 1's retrospective flagged that Story 1-4 generated 5 tech debt items from DRY violations across shared components. Epic 2 proactively extracted shared utilities:

- `status-utils.ts`: STATUS_COLORS, STATUS_LABELS, formatDate -- used by both `submission-list.tsx` and `submission-detail.tsx`
- `triage-constants.ts`: PASS_DISPLAY_NAMES, PASS_ORDER -- used by both `triage-progress.tsx` and `triage-display.tsx`

This extraction happened during the debt-fix pass rather than during initial implementation, but the pattern was recognized and addressed before it caused issues in multiple consumers.

---

## 5. What Could Improve

### Quality gate failed -- identical root cause as Epic 1

The quality gate result is FAIL with 8% overall AC coverage (2/25 FULL). This is nearly identical to Epic 1's result (10% coverage, 3/30 FULL). The same structural problem persists: tests exist for pure utility functions (transitions, errors, status-utils) but not for the code that uses them (mutations, queries, components).

**Specific P0 gaps:**

1. **Idempotent writes (2-3:AC4):** `writeResult` mutation's idempotency guard is the data integrity mechanism for the entire triage pipeline. Zero tests.
2. **Retry logic (2-3:AC5):** Exponential backoff and terminal failure handling prevent runaway LLM API calls. Zero tests.
3. **Auth enforcement on mutations (2-1:AC5):** `withAuthor` on `submissions.create`, `withUser` on `listByAuthor` and `generateUploadUrl`. Zero tests.
4. **Ownership checks on queries (2-2:AC1):** `getById` ownership enforcement prevents data leaks. Zero tests.
5. **Response sanitization (2-3:AC7):** `sanitizeResult`, `truncateLlmField`, sanitized `lastError` messages prevent security leaks. Zero tests.

**Root cause analysis:** YOLO sprint mode prioritized implementation velocity over test evidence. The infrastructure for testing was set up (happy-dom, coverage-v8, Vitest projects) but no tests were written against the new infrastructure. The debt-fix pass resolved the tooling gap but did not close the coverage gap.

### Component test infrastructure set up but never used

TD-011 (happy-dom + Vitest projects) was resolved, giving the project the ability to write `.test.tsx` component tests. However, zero component tests were written across all 4 stories. There are 11 frontend components in `app/features/submissions/` with zero component-level verification.

This is a tooling-without-adoption pattern: the test runner is configured but nobody wrote the tests. For Epic 3, the first component test should be written as a proof-of-concept during the debt-fix pass to establish the pattern for other developers.

### TD-010 (Auth/RBAC tests) deferred for the second consecutive epic

TD-010 was identified as a P0 blocker in Epic 1's retrospective. It was carried into Epic 2's debt-fix pass and explicitly skipped with the rationale "requires Convex test harness with mocked context, out of scope for this pass." This is the second epic where this critical test gap has been deferred.

The deferral is technically justified -- Convex function testing does require a specific harness pattern -- but the impact is accumulating. Every new Convex function added in Epic 2 (`submissions.create`, `submissions.getById`, `submissions.listByAuthor`, `triage.startTriage`, `triage.writeResult`, `triage.getBySubmission`, `triage.getProgress`) inherits the same untested auth enforcement.

### Story 2-2 required 2 review cycles

Story 2-2 (Submission Status Tracking) was the only story requiring 2 fix commits from Codex review. Looking at the commit history:

```
e4c294b feat(2-2-submission-status-tracking): implement story
69c08bb fix: address Codex review feedback for 2-2-submission-status-tracking
62fb14c fix: address Codex review feedback for 2-2-submission-status-tracking
```

Two rounds of review feedback suggest either: (a) the spec had ambiguity that led to implementation variance, or (b) the reviewer caught incremental issues across passes. This is the only story across both epics with 2 fix cycles on the Codex review step specifically. The overhead was modest (~8 extra minutes), but the pattern is worth noting -- status tracking involved extracting shared utilities (STATUS_COLORS, STATUS_LABELS) from an existing file, which is a refactoring-during-implementation pattern that tends to generate review feedback.

### No Convex integration tests for any backend functions

Epic 2 added 7 new Convex functions (`submissions.create`, `submissions.getById`, `submissions.listByAuthor`, `triage.startTriageInternal`, `triage.startTriage`, `triage.getBySubmission`, `triage.getProgress`) plus 5 internal mutations (`writeResult`, `markRunning`, `markFailed`, `completeTriageRun`, `startTriageInternal`). None have integration tests.

The `writeResult`, `markRunning`, and `markFailed` internal mutations contain pure logic (index lookup + conditional patch) that could be unit tested with a simple mock of `ctx.db`. The barrier to testing these is lower than full auth-wrapper integration tests.

---

## 6. Cross-Story Patterns

### Pattern 1: Backend contracts stabilize, frontend implementation accelerates

Stories 2-1 through 2-3 established the Convex backend (mutations, queries, schema). Story 2-4, which was purely frontend consuming well-defined queries, completed in 17 minutes with zero review cycles. This 2x speed improvement suggests that front-loading backend contract definition accelerates downstream UI work.

**Implication for Epic 3:** Story 3.1 (Editor Pipeline Dashboard) depends on queries already defined. Stories with pre-existing backend contracts should be faster. New backend functions (reviewer matching, audit logs) will take standard time.

### Pattern 2: Tests concentrate on extractable pure functions

All test coverage in Epics 1 and 2 is on pure, extractable functions: `assertTransition`, error helpers, `getTimelineSteps`, `STATUS_COLORS`. Zero coverage exists for code that requires a Convex runtime context (`ctx.db`, `ctx.auth`, `ctx.scheduler`).

This is not a laziness pattern -- it reflects a real infrastructure gap. Writing tests for Convex functions requires either `convex-test` (official test harness) or manual mocking of the Convex context types. Until this harness is established, the test pyramid will remain inverted: strong utility coverage, zero integration coverage.

**Implication:** A dedicated testing story or spike to establish the Convex mock pattern would unblock tests for all existing and future Convex functions.

### Pattern 3: Feature folder co-location scales well

`app/features/submissions/` grew from 0 to 11 files across 4 stories without becoming disorganized. The barrel export keeps route files clean. The pattern of `feature-verb.tsx` naming (submission-form, submission-list, submission-detail, triage-display, triage-progress, triage-report-card) is discoverable and consistent.

**Implication:** This pattern should be replicated for Epic 3 (`app/features/editor/`) and Epic 4 (`app/features/review/`).

### Pattern 4: Debt-fix passes between epics are effective but limited

The debt-fix pass resolved tooling gaps (TD-011, TD-012) and code quality issues (3 DRY fixes) but did not close the primary quality gap (TD-010 auth tests). Tooling improvements have diminishing returns if the actual tests are not written.

**Implication:** Future debt-fix passes should allocate at least 50% of effort to writing actual tests, not just configuring test infrastructure.

---

## 7. Tech Debt Summary

### Items from Epic 1 Carried Forward

| ID | Description | Priority | Status After Epic 2 |
|----|-------------|----------|---------------------|
| TD-010 | Auth/RBAC wrappers have zero automated test coverage | P0 | SKIPPED again -- requires Convex test harness |
| TD-004 | Validator duplicates schema shape | Low | Deferred (Convex platform limitation) |

### Items Resolved During Epic 2

| ID | Description | Priority | Resolution |
|----|-------------|----------|------------|
| TD-011 | No component test infrastructure | P1 | happy-dom + Vitest projects config |
| TD-012 | No code coverage reporting | P2 | @vitest/coverage-v8 installed and configured |
| N/A | Duplicated PASS_DISPLAY_NAMES | P2 | Extracted to triage-constants.ts |
| N/A | Duplicated triage access checks | P2 | Consolidated to generic assertTriageAccess |
| N/A | Inconsistent string quoting in triage.ts | P3 | Standardized to single quotes |

### New Tech Debt Identified in Epic 2

| ID | Source | Description | Priority | Recommendation |
|----|--------|-------------|----------|----------------|
| TD-013 | 2-3 | Zero P0 test coverage for idempotent writes, retry logic, and sanitization | P0 | Write unit tests for writeResult, markFailed, sanitizeResult, truncateLlmField |
| TD-014 | 2-1/2-2 | Zero integration tests for submission mutations/queries | P0 | Write integration tests with mocked Convex context |
| TD-015 | 2-4 | Zero component tests despite infrastructure being ready | P1 | Write first component test as proof-of-concept |
| TD-016 | 2-3 | startTriage and startTriageInternal share duplicated logic | P2 | Extract shared triage initialization into helper function |

---

## 8. Test Coverage Analysis

### Current State (from Traceability Matrix)

| Priority | Total ACs | FULL Coverage | PARTIAL | NONE | Coverage % |
|----------|-----------|---------------|---------|------|------------|
| P0 | 5 | 0 | 3 | 2 | 0% |
| P1 | 12 | 2 | 0 | 10 | 17% |
| P2 | 8 | 0 | 0 | 8 | 0% |
| **Total** | **25** | **2** | **3** | **20** | **8%** |

### What IS Covered (FULL)

- **2-2:AC3** (Status timeline derives from state machine): 23 tests covering all 11 statuses, happy path, branch states
- **2-2:AC5** (Shared status utilities): Tests for STATUS_COLORS completeness, STATUS_LABELS values, formatDate output

### What IS NOT Covered (P0 Blockers)

1. **Idempotent writes (2-3:AC4):** writeResult no-op on duplicate, idempotencyKey index lookup
2. **Retry logic (2-3:AC5):** Attempt counting, delay calculation, terminal failure at attempt 3
3. **API response sanitization (2-3:AC7):** sanitizeResult, truncateLlmField, safe error messages
4. **Auth enforcement on mutations (2-1:AC5):** withAuthor on create, withUser on listByAuthor
5. **Ownership checks on queries (2-2:AC1):** getById ownership check, NOT_FOUND/UNAUTHORIZED errors

### Coverage by Test Level

| Level | Test Count | ACs Covered |
|-------|-----------|-------------|
| E2E | 0 | 0 |
| Integration | 0 | 0 |
| Component | 0 | 0 |
| Unit | 52 | 2 FULL + 3 PARTIAL |

### Test Quality Assessment

All 52 tests pass quality criteria: BDD naming, explicit assertions, comprehensive edge cases. Test execution completes in 302ms. The tests that exist are well-written -- the problem is coverage breadth, not depth.

---

## 9. Architecture Patterns Established in Epic 2

The following patterns were established or refined during Epic 2 and should be documented for future epics:

### 1. Convex 3-Step File Upload

```
Client validates -> generateUploadUrl mutation -> POST to Convex CDN -> submissions.create with storageId
```

Used in `pdf-upload.tsx` + `convex/storage.ts`. Reusable for any future file upload (reviewer paper access in Epic 4).

### 2. Chained Actions with Scheduler

```
startTriageInternal (mutation)
  -> runScope (action) -> writeResult (mutation) -> runFormatting (action)
  -> writeResult (mutation) -> runCitations (action)
  -> writeResult (mutation) -> runClaims (action)
  -> writeResult (mutation) -> completeTriageRun (mutation)
```

Each action schedules the next via `ctx.scheduler.runAfter(0, ...)`. Results are written via `ctx.runMutation(internal.triage.writeResult, ...)`. This provides fault isolation, progress tracking, and retry granularity.

### 3. Idempotent Writes via Index

```
writeResult checks by_idempotencyKey index -> if status "complete", return false (no-op)
```

The `idempotencyKey = submissionId + triageRunId + passName` pattern ensures retried passes do not overwrite existing results.

### 4. Bounded Exponential Backoff

```
attempt 1: immediate
attempt 2: 1000ms delay
attempt 3: 2000ms delay
attempt 4: terminal failure (markFailed)
```

Delay formula: `1000 * Math.pow(2, attempt - 1)`. Max 3 attempts.

### 5. Reactive Progress via Convex Queries

```
useQuery(api.triage.getProgress, { submissionId })  // { total, complete, running, failed, pending }
useQuery(api.triage.getBySubmission, { submissionId })  // ordered report array
```

Backend writes trigger automatic re-renders on the frontend. No polling, no WebSocket setup needed.

### 6. Conditional Query with Skip Pattern

```typescript
const shouldFetch = status !== 'DRAFT' && status !== 'SUBMITTED'
const reports = useQuery(api.triage.getBySubmission, shouldFetch ? { submissionId } : 'skip')
```

Prevents unnecessary Convex function calls for submissions that have not entered the triage pipeline.

---

## 10. Lessons Learned

### 1. YOLO mode trades test coverage for velocity -- deliberately

YOLO mode delivered 4 stories in under 2 hours with zero failures. The tradeoff was explicit: no P0 tests were written, and the quality gate failed. This is acceptable for a prototype sprint where the goal is to validate the architecture and build a working vertical slice. It is NOT acceptable for production readiness. The debt must be repaid before shipping.

### 2. Infrastructure without adoption produces zero coverage improvement

Setting up happy-dom and @vitest/coverage-v8 (TD-011, TD-012) resolved infrastructure blockers but did not improve coverage. The test count went from 29 to 52, but ALL new tests were for a pure utility function (`status-utils.ts`). Zero component tests were written using the new infrastructure. For Epic 3, the first debt-fix pass should include at least one proof-of-concept component test to establish the pattern.

### 3. Backend-first development accelerates frontend stories

Story 2-4 (frontend-only, consuming pre-existing queries from 2-3) completed in 17 minutes with zero review cycles. This is 2x faster than the average story. The pre-existing, well-typed backend API (queries with `returns` validators) eliminated ambiguity in the frontend implementation. Epic 3 should sequence backend stories before their frontend consumers.

### 4. Pure functions remain the only testable surface without a Convex harness

Across 2 epics and 8 stories, all FULL test coverage is on pure functions: `assertTransition`, error constructors, `getTimelineSteps`, `STATUS_COLORS`. The Convex context (`ctx.db`, `ctx.auth`, `ctx.scheduler`) remains untestable without a dedicated mock setup. This is the single largest systemic blocker to test coverage improvement.

### 5. Shared utility extraction during debt-fix passes works

Extracting `PASS_DISPLAY_NAMES` and `assertTriageAccess` during the debt-fix pass between implementation passes was effective. The pattern of "implement fast, consolidate during debt-fix" is compatible with YOLO mode and should continue.

### 6. The 3-session validation pattern continues to work

All stories followed spec-validation -> code-review -> implementation with consistent success. Story 2-4's zero review cycles demonstrate that well-bounded, frontend-only stories with clear backend contracts can pass first-attempt review.

---

## 11. Risks Carried Forward to Epic 3

### Critical (Must Address Before Epic 3 Feature Work)

| Risk | Impact | Accumulated Since | Mitigation |
|------|--------|-------------------|------------|
| Auth/RBAC wrappers untested (TD-010) | Security boundary unverified for ALL mutations/queries across 2 epics | Epic 1 | Establish Convex mock pattern, write auth wrapper tests |
| P0 triage safety mechanisms untested (TD-013) | Idempotency, retry, sanitization all unverified | Epic 2 | Write unit tests for pure logic in writeResult, markFailed, sanitizeResult |
| Submission mutation/query auth untested (TD-014) | Data access controls unverified for create, getById, listByAuthor | Epic 2 | Write integration tests with mocked Convex context |

### Moderate (Address During Epic 3)

| Risk | Impact | Mitigation |
|------|--------|------------|
| Zero component tests (TD-015) | 11 frontend components with no verification | Write proof-of-concept component test using happy-dom setup |
| Duplicated startTriage logic (TD-016) | Maintenance risk if initialization logic changes | Extract to shared helper |

### Low (Monitor)

| Risk | Impact | Mitigation |
|------|--------|------------|
| Newsreader font from Google CDN | External dependency | Accept for prototype |
| TD-004 validator duplication | Maintenance risk | Deferred to Convex platform improvement |

---

## 12. Recommendations for Epic 3

### Before Starting Epic 3 Feature Stories

1. **Establish Convex function test pattern (HIGHEST PRIORITY).** Create a single test file (`convex/__tests__/triage-mutations.test.ts`) that mocks `QueryCtx`/`MutationCtx` and tests `writeResult` idempotency and `markFailed` terminal state guard. This is pure logic testing (no external API calls) and should be achievable with manual mocks. The pattern established here unblocks all future Convex function tests. This resolves TD-013 (partial) and establishes the foundation for TD-010 and TD-014.

2. **Write at least one component test as proof-of-concept.** Test `TriageReportCard` or `StatusTimeline` using the happy-dom setup from TD-011. These are relatively simple components with deterministic rendering. The goal is to establish the import pattern, mock setup, and assertion style for future component tests. This resolves TD-015.

3. **Write unit tests for extractable pure functions.** `sanitizeResult`, `truncateLlmField`, and the backoff delay formula (`1000 * Math.pow(2, attempt - 1)`) can be tested as pure functions without any Convex context. Extract them if needed and write unit tests. This partially resolves TD-013.

### During Epic 3 Story Planning

4. **Sequence backend stories before frontend consumers.** Story 3.1 (Editor Dashboard) and 3.2 (Submission Detail with Triage) consume queries already defined. New backend work (3.3 audit logs, 3.4 reviewer profiles, 3.5 matching) should be sequenced to unblock frontend stories.

5. **Reuse the `app/features/` pattern.** Create `app/features/editor/` for dashboard components and `app/features/reviewer-profiles/` for reviewer management. Follow the same barrel-export pattern established in `app/features/submissions/`.

6. **Plan for reviewer matching embedding generation.** Story 3.4 requires OpenAI embeddings and story 3.5 requires Convex vector search. Both need `"use node";` actions and the same chained-action + retry pattern from `triage.ts`. The triage pipeline architecture is directly reusable.

### CLAUDE.md Update Suggestions

The current CLAUDE.md should be extended with patterns established in Epic 2:

- **Convex File Upload Pattern:** Document the 3-step flow (generateUploadUrl -> POST -> storageId)
- **Convex Chained Actions:** Document the scheduler-based chaining pattern from triage.ts
- **Vitest Projects Config:** Document the unit (Node) vs component (happy-dom) project split
- **Coverage Command:** Document `bun run test -- --coverage`
- **Feature Folder Pattern:** Document the `app/features/{domain}/` co-location pattern with barrel exports
- **Submission Feature Exports:** Document that `app/features/submissions/` is the canonical location for all submission-related components

---

## 13. Git History Analysis

8 commits across 4 stories:

```
845f84f feat(2-4-real-time-triage-progress-and-report-display): implement story
0e93903 feat(2-3-pdf-text-extraction-and-triage-orchestration): implement story
ce8ce17 fix: address Codex review feedback for 2-3-pdf-text-extraction-and-triage-orchestration
e4c294b feat(2-2-submission-status-tracking): implement story
69c08bb fix: address Codex review feedback for 2-2-submission-status-tracking
62fb14c fix: address Codex review feedback for 2-2-submission-status-tracking
520a269 feat(2-1-author-submission-form-and-pdf-upload): implement story
76f95d3 fix: address Codex review feedback for 2-1-author-submission-form-and-pdf-upload
```

**Pattern:** Each story produces 1 `feat` commit. Stories 2-1 and 2-3 have 1 fix commit; story 2-2 has 2 fix commits; story 2-4 has zero fix commits. The commit history is cleaner than Epic 1 (8 commits vs 10 for the same number of stories), reflecting both faster review cycles and the YOLO mode skipping some validation gates.

**Notable:** Story 2-4 is the first story across both epics with zero review-feedback commits. This correlates with it being the smallest-scope, frontend-only story with a pre-defined backend API.

---

## 14. Appendix: Files Created/Modified in Epic 2

### New Files (17)

**Backend:**
- `convex/submissions.ts` -- create, listByAuthor, getById mutations/queries
- `convex/storage.ts` -- generateUploadUrl mutation
- `convex/triage.ts` -- full triage pipeline (actions, mutations, queries)

**Frontend (features):**
- `app/features/submissions/submission-form.tsx`
- `app/features/submissions/pdf-upload.tsx`
- `app/features/submissions/submission-list.tsx`
- `app/features/submissions/submission-detail.tsx`
- `app/features/submissions/status-utils.ts`
- `app/features/submissions/status-timeline.tsx`
- `app/features/submissions/triage-display.tsx`
- `app/features/submissions/triage-progress.tsx`
- `app/features/submissions/triage-report-card.tsx`
- `app/features/submissions/triage-constants.ts`
- `app/features/submissions/index.ts`

**Routes:**
- `app/routes/submit/index.tsx` (modified from placeholder)
- `app/routes/submit/$submissionId.tsx` (modified from placeholder)

**Tests:**
- `app/__tests__/status-utils.test.ts` (23 tests)

---

**Generated:** 2026-02-08
**Analyst:** Retrospective Agent (claude-opus-4-6)
