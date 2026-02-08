# Traceability Matrix & Quality Gate -- Epic 2: Author Submission & LLM Triage Pipeline

**Epic:** 2 - Author Submission & LLM Triage Pipeline
**Date:** 2026-02-08
**Evaluator:** TEA Agent (testarch-trace)
**Stories Analyzed:** 4 (2-1, 2-2, 2-3, 2-4)
**Test Files Scanned:** 4 (transitions.test.ts, errors.test.ts, status-utils.test.ts, setup.test.ts)

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | PARTIAL Coverage | NONE Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------------- | ------------- | ---------- | ------ |
| P0        | 5              | 0             | 3                | 2             | 0%         | FAIL   |
| P1        | 12             | 2             | 0                | 10            | 17%        | FAIL   |
| P2        | 8              | 0             | 0                | 8             | 0%         | FAIL   |
| **Total** | **25**         | **2**         | **3**            | **20**        | **8%**     | **FAIL** |

**Legend:**
- FULL - All scenarios validated at appropriate test level(s)
- PARTIAL - Some supporting code is tested, but the AC behavior itself is not directly verified
- NONE - No test coverage at any level

---

### Detailed Traceability Matrix

#### Story 2-1: Author Submission Form and PDF Upload

| AC | Description | Priority | Implementation | Tests | Coverage |
|----|-------------|----------|---------------|-------|----------|
| AC1 | Submission form with all required fields | P1 | `app/features/submissions/submission-form.tsx`, `app/features/submissions/submission-list.tsx`, `app/routes/submit/index.tsx` | NONE | NONE |
| AC2 | PDF upload with progress and validation | P1 | `app/features/submissions/pdf-upload.tsx` | NONE | NONE |
| AC3 | Form submission creates a record with SUBMITTED status | P1 | `app/features/submissions/submission-form.tsx`, `convex/submissions.ts` (create mutation) | NONE | NONE |
| AC4 | Inline validation with Zod on the frontend | P1 | `app/features/submissions/submission-form.tsx` (Zod schema) | NONE | NONE |
| AC5 | Backend mutations with proper auth and validators | P0 | `convex/submissions.ts` (create, listByAuthor), `convex/storage.ts` (generateUploadUrl) | `convex/__tests__/errors.test.ts` (tests notFoundError, unauthorizedError used by getById) | PARTIAL |
| AC6 | Submissions list with real data | P1 | `app/features/submissions/submission-list.tsx` | NONE | NONE |

---

#### Story 2-2: Submission Status Tracking

| AC | Description | Priority | Implementation | Tests | Coverage |
|----|-------------|----------|---------------|-------|----------|
| AC1 | Convex query returns full submission detail for the owner | P0 | `convex/submissions.ts` (getById query with withUser, ownership check) | `convex/__tests__/errors.test.ts` (tests notFoundError, unauthorizedError used in getById) | PARTIAL |
| AC2 | Submission detail page shows all metadata | P1 | `app/features/submissions/submission-detail.tsx` | NONE | NONE |
| AC3 | Status timeline shows pipeline progression | P1 | `app/features/submissions/status-timeline.tsx`, `app/features/submissions/status-utils.ts` (getTimelineSteps, HAPPY_PATH, deriveHappyPath) | `app/__tests__/status-utils.test.ts` (23 tests: all 11 statuses, happy path, branch states, labels) | FULL |
| AC4 | Real-time status updates without page refresh | P2 | `app/features/submissions/submission-detail.tsx` (useQuery from convex/react) | NONE | NONE |
| AC5 | Shared status utilities | P1 | `app/features/submissions/status-utils.ts` (STATUS_COLORS, STATUS_LABELS, formatDate) | `app/__tests__/status-utils.test.ts` (tests STATUS_COLORS completeness, STATUS_LABELS values, formatDate output) | FULL |

---

#### Story 2-3: PDF Text Extraction and Triage Orchestration

| AC | Description | Priority | Implementation | Tests | Coverage |
|----|-------------|----------|---------------|-------|----------|
| AC1 | Triage pipeline trigger on submission creation | P1 | `convex/triage.ts` (startTriageInternal, startTriage), `convex/submissions.ts` (scheduler.runAfter) | `convex/__tests__/transitions.test.ts` (tests assertTransition SUBMITTED->TRIAGING path) | PARTIAL |
| AC2 | PDF text extraction in first triage action | P1 | `convex/triage.ts` (runScope: fetch PDF, extractText, handle empty text) | NONE | NONE |
| AC3 | Four chained LLM triage passes execute in sequence | P1 | `convex/triage.ts` (runScope, runFormatting, runCitations, runClaims, completeTriageRun) | NONE | NONE |
| AC4 | Idempotent result writes prevent duplicates | P0 | `convex/triage.ts` (writeResult: idempotencyKey check, no-op on complete) | NONE | NONE |
| AC5 | Retry with bounded exponential backoff | P0 | `convex/triage.ts` (catch blocks in all 4 actions: attemptCount, delayMs, markFailed) | NONE | NONE |
| AC6 | Reactive queries for triage progress | P1 | `convex/triage.ts` (getBySubmission, getProgress with withUser, assertTriageAccess) | NONE | NONE |
| AC7 | External API response sanitization | P0 | `convex/triage.ts` (sanitizeResult, truncateLlmField, MAX_LLM_FIELD_LENGTH=5000, sanitized lastError strings) | NONE | NONE |

---

#### Story 2-4: Real-Time Triage Progress and Report Display

| AC | Description | Priority | Implementation | Tests | Coverage |
|----|-------------|----------|---------------|-------|----------|
| AC1 | Triage progress indicator during TRIAGING status | P2 | `app/features/submissions/triage-progress.tsx` (TriageProgressIndicator: role="progressbar", aria-valuenow, aria-current) | NONE | NONE |
| AC2 | Real-time progress updates without page refresh | P2 | `app/features/submissions/triage-display.tsx` (useQuery with skip pattern) | NONE | NONE |
| AC3 | Triage report cards for completed triage | P2 | `app/features/submissions/triage-report-card.tsx` (Collapsible, severity dot, finding/recommendation) | NONE | NONE |
| AC4 | Staggered reveal animation on initial load | P2 | `app/features/submissions/triage-report-card.tsx` (animationDelay: index * 50ms, triage-card-enter class) | NONE | NONE |
| AC5 | Triage display integration in submission detail | P2 | `app/features/submissions/submission-detail.tsx` (TriageDisplay between keywords and timeline), `app/features/submissions/triage-display.tsx` | NONE | NONE |
| AC6 | Failed pass handling | P2 | `app/features/submissions/triage-progress.tsx` (XCircle, destructive styling), `app/features/submissions/triage-report-card.tsx` (AlertTriangle, destructive card) | NONE | NONE |
| AC7 | Pass label display names | P2 | `app/features/submissions/triage-constants.ts` (PASS_DISPLAY_NAMES, PASS_ORDER) | NONE | NONE |

---

### Gap Analysis

#### Critical Gaps (BLOCKER -- P0)

5 P0 criteria identified. **2 have NONE coverage, 3 have PARTIAL.** No P0 criteria have FULL coverage.

1. **2-3:AC4 -- Idempotent result writes prevent duplicates** (P0)
   - Current Coverage: NONE
   - Missing Tests: Unit test for writeResult mutation verifying no-op when status is "complete"; test that duplicate calls with same idempotencyKey only write once
   - Recommend: `2-3-UNIT-001` -- Unit test for writeResult idempotency logic
   - Impact: Data integrity risk -- duplicate LLM writes could corrupt triage reports

2. **2-3:AC5 -- Retry with bounded exponential backoff** (P0)
   - Current Coverage: NONE
   - Missing Tests: Unit test for retry scheduling logic (attempt counting, delay calculation, terminal failure at attempt 3); test for markFailed terminal state guard
   - Recommend: `2-3-UNIT-002` -- Unit test for retry pattern and backoff calculation
   - Impact: Reliability risk -- uncontrolled retries or silent failures in the LLM pipeline

3. **2-3:AC7 -- External API response sanitization** (P0)
   - Current Coverage: NONE
   - Missing Tests: Unit test for sanitizeResult/truncateLlmField functions; test that lastError messages are sanitized (no raw stack traces); test field length enforcement
   - Recommend: `2-3-UNIT-003` -- Unit test for sanitizeResult, truncateLlmField, error message sanitization
   - Impact: Security risk -- raw API errors, stack traces, or oversized LLM output could leak to client

4. **2-1:AC5 -- Backend mutations with proper auth and validators** (P0)
   - Current Coverage: PARTIAL (error helpers tested, but mutations themselves not tested)
   - Missing Tests: Integration test for submissions.create mutation (auth enforcement, field validation, scheduler call); test for listByAuthor query (index usage, projection); test for generateUploadUrl (auth)
   - Recommend: `2-1-INTEG-001` -- Integration test for submission backend functions
   - Impact: Auth bypass risk -- withAuthor enforcement and server-side validation not verified

5. **2-2:AC1 -- Convex query returns full submission detail for the owner** (P0)
   - Current Coverage: PARTIAL (error helpers tested, but getById query not tested)
   - Missing Tests: Integration test for getById query (ownership check, NOT_FOUND, UNAUTHORIZED errors); verify withUser wrapper; verify return shape
   - Recommend: `2-2-INTEG-001` -- Integration test for getById query auth and error handling
   - Impact: Data leak risk -- other users could access submissions if ownership check fails

---

#### High Priority Gaps (PR BLOCKER -- P1)

10 P1 criteria have NONE coverage, 1 has PARTIAL.

1. **2-1:AC1 -- Submission form with all required fields** (P1)
   - Current Coverage: NONE
   - Missing: Component test verifying form renders all fields (title, authors, abstract, keywords, PDF upload), pre-fills first author
   - Recommend: `2-1-COMP-001` -- Component test for SubmissionForm rendering

2. **2-1:AC2 -- PDF upload with progress and validation** (P1)
   - Current Coverage: NONE
   - Missing: Component test for PdfUpload (file type validation, size validation, error messages, upload states)
   - Recommend: `2-1-COMP-002` -- Component test for PdfUpload validation and states

3. **2-1:AC3 -- Form submission creates a record** (P1)
   - Current Coverage: NONE
   - Missing: Integration test verifying create mutation is called with correct args; toast on success; navigation on success
   - Recommend: `2-1-COMP-003` -- Component test for SubmissionForm submit flow

4. **2-1:AC4 -- Inline validation with Zod** (P1)
   - Current Coverage: NONE
   - Missing: Unit test for submissionFormSchema Zod validation (boundary values, error messages); component test for inline error display on blur
   - Recommend: `2-1-UNIT-001` -- Unit test for Zod submission schema validation rules

5. **2-1:AC6 -- Submissions list with real data** (P1)
   - Current Coverage: NONE
   - Missing: Component test for SubmissionList (renders submissions, empty state, status chips, links)
   - Recommend: `2-1-COMP-004` -- Component test for SubmissionList

6. **2-2:AC2 -- Submission detail page shows all metadata** (P1)
   - Current Coverage: NONE
   - Missing: Component test for SubmissionDetail (renders title, status badge, abstract with serif font, authors, keywords, date, back link)
   - Recommend: `2-2-COMP-001` -- Component test for SubmissionDetail rendering

7. **2-3:AC1 -- Triage pipeline trigger on submission creation** (P1)
   - Current Coverage: PARTIAL (assertTransition tested, but scheduler call and record creation not tested)
   - Missing: Integration test for startTriageInternal (creates 4 pending triageReports, schedules runScope, transitions to TRIAGING)
   - Recommend: `2-3-INTEG-001` -- Integration test for triage pipeline trigger

8. **2-3:AC2 -- PDF text extraction in first triage action** (P1)
   - Current Coverage: NONE
   - Missing: Integration test for runScope (PDF fetch, extractText, empty text handling)
   - Recommend: `2-3-INTEG-002` -- Integration test for PDF extraction in runScope

9. **2-3:AC3 -- Four chained LLM triage passes** (P1)
   - Current Coverage: NONE
   - Missing: Integration test verifying the chaining pattern (each pass schedules the next, completeTriageRun checks all 4)
   - Recommend: `2-3-INTEG-003` -- Integration test for chained pass orchestration

10. **2-3:AC6 -- Reactive queries for triage progress** (P1)
    - Current Coverage: NONE
    - Missing: Unit/integration test for getBySubmission (pass ordering, latest run filtering) and getProgress (count computation)
    - Recommend: `2-3-UNIT-004` -- Unit test for triage query logic

---

#### Medium Priority Gaps (P2)

8 P2 criteria have NONE coverage. These are frontend UI behaviors that require component or E2E tests.

1. **2-2:AC4** -- Real-time status updates (requires E2E with live Convex)
2. **2-4:AC1** -- Triage progress indicator (component test needed)
3. **2-4:AC2** -- Real-time progress updates (requires E2E with live Convex)
4. **2-4:AC3** -- Triage report cards (component test needed)
5. **2-4:AC4** -- Staggered reveal animation (visual regression or snapshot test)
6. **2-4:AC5** -- Triage display integration (component test needed)
7. **2-4:AC6** -- Failed pass handling (component test needed)
8. **2-4:AC7** -- Pass label display names (simple unit test for constants)

---

### Existing Test Inventory

| Test File | Tests | Test Level | Epic 2 ACs Covered | Status |
|-----------|-------|-----------|-------------------|--------|
| `convex/__tests__/transitions.test.ts` | 12 | Unit | 2-3:AC1 (partial), 2-3:AC3 (partial) | ALL PASS |
| `convex/__tests__/errors.test.ts` | 14 | Unit | 2-1:AC5 (partial), 2-2:AC1 (partial) | ALL PASS |
| `app/__tests__/status-utils.test.ts` | 23 | Unit | 2-2:AC3 (full), 2-2:AC5 (full) | ALL PASS |
| `app/__tests__/setup.test.ts` | 3 | Unit | N/A (project setup) | ALL PASS |
| **Total** | **52** | | | **52/52 PASS** |

### Coverage by Test Level

| Test Level  | Tests | Criteria Covered | Coverage % |
|-------------|-------|-----------------|------------|
| E2E         | 0     | 0               | 0%         |
| Integration | 0     | 0               | 0%         |
| Component   | 0     | 0               | 0%         |
| Unit        | 52    | 2 FULL + 3 PARTIAL | 8% (FULL) |
| **Total**   | **52** | **5 of 25** | **8%** |

### Test Quality Assessment

All 52 existing tests pass all quality criteria:

- `convex/__tests__/transitions.test.ts` (145 lines) -- Well-structured BDD format, explicit assertions, tests all statuses
- `convex/__tests__/errors.test.ts` (128 lines) -- Comprehensive error helper coverage, consistent pattern
- `app/__tests__/status-utils.test.ts` (168 lines) -- Thorough coverage of timeline logic, boundary cases, all 11 statuses

**52/52 tests (100%) meet quality criteria.**

No BLOCKER or WARNING quality issues detected.

---

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** Epic
**Decision Mode:** Deterministic

### Evidence Summary

#### Test Execution Results

- **Total Tests**: 52
- **Passed**: 52 (100%)
- **Failed**: 0 (0%)
- **Skipped**: 0 (0%)
- **Duration**: 302ms

**Overall Pass Rate**: 100% (for existing tests)

**Test Results Source**: Local run (`bun run test`, vitest 3.2.4)

#### Coverage Summary (from Phase 1)

**Requirements Coverage:**

- **P0 Acceptance Criteria**: 0/5 FULL covered (0%) -- FAIL
- **P1 Acceptance Criteria**: 2/12 FULL covered (17%) -- FAIL
- **P2 Acceptance Criteria**: 0/8 FULL covered (0%) -- informational
- **Overall Coverage**: 2/25 FULL (8%)

**Code Coverage**: Not assessed (instrumented coverage not run)

---

### Decision Criteria Evaluation

#### P0 Criteria (Must ALL Pass)

| Criterion             | Threshold | Actual | Status |
|-----------------------|-----------|--------|--------|
| P0 Coverage           | 100%      | 0%     | FAIL   |
| P0 Test Pass Rate     | 100%      | N/A (no P0 tests) | FAIL |
| Security Issues       | 0         | 3 untested (AC5 auth, AC1 ownership, AC7 sanitization) | FAIL |

**P0 Evaluation**: FAIL -- 0 of 5 P0 criteria have FULL test coverage.

#### P1 Criteria

| Criterion              | Threshold | Actual | Status |
|------------------------|-----------|--------|--------|
| P1 Coverage            | >= 80%    | 17%    | FAIL   |
| Overall Coverage       | >= 60%    | 8%     | FAIL   |

**P1 Evaluation**: FAIL

---

### GATE DECISION: FAIL

---

### Rationale

Epic 2 has significant test coverage gaps that prevent a PASS or CONCERNS rating.

**Key findings:**

1. **Zero P0 criteria have FULL coverage.** Five acceptance criteria classified as P0 (security, data integrity, core functionality) have no dedicated tests. These include auth enforcement on backend mutations (2-1:AC5), ownership checks on queries (2-2:AC1), idempotent write guards (2-3:AC4), retry/backoff logic (2-3:AC5), and API response sanitization (2-3:AC7).

2. **Only 2 of 25 ACs have FULL test coverage** (8% overall). Both are for status utility functions (2-2:AC3 timeline logic, 2-2:AC5 shared utilities). These tests are well-written and thorough.

3. **No component tests exist.** The project has `happy-dom` and `@vitest/coverage-v8` installed (per completed tasks #3 and #4), but no component tests have been written for the 11 frontend components in `app/features/submissions/`.

4. **No integration tests for Convex functions.** The backend mutations (`submissions.create`, `submissions.getById`, `submissions.listByAuthor`) and the triage pipeline functions have no integration tests. Convex functions with `withAuthor`/`withUser` wrappers, `assertTransition` calls, and scheduler operations are untested at the integration level.

5. **All 52 existing tests pass.** The tests that do exist are high quality and provide good coverage of their respective modules (transitions, errors, status-utils). The test infrastructure is sound.

**The implementation code itself appears correct** based on code review -- all story acceptance criteria are reflected in the implementation files. The gap is purely in test evidence, not in implementation completeness.

---

### Critical Issues

| Priority | Issue | Description | Status |
|----------|-------|-------------|--------|
| P0 | No auth/ownership tests | Backend mutations and queries lack tests for auth wrappers and ownership checks | OPEN |
| P0 | No idempotency tests | writeResult idempotency guard (2-3:AC4) is untested | OPEN |
| P0 | No sanitization tests | sanitizeResult and truncateLlmField functions (2-3:AC7) are untested | OPEN |
| P0 | No retry logic tests | Exponential backoff and terminal failure handling (2-3:AC5) are untested | OPEN |
| P1 | No component tests | 11 frontend components have zero component-level tests | OPEN |
| P1 | No Convex integration tests | Backend function behavior (create, getById, listByAuthor, triage pipeline) not tested | OPEN |

**Blocking Issues Count**: 4 P0 blockers, 2 P1 issues

---

### Recommendations

#### Immediate Actions (Before Next Sprint)

1. **Add P0 unit tests for triage safety mechanisms** -- Write unit tests for `sanitizeResult`, `truncateLlmField`, `writeResult` idempotency, and `markRunning`/`markFailed` terminal state guards. These are pure functions or simple mutations that can be tested without mocking external services. Covers 2-3:AC4, 2-3:AC5, 2-3:AC7.

2. **Add unit tests for Zod validation schemas** -- The `submissionFormSchema` in `submission-form.tsx` can be extracted and unit tested directly (boundary values, error messages). Covers 2-1:AC4.

3. **Add unit test for triage constants** -- Simple test for `PASS_DISPLAY_NAMES` and `PASS_ORDER` completeness. Covers 2-4:AC7.

#### Short-term Actions (This Sprint)

4. **Add component tests for core submission components** -- Using the existing happy-dom setup, write component tests for `SubmissionForm`, `PdfUpload`, `SubmissionList`, `SubmissionDetail`, `TriageDisplay`, `TriageProgressIndicator`, `TriageReportCard`. Covers 2-1:AC1-AC4, 2-1:AC6, 2-2:AC2, 2-4:AC1, 2-4:AC3-AC7.

5. **Add Convex function integration tests** -- Test `submissions.create`, `submissions.getById`, `submissions.listByAuthor` with mocked auth context. Verify auth wrappers, ownership enforcement, validator behavior. Covers 2-1:AC5, 2-2:AC1.

#### Long-term Actions (Backlog)

6. **Add E2E tests for real-time reactivity** -- End-to-end tests verifying that status changes propagate to the UI without refresh (2-2:AC4, 2-4:AC2). Requires Convex test environment.

7. **Add integration tests for triage pipeline** -- Test the full chained action flow (startTriageInternal -> runScope -> runFormatting -> runCitations -> runClaims -> completeTriageRun) with mocked LLM calls. Covers 2-3:AC1-AC3, 2-3:AC6.

---

## Related Artifacts

- **Story Files:**
  - `/Users/luca/dev/alignment-journal/_bmad-output/implementation-artifacts/stories/2-1-author-submission-form-and-pdf-upload.md`
  - `/Users/luca/dev/alignment-journal/_bmad-output/implementation-artifacts/stories/2-2-submission-status-tracking.md`
  - `/Users/luca/dev/alignment-journal/_bmad-output/implementation-artifacts/stories/2-3-pdf-text-extraction-and-triage-orchestration.md`
  - `/Users/luca/dev/alignment-journal/_bmad-output/implementation-artifacts/stories/2-4-real-time-triage-progress-and-report-display.md`
- **Test Files:**
  - `/Users/luca/dev/alignment-journal/convex/__tests__/transitions.test.ts`
  - `/Users/luca/dev/alignment-journal/convex/__tests__/errors.test.ts`
  - `/Users/luca/dev/alignment-journal/app/__tests__/status-utils.test.ts`
  - `/Users/luca/dev/alignment-journal/app/__tests__/setup.test.ts`
- **Implementation Files (Frontend):**
  - `/Users/luca/dev/alignment-journal/app/features/submissions/submission-form.tsx`
  - `/Users/luca/dev/alignment-journal/app/features/submissions/pdf-upload.tsx`
  - `/Users/luca/dev/alignment-journal/app/features/submissions/submission-list.tsx`
  - `/Users/luca/dev/alignment-journal/app/features/submissions/submission-detail.tsx`
  - `/Users/luca/dev/alignment-journal/app/features/submissions/status-utils.ts`
  - `/Users/luca/dev/alignment-journal/app/features/submissions/status-timeline.tsx`
  - `/Users/luca/dev/alignment-journal/app/features/submissions/triage-display.tsx`
  - `/Users/luca/dev/alignment-journal/app/features/submissions/triage-progress.tsx`
  - `/Users/luca/dev/alignment-journal/app/features/submissions/triage-report-card.tsx`
  - `/Users/luca/dev/alignment-journal/app/features/submissions/triage-constants.ts`
  - `/Users/luca/dev/alignment-journal/app/features/submissions/index.ts`
- **Implementation Files (Backend):**
  - `/Users/luca/dev/alignment-journal/convex/submissions.ts`
  - `/Users/luca/dev/alignment-journal/convex/storage.ts`
  - `/Users/luca/dev/alignment-journal/convex/triage.ts`
  - `/Users/luca/dev/alignment-journal/convex/helpers/transitions.ts`
  - `/Users/luca/dev/alignment-journal/convex/helpers/errors.ts`
- **Route Files:**
  - `/Users/luca/dev/alignment-journal/app/routes/submit/index.tsx`
  - `/Users/luca/dev/alignment-journal/app/routes/submit/$submissionId.tsx`

---

## Sign-Off

**Phase 1 - Traceability Assessment:**

- Overall Coverage: 8% (2/25 FULL)
- P0 Coverage: 0% (0/5 FULL) -- FAIL
- P1 Coverage: 17% (2/12 FULL) -- FAIL
- Critical Gaps: 5 (P0)
- High Priority Gaps: 10 (P1)

**Phase 2 - Gate Decision:**

- **Decision**: FAIL
- **P0 Evaluation**: FAIL -- 0 of 5 P0 criteria have FULL coverage
- **P1 Evaluation**: FAIL -- 2 of 12 P1 criteria have FULL coverage (17%)

**Overall Status:** FAIL

**Next Steps:**

- FAIL: Block deployment readiness assertion until P0 tests are written
- Run `testarch-atdd` workflow to generate test designs for missing coverage
- Prioritize: P0 unit tests (sanitization, idempotency, retry) -> P1 component tests -> P1 integration tests
- Re-run `testarch-trace` after tests are added to reassess

**Generated:** 2026-02-08
**Workflow:** testarch-trace v5.0 (Epic-Level Trace)
