# Traceability Matrix & Quality Gate -- Epic 3: Editor Dashboard & Reviewer Assignment

**Epic:** 3 - Editor Dashboard & Reviewer Assignment
**Date:** 2026-02-08
**Evaluator:** TEA Agent (testarch-trace)
**Stories Analyzed:** 7 (3-1, 3-2, 3-3, 3-4, 3-5, 3-6, 3-7)
**Test Files Scanned:** 5 (transitions.test.ts, errors.test.ts, matching-utils.test.ts, status-utils.test.ts, setup.test.ts)

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | PARTIAL Coverage | NONE Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------------- | ------------- | ---------- | ------ |
| P0        | 11             | 0             | 6                | 5             | 0%         | FAIL   |
| P1        | 23             | 0             | 0                | 23            | 0%         | FAIL   |
| P2        | 19             | 0             | 0                | 19            | 0%         | FAIL   |
| **Total** | **53**         | **0**         | **6**            | **47**        | **0%**     | **FAIL** |

**Legend:**
- FULL - All scenarios validated at appropriate test level(s)
- PARTIAL - Some supporting code is tested, but the AC behavior itself is not directly verified
- NONE - No test coverage at any level

---

### Detailed Traceability Matrix

#### Story 3-1: Editor Pipeline Dashboard

| AC | Description | Priority | Implementation | Tests | Coverage |
|----|-------------|----------|---------------|-------|----------|
| AC1 | Paginated data table with all submissions (role-gated query with `args`/`returns` validators) | P0 | `convex/submissions.ts` (`listForEditor` query with `withUser` + role check, `paginationOptsValidator`), `app/features/editor/pipeline-table.tsx`, `app/routes/editor/index.tsx` | `convex/__tests__/errors.test.ts` (tests `unauthorizedError` used in role check) | PARTIAL |
| AC2 | Cursor-based pagination with "Load more" | P1 | `app/features/editor/pipeline-table.tsx` (`usePaginatedQuery`, `loadMore(25)`, status checks) | NONE | NONE |
| AC3 | Status filter with multi-select chips | P1 | `app/features/editor/pipeline-filters.tsx` (toggleable status chip buttons), `app/routes/editor/index.tsx` (`validateSearch`, URL param persistence) | NONE | NONE |
| AC4 | Title search with debounce | P2 | `app/features/editor/pipeline-filters.tsx` (debounced search input), `app/routes/editor/index.tsx` (URL param `q`) | NONE | NONE |
| AC5 | Row click navigation to submission detail | P2 | `app/features/editor/pipeline-table.tsx` (`cursor-pointer`, `useNavigate` to `/editor/$submissionId`) | NONE | NONE |
| AC6 | Editor sidebar navigation (240px fixed, persists across sub-routes) | P1 | `app/features/editor/editor-sidebar.tsx`, `app/routes/editor/route.tsx` (integrated in layout outside ErrorBoundary) | NONE | NONE |
| AC7 | Real-time updates via Convex reactive queries | P2 | `app/features/editor/pipeline-table.tsx` (`usePaginatedQuery` from `convex/react` is inherently reactive) | NONE | NONE |
| AC8 | Empty state for no submissions / no filter matches | P2 | `app/features/editor/pipeline-table.tsx` (empty state with "Clear filters" action) | NONE | NONE |

---

#### Story 3-2: Submission Detail View with Triage Results

| AC | Description | Priority | Implementation | Tests | Coverage |
|----|-------------|----------|---------------|-------|----------|
| AC1 | Full submission metadata display (`getByIdForEditor` with role check, `args`/`returns` validators) | P0 | `convex/submissions.ts` (`getByIdForEditor` query with `withUser`, `ctx.storage.getUrl`), `app/features/editor/submission-detail-editor.tsx` | `convex/__tests__/errors.test.ts` (tests `unauthorizedError`, `notFoundError` used in query) | PARTIAL |
| AC2 | Triage report section (reuses `TriageDisplay` from submissions) | P1 | `app/features/editor/submission-detail-editor.tsx` (imports `TriageDisplay` from `~/features/submissions`) | NONE | NONE |
| AC3 | Interactive status transitions via StatusChip (dropdown with `VALID_TRANSITIONS`) | P1 | `app/features/editor/status-transition-chip.tsx` (`DropdownMenu`, reads `VALID_TRANSITIONS[currentStatus]`) | `convex/__tests__/transitions.test.ts` (tests `VALID_TRANSITIONS` map completeness and correctness) | PARTIAL |
| AC4 | Desk reject with confirmation dialog (AlertDialog, Tier 3) | P1 | `app/features/editor/status-transition-chip.tsx` (`AlertDialog` for `DESK_REJECTED` transition) | `convex/__tests__/transitions.test.ts` (tests `DESK_REJECTED` as terminal state) | PARTIAL |
| AC5 | Status transition mutation (`transitionStatus` with `assertTransition`, audit trail) | P0 | `convex/submissions.ts` (`transitionStatus` mutation: `withUser` + role check + `assertTransition` + audit logging via `ctx.scheduler.runAfter`) | `convex/__tests__/transitions.test.ts` (tests `assertTransition` for all valid/invalid paths), `convex/__tests__/errors.test.ts` (tests `invalidTransitionError`) | PARTIAL |
| AC6 | Back navigation to dashboard | P2 | `app/features/editor/submission-detail-editor.tsx` (`Link` to `/editor/` with `ArrowLeft` icon) | NONE | NONE |
| AC7 | Real-time updates via Convex reactive queries | P2 | `app/features/editor/submission-detail-editor.tsx` (`useQuery` from `convex/react`) | NONE | NONE |
| AC8 | PDF download link with file name and size | P2 | `app/features/editor/submission-detail-editor.tsx` (PDF section with download link, `formatFileSize`) | NONE | NONE |

---

#### Story 3-3: Action Editor Assignment and Audit Trail

| AC | Description | Priority | Implementation | Tests | Coverage |
|----|-------------|----------|---------------|-------|----------|
| AC1 | Editor-in-Chief can assign action editor (`assignActionEditor` mutation, `editor_in_chief` role-gated) | P0 | `convex/submissions.ts` (`assignActionEditor` mutation: `editor_in_chief` only, validates target user role), `app/features/editor/action-editor-selector.tsx` (`Select` dropdown) | `convex/__tests__/errors.test.ts` (tests `unauthorizedError` used in role check) | PARTIAL |
| AC2 | Audit log entry created for assignment (deferred write via `logAction`) | P0 | `convex/submissions.ts` (`assignActionEditor`: schedules `internal.audit.logAction`), `convex/audit.ts` (`logAction` internalMutation) | NONE | NONE |
| AC3 | AuditTimeline displays chronological entries with actor names | P1 | `app/features/editor/audit-timeline.tsx` (vertical timeline with connected dots), `convex/audit.ts` (`listBySubmission` paginated query with actor name resolution) | NONE | NONE |
| AC4 | Cursor-based pagination for audit trail | P1 | `app/features/editor/audit-timeline.tsx` (`usePaginatedQuery`, `initialNumItems: 20`, "Load more" button) | NONE | NONE |
| AC5 | Audit logs are append-only (only `logAction` internalMutation inserts) | P0 | `convex/audit.ts` (only `logAction` writes to `auditLogs`; no update/delete mutations) | NONE | NONE |
| AC6 | AuditTimeline filterable by action type | P2 | `app/features/editor/audit-timeline.tsx` (filter chips for action types), `convex/audit.ts` (`actionFilter` arg in `listBySubmission`) | NONE | NONE |
| AC7 | Re-assignment of action editor (logs `action_editor_reassigned`) | P1 | `convex/submissions.ts` (`assignActionEditor`: detects previous assignment, logs reassignment) | NONE | NONE |

---

#### Story 3-4: Reviewer Profile Management and Embedding Generation

| AC | Description | Priority | Implementation | Tests | Coverage |
|----|-------------|----------|---------------|-------|----------|
| AC1 | Reviewer profile creation (`createOrUpdateProfile` with validations) | P1 | `convex/matching.ts` (`createOrUpdateProfile` mutation: validates user role, min publications, min research areas, upsert semantics) | NONE | NONE |
| AC2 | Reviewer profile update (upsert semantics, triggers embedding) | P1 | `convex/matching.ts` (`createOrUpdateProfile`: checks `by_userId` index, patches or inserts, schedules `generateEmbedding`) | NONE | NONE |
| AC3 | Automatic embedding generation (OpenAI text-embedding-3-large, dimensions: 1536) | P0 | `convex/matching.ts` (`generateEmbedding` internalAction: reads profile, builds text, calls OpenAI, `saveEmbedding` with stale-check) | NONE | NONE |
| AC4 | Reviewer pool list view at `/admin/` | P1 | `app/features/admin/reviewer-pool.tsx` (`useQuery(api.matching.listProfiles)`), `app/routes/admin/index.tsx` | NONE | NONE |
| AC5 | Profile form with publications (tag input, dynamic list, validation) | P1 | `app/features/admin/reviewer-profile-form.tsx` (user selector, research areas tags, publications list, validation) | NONE | NONE |
| AC6 | Profile management restricted to admin/editor (route + mutation + query guards) | P0 | `convex/matching.ts` (mutations: `admin`/`editor_in_chief` check; queries: `EDITOR_ROLES` check), `app/routes/admin/route.tsx` (`ALLOWED_ROLES = ['admin', 'editor_in_chief']`) | `convex/__tests__/errors.test.ts` (tests `unauthorizedError`) | PARTIAL |
| AC7 | Embedding status visibility (green/amber badge) | P2 | `app/features/admin/reviewer-pool.tsx` (embedding field presence check, green/amber `Badge`) | NONE | NONE |

---

#### Story 3-5: Intelligent Reviewer Matching with Explainable Rationale

| AC | Description | Priority | Implementation | Tests | Coverage |
|----|-------------|----------|---------------|-------|----------|
| AC1 | Paper embedding and vector search (`findMatches` action, text-embedding-3-large, `ctx.vectorSearch`) | P0 | `convex/matching.ts` (`findMatches` action: builds paper text, OpenAI embedding, `ctx.vectorSearch('reviewerProfiles', 'by_embedding', ...)`, `getSubmissionInternal` internalQuery) | `convex/__tests__/matching-utils.test.ts` (tests `buildPaperText` including truncation at 8000 chars) | PARTIAL |
| AC2 | Explainable rationale generation (Vercel AI SDK `generateObject`, fallback) | P1 | `convex/matching.ts` (`findMatches`: `generateObject` with zod schema for rationale + confidence; `generateFallbackRationale` for LLM failure) | `convex/__tests__/matching-utils.test.ts` (tests `generateFallbackRationale` with overlap/no-overlap/edge cases) | PARTIAL |
| AC3 | Match results persistence and reactive display (`matchResults` table, `saveMatchResults`, `getMatchResults`) | P1 | `convex/matching.ts` (`saveMatchResults` internalMutation, `getMatchResults` query), `convex/schema.ts` (`matchResults` table with `by_submissionId` index) | NONE | NONE |
| AC4 | ReviewerMatchCard component (name, affiliation, expertise tags, rationale, confidence bar) | P2 | `app/features/editor/reviewer-match-card.tsx` (Card with Badge pills, confidence Progress bar, Select/Dismiss buttons) | NONE | NONE |
| AC5 | Reviewer match panel integration (appears for TRIAGE_COMPLETE/UNDER_REVIEW) | P1 | `app/features/editor/reviewer-match-panel.tsx` (`useQuery`, `useAction`), `app/features/editor/submission-detail-editor.tsx` (conditional render) | NONE | NONE |
| AC6 | Editor interaction with matches (select, dismiss, re-run, local state) | P2 | `app/features/editor/reviewer-match-panel.tsx` (`useState` for selectedIds/dismissedIds, sort logic) | NONE | NONE |
| AC7 | Performance and error handling (30s target, API key check, sanitization, fallback) | P0 | `convex/matching.ts` (error handling in `findMatches`: `sanitizeErrorMessage`, status `failed`, `console.error` with `[matching]` prefix) | `convex/__tests__/matching-utils.test.ts` (tests `sanitizeErrorMessage`: API key, rate limit, timeout, long messages, non-Error objects, URL stripping) | PARTIAL |

---

#### Story 3-6: Reviewer Invitation and Progress Monitoring

| AC | Description | Priority | Implementation | Tests | Coverage |
|----|-------------|----------|---------------|-------|----------|
| AC1 | Send invitations from selected matches (`sendInvitations` mutation, token hash, `reviews` record creation) | P0 | `convex/invitations.ts` (`sendInvitations` mutation: `crypto.randomUUID()`, SHA-256 hash, creates `reviewInvites`, `reviews`, `notifications`, schedules `logAction`) | NONE | NONE |
| AC2 | Notification preview for invitation email (formatted body with title, rationale, compensation, deadline) | P1 | `convex/invitations.ts` (`sendInvitations`: inserts `notifications` with type `reviewer_invitation`, formatted body template) | NONE | NONE |
| AC3 | Invitation list with status (`listBySubmission` query, derived status) | P1 | `convex/invitations.ts` (`listBySubmission` query: resolves reviewer names, derives status from `revokedAt`/`consumedAt`/`expiresAt`) | NONE | NONE |
| AC4 | Revoke invitation (`revokeInvitation` mutation, validation) | P1 | `convex/invitations.ts` (`revokeInvitation` mutation: validates not consumed/revoked, sets `revokedAt`, schedules `logAction`) | NONE | NONE |
| AC5 | Review progress indicators (green/amber/red dots based on status + time) | P1 | `convex/invitations.ts` (`getReviewProgress` query), `app/features/editor/review-progress-indicator.tsx` (colored dot component) | NONE | NONE |
| AC6 | Invitation panel UI (summary, send button, undo toast) | P1 | `app/features/editor/invitation-panel.tsx` (sonner toast with undo, `useMutation`) | NONE | NONE |
| AC7 | Progress monitoring section on submission detail page | P2 | `app/features/editor/submission-detail-editor.tsx` (`useQuery(api.invitations.getReviewProgress)`, `ReviewProgressIndicator` components) | NONE | NONE |
| AC8 | Audit trail integration (`reviewer_invited`, `reviewer_invite_revoked` entries) | P2 | `convex/invitations.ts` (`sendInvitations`/`revokeInvitation`: schedule `logAction` with appropriate actions) | NONE | NONE |

---

#### Story 3-7: Editorial Decisions

| AC | Description | Priority | Implementation | Tests | Coverage |
|----|-------------|----------|---------------|-------|----------|
| AC1 | Make editorial decision - Accept (`makeDecision` mutation, `ACCEPTED` transition, notification, audit) | P1 | `convex/decisions.ts` (`makeDecision` mutation: validates `DECISION_PENDING`, `assertTransition`, stores `decisionNote`, creates notification, schedules `logAction`) | `convex/__tests__/transitions.test.ts` (tests `assertTransition(DECISION_PENDING, ACCEPTED)`) | PARTIAL |
| AC2 | Make editorial decision - Reject (required `decisionNote`, `REJECTED` transition) | P1 | `convex/decisions.ts` (`makeDecision`: validates non-empty `decisionNote` for `REJECTED`) | `convex/__tests__/transitions.test.ts` (tests `assertTransition(DECISION_PENDING, REJECTED)`) | PARTIAL |
| AC3 | Make editorial decision - Revision Requested (required `decisionNote`, `REVISION_REQUESTED` transition) | P1 | `convex/decisions.ts` (`makeDecision`: validates non-empty `decisionNote` for `REVISION_REQUESTED`) | `convex/__tests__/transitions.test.ts` (tests `assertTransition(DECISION_PENDING, REVISION_REQUESTED)`) | PARTIAL |
| AC4 | Undo decision within grace period (`undoDecision` mutation, 10s window, bypasses transition map) | P0 | `convex/decisions.ts` (`undoDecision` mutation: validates time window, patches back to `DECISION_PENDING`, clears `decisionNote`, schedules `logAction`) | NONE | NONE |
| AC5 | Decision panel UI (three buttons, inline form, character counter, confirm/cancel) | P2 | `app/features/editor/decision-panel.tsx` (Accept/Reject/Revision buttons, textarea, confirm/cancel, character counter) | NONE | NONE |
| AC6 | Payment estimate summary (`getPaymentEstimates` query, per-reviewer ranges) | P1 | `convex/decisions.ts` (`getPaymentEstimates` query: resolves reviewer names, computes ranges by status) | NONE | NONE |
| AC7 | Author notification content (templates per decision type) | P2 | `convex/decisions.ts` (`makeDecision`: formatted notification body templates for accept/reject/revision) | NONE | NONE |
| AC8 | Audit trail integration (`decision_accepted`, `decision_rejected`, `decision_revision_requested`, `decision_undone`) | P2 | `convex/decisions.ts` (`makeDecision`/`undoDecision`: schedule `logAction` with appropriate action types) | NONE | NONE |

---

## PHASE 2: IMPLEMENTATION VERIFICATION

### Implementation Files Inventory

#### Backend (Convex)

| File | Functions | Story |
|------|-----------|-------|
| `convex/submissions.ts` | `listForEditor` (query), `getByIdForEditor` (query), `transitionStatus` (mutation), `assignActionEditor` (mutation) | 3-1, 3-2, 3-3 |
| `convex/audit.ts` | `logAction` (internalMutation), `listBySubmission` (query) | 3-2, 3-3 |
| `convex/users.ts` | `listEditors` (query) | 3-3 |
| `convex/matching.ts` | `createOrUpdateProfile` (mutation), `getProfileByUserId` (query), `listProfiles` (query), `listReviewerUsers` (query), `generateEmbedding` (internalAction), `saveEmbedding` (internalMutation), `getProfileInternal` (internalQuery), `getSubmissionInternal` (internalQuery), `saveMatchResults` (internalMutation), `findMatches` (action), `getMatchResults` (query) | 3-4, 3-5 |
| `convex/invitations.ts` | `sendInvitations` (mutation), `listBySubmission` (query), `revokeInvitation` (mutation), `getReviewProgress` (query) | 3-6 |
| `convex/decisions.ts` | `makeDecision` (mutation), `undoDecision` (mutation), `getPaymentEstimates` (query) | 3-7 |
| `convex/schema.ts` | `matchResults` table addition | 3-5 |

#### Frontend (React Components)

| File | Component | Story |
|------|-----------|-------|
| `app/features/editor/editor-constants.ts` | `EDITOR_ROLES`, `STATUS_GROUPS`, reexports | 3-1 |
| `app/features/editor/pipeline-table.tsx` | `PipelineTable` | 3-1 |
| `app/features/editor/pipeline-filters.tsx` | `PipelineFilters` | 3-1 |
| `app/features/editor/editor-sidebar.tsx` | `EditorSidebar` | 3-1 |
| `app/features/editor/submission-detail-editor.tsx` | `EditorSubmissionDetail` | 3-2, 3-3, 3-5, 3-6, 3-7 |
| `app/features/editor/status-transition-chip.tsx` | `StatusTransitionChip` | 3-2, 3-7 |
| `app/features/editor/action-editor-selector.tsx` | `ActionEditorSelector` | 3-3 |
| `app/features/editor/audit-timeline.tsx` | `AuditTimeline` | 3-3 |
| `app/features/editor/reviewer-match-card.tsx` | `ReviewerMatchCard` | 3-5 |
| `app/features/editor/reviewer-match-panel.tsx` | `ReviewerMatchPanel` | 3-5, 3-6 |
| `app/features/editor/review-progress-indicator.tsx` | `ReviewProgressIndicator` | 3-6 |
| `app/features/editor/invitation-panel.tsx` | `InvitationPanel` | 3-6 |
| `app/features/editor/decision-panel.tsx` | `DecisionPanel` | 3-7 |
| `app/features/editor/index.ts` | Barrel exports (14 components) | 3-1 through 3-7 |
| `app/features/admin/reviewer-pool.tsx` | `ReviewerPool` | 3-4 |
| `app/features/admin/reviewer-profile-form.tsx` | `ReviewerProfileForm` | 3-4 |
| `app/features/admin/index.ts` | Barrel exports | 3-4 |

#### Route Files

| File | Purpose | Story |
|------|---------|-------|
| `app/routes/editor/route.tsx` | Editor layout with sidebar integration | 3-1 |
| `app/routes/editor/index.tsx` | Pipeline dashboard with URL param persistence | 3-1 |
| `app/routes/editor/$submissionId.tsx` | Submission detail with `EditorSubmissionDetail` | 3-2 |
| `app/routes/admin/route.tsx` | Admin layout with `ALLOWED_ROLES` updated | 3-4 |
| `app/routes/admin/index.tsx` | Reviewer pool management | 3-4 |

---

## PHASE 3: TEST COVERAGE ANALYSIS

### Test Files Relevant to Epic 3

| Test File | Tests | Covers |
|-----------|-------|--------|
| `convex/__tests__/transitions.test.ts` | 10 tests: `SUBMISSION_STATUSES` (11 statuses), `VALID_TRANSITIONS` (all paths, terminal states), `assertTransition` (valid, invalid, terminal, full pipeline, revision loop) | 3-2 AC3/AC4/AC5, 3-7 AC1/AC2/AC3 (transition validation) |
| `convex/__tests__/errors.test.ts` | 12 tests: all 10 error helpers (`unauthorizedError`, `invalidTransitionError`, `notFoundError`, `validationError`, `versionConflictError`, `inviteTokenInvalidError`, `inviteTokenExpiredError`, `inviteTokenUsedError`, `externalServiceError`, `environmentMisconfiguredError`) | 3-1 AC1, 3-2 AC1/AC5, 3-3 AC1, 3-4 AC6 (error handling in mutations/queries) |
| `convex/__tests__/matching-utils.test.ts` | 17 tests: `buildPaperText` (4 tests: build, empty keywords, truncation), `sanitizeErrorMessage` (8 tests: API key, rate limit, timeout, URLs, long msgs, non-Error), `generateFallbackRationale` (5 tests: overlap, case-insensitive, no overlap, limits) | 3-5 AC1 (paper text building), 3-5 AC2 (fallback rationale), 3-5 AC7 (error sanitization) |
| `app/__tests__/status-utils.test.ts` | 23 tests: `STATUS_COLORS`, `STATUS_LABELS`, `formatDate`, `getTimelineSteps` (all statuses, happy path, branch states) | Shared utilities used across 3-1/3-2 (status display) |

### What Is Tested vs What Is Missing

**Tested (PARTIAL coverage):**
- State machine transition validation (`assertTransition`) -- but NOT the full `transitionStatus` mutation with auth, DB writes, and audit logging
- Error helper construction -- but NOT the mutations that throw these errors
- Paper text building and truncation -- but NOT the full `findMatches` action pipeline (embedding, vector search, LLM call)
- Fallback rationale generation -- but NOT the LLM-powered rationale path
- Error message sanitization -- but NOT the integration with the matching action's error handling

**NOT Tested (major gaps):**
- No Convex mutation/query integration tests for any Epic 3 function
- No component tests (`.test.tsx`) for any Epic 3 React component
- No tests for `sendInvitations` token generation and hashing
- No tests for `undoDecision` time window validation
- No tests for `assignActionEditor` role enforcement
- No tests for `makeDecision` decision note validation (required for reject/revision)
- No tests for `createOrUpdateProfile` profile validation (min publications, min research areas, user role check)
- No tests for audit log append-only invariant
- No tests for `getPaymentEstimates` calculation logic
- No tests for invitation status derivation logic
- No tests for review progress indicator logic (7-day threshold)

---

## PHASE 4: QUALITY GATE

### Gate Criteria

| Rating | Criteria |
|--------|----------|
| **PASS** | >= 80% ACs have FULL coverage, no P0 gaps |
| **CONCERNS** | >= 60% ACs have FULL coverage, no more than 2 P0 gaps |
| **FAIL** | < 60% coverage OR > 2 P0 gaps |

### Gate Result: **FAIL**

- **FULL coverage:** 0 / 53 ACs (0%)
- **PARTIAL coverage:** 6 / 53 ACs (11%)
- **NONE coverage:** 47 / 53 ACs (89%)
- **P0 gaps with NONE coverage:** 5 (exceeds threshold of 2)

### Gaps by Priority

#### P0 Gaps (Security, Data Integrity, Core Functionality) -- 5 with NONE coverage

| Gap | Story:AC | Description | Risk |
|-----|----------|-------------|------|
| P0-1 | 3-3:AC2 | Audit log entry creation for assignment -- no test verifying `logAction` is scheduled or that audit record content is correct | Data integrity: audit trail completeness not verified |
| P0-2 | 3-3:AC5 | Audit logs append-only -- no test verifying no update/delete mutations exist on `auditLogs` | Data integrity: immutability guarantee not tested |
| P0-3 | 3-4:AC3 | Automatic embedding generation -- no test for the full `generateEmbedding` -> `saveEmbedding` pipeline, dimensions: 1536, or stale-check guard | Core functionality: matching depends on correct embeddings |
| P0-4 | 3-6:AC1 | Send invitations with token hash -- no test for `crypto.randomUUID()`, SHA-256 hashing, duplicate prevention, or transactional record creation | Security: token generation and integrity |
| P0-5 | 3-7:AC4 | Undo decision within grace period -- no test for 10-second time window validation, status revert bypassing transition map, or `decisionNote` clearing | Data integrity: undo correctness |

#### P0 Gaps with PARTIAL coverage (6 ACs)

| Gap | Story:AC | Description | What IS Tested | What Is MISSING |
|-----|----------|-------------|---------------|-----------------|
| P0-6 | 3-1:AC1 | Paginated data table role-gated query | `unauthorizedError` helper construction | `listForEditor` mutation integration: role check, pagination, reviewer summary denormalization, triage severity aggregation |
| P0-7 | 3-2:AC1 | Full submission metadata (`getByIdForEditor`) | `unauthorizedError`, `notFoundError` helper construction | Query integration: role check, PDF URL generation via `ctx.storage.getUrl`, full field return |
| P0-8 | 3-2:AC5 | Status transition mutation | `assertTransition` logic, `invalidTransitionError` construction | `transitionStatus` mutation integration: auth, DB patch, audit scheduling, `updatedAt` update |
| P0-9 | 3-3:AC1 | Action editor assignment | `unauthorizedError` construction | `assignActionEditor` mutation: `editor_in_chief` only enforcement, target user role validation, `assignedAt` update |
| P0-10 | 3-4:AC6 | Profile management restricted to admin/editor | `unauthorizedError` construction | Route guard `ALLOWED_ROLES`, mutation role check, query role check separation |
| P0-11 | 3-5:AC7 | Performance and error handling | `sanitizeErrorMessage` utility function | Full error handling in `findMatches`: API key missing check, vector search empty results, status `failed` persistence |

#### P1 Gaps -- 23 ACs with NONE or PARTIAL coverage

| Story:AC | Description | Notes |
|----------|-------------|-------|
| 3-1:AC2 | Cursor-based pagination with "Load more" | No component test for `usePaginatedQuery` states |
| 3-1:AC3 | Status filter with multi-select chips | No test for URL param persistence or filter toggle logic |
| 3-1:AC6 | Editor sidebar navigation | No test for sidebar rendering or active link detection |
| 3-2:AC2 | Triage report section | No test for `TriageDisplay` reuse in editor context |
| 3-2:AC3 | Interactive status transitions via StatusChip | Transitions tested, but no component test for dropdown UI |
| 3-2:AC4 | Desk reject with confirmation dialog | Terminal state tested, but no component test for AlertDialog |
| 3-3:AC3 | AuditTimeline displays chronological entries | No test for timeline rendering or actor name resolution |
| 3-3:AC4 | Cursor-based pagination for audit trail | No test for audit trail pagination |
| 3-3:AC7 | Re-assignment of action editor | No test for reassignment detection or audit action differentiation |
| 3-4:AC1 | Reviewer profile creation | No test for `createOrUpdateProfile` validation logic |
| 3-4:AC2 | Reviewer profile update | No test for upsert semantics or embedding re-trigger |
| 3-4:AC4 | Reviewer pool list view | No component test for table rendering |
| 3-4:AC5 | Profile form with publications | No component test for dynamic form with validation |
| 3-5:AC2 | Explainable rationale generation | Fallback tested, but not the LLM `generateObject` path |
| 3-5:AC3 | Match results persistence | No test for `saveMatchResults` upsert or `getMatchResults` query |
| 3-5:AC5 | Reviewer match panel integration | No component test |
| 3-6:AC2 | Notification preview for invitation | No test for notification body template content |
| 3-6:AC3 | Invitation list with status | No test for status derivation logic |
| 3-6:AC4 | Revoke invitation | No test for revoke validation or audit logging |
| 3-6:AC5 | Review progress indicators | No test for progress computation or 7-day threshold |
| 3-6:AC6 | Invitation panel UI | No component test |
| 3-7:AC1-3 | Make editorial decisions | Transition path tested but not full mutation (note validation, notification, audit) |
| 3-7:AC6 | Payment estimate summary | No test for `getPaymentEstimates` calculation logic |

#### P2 Gaps -- 19 ACs with NONE coverage

| Story:AC | Description |
|----------|-------------|
| 3-1:AC4 | Title search with debounce |
| 3-1:AC5 | Row click navigation |
| 3-1:AC7 | Real-time updates |
| 3-1:AC8 | Empty state |
| 3-2:AC6 | Back navigation |
| 3-2:AC7 | Real-time updates |
| 3-2:AC8 | PDF download link |
| 3-3:AC6 | AuditTimeline action type filter |
| 3-4:AC7 | Embedding status visibility badge |
| 3-5:AC4 | ReviewerMatchCard component |
| 3-5:AC6 | Editor interaction with matches |
| 3-6:AC7 | Progress monitoring section |
| 3-6:AC8 | Audit trail integration for invitations |
| 3-7:AC5 | Decision panel UI |
| 3-7:AC7 | Author notification content templates |
| 3-7:AC8 | Audit trail integration for decisions |

---

## PHASE 5: RECOMMENDATIONS

### High-Priority Test Additions (P0 gaps)

1. **`convex/__tests__/decisions.test.ts`** -- Unit tests for:
   - `undoDecision` time window validation (verify rejection after 10s)
   - `makeDecision` decision note validation (required for reject/revision, optional for accept)
   - Decision-to-notification-type mapping
   - Decision-to-audit-action mapping

2. **`convex/__tests__/invitations.test.ts`** -- Unit tests for:
   - Token hashing function (SHA-256 of UUID produces consistent hex string)
   - Invitation status derivation logic (revoked > consumed > expired > pending)
   - Duplicate invitation prevention logic

3. **`convex/__tests__/audit.test.ts`** -- Structural test:
   - Verify `audit.ts` only exports `logAction` (internalMutation) and `listBySubmission` (query) -- no update/delete mutations

4. **`convex/__tests__/matching-integration.test.ts`** -- Unit tests for:
   - Profile validation in `createOrUpdateProfile` (min 1 research area, min 3 publications, reviewer role check)
   - `saveEmbedding` stale-check logic

### Medium-Priority Test Additions (P1 gaps)

5. **`convex/__tests__/submissions-editor.test.ts`** -- Unit tests for:
   - `listForEditor` reviewer summary denormalization logic
   - `assignActionEditor` role enforcement (editor_in_chief only)
   - `assignActionEditor` reassignment detection

6. **`app/__tests__/editor-constants.test.ts`** -- Unit tests for:
   - `EDITOR_ROLES` completeness
   - `STATUS_GROUPS` covering all statuses

7. **`convex/__tests__/decisions-payment.test.ts`** -- Unit tests for:
   - `getPaymentEstimates` calculation by review status

### Notes

- The project vitest config supports both unit tests (`app/**/*.test.ts`, `convex/__tests__/**/*.test.ts`) and component tests (`app/**/*.test.tsx`).
- All implementation files for Epic 3 exist and are correctly structured.
- All Convex functions appear to define both `args` and `returns` validators based on grep analysis.
- The `matchResults` schema addition is confirmed present in `convex/schema.ts`.
- Route guards are updated: `/admin/` allows `['admin', 'editor_in_chief']`.
- The barrel exports in `app/features/editor/index.ts` export all 14 expected components.
