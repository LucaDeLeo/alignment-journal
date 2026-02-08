# Retrospective: Epic 3 - Editor Dashboard & Reviewer Assignment

**Date:** 2026-02-08
**Epic:** 3 - Editor Dashboard & Reviewer Assignment
**FRs Covered:** FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR52/FR53 (partial)
**Duration:** ~207 minutes (~3h 27m)
**Sprint Mode:** YOLO (rapid implementation, no pre-implementation test gates)
**Stories:** 7 (largest epic to date)

---

## 1. Epic Summary

Epic 3 delivered the complete editor workflow for the Alignment Journal: a pipeline dashboard with paginated data table and real-time filtering, a submission detail view with triage results and interactive status transitions, action editor assignment with a full audit trail, reviewer profile management with automatic OpenAI embedding generation, intelligent reviewer-paper matching via Convex vector search with LLM-generated explainable rationale, reviewer invitation with token hashing and progress monitoring, and editorial decisions (accept/reject/revision) with undo support and payment estimates.

All 7 stories were implemented and merged. The implementation is functionally complete -- TypeScript clean, ESLint clean, and all 73 tests pass. However, the quality gate **FAILED** for the third consecutive epic due to critically low acceptance criteria coverage (0% FULL, 11% PARTIAL, 89% NONE across 53 ACs). The test gap is purely in test evidence, not implementation completeness.

### Stories Delivered

| Story | Title | Duration | Commits | Review Fix Cycles |
|-------|-------|----------|---------|-------------------|
| 3-1 | Editor Pipeline Dashboard | 37m 49s | 3 | 2 |
| 3-2 | Submission Detail View with Triage Results | 22m 33s | 1 | 0 |
| 3-3 | Action Editor Assignment and Audit Trail | 26m 08s | 2 | 1 |
| 3-4 | Reviewer Profile Management and Embedding Generation | 32m 09s | 2 | 0 |
| 3-5 | Intelligent Reviewer Matching with Explainable Rationale | 25m 41s | 2 | 0 |
| 3-6 | Reviewer Invitation and Progress Monitoring | 22m 49s | 3 | 1 |
| 3-7 | Editorial Decisions | 40m 33s | 5 | 3 |

---

## 2. Key Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Stories completed | 7/7 (100%) | Excellent |
| Stories failed | 0 | Excellent |
| Total duration | ~207 minutes | Good for 7 stories |
| Average story duration | ~30 minutes | Consistent with Epic 2 |
| Total commits | 18 | Clean history |
| Average review fix cycles | 1.0 | Acceptable (skewed by 3-7) |
| Tests passing | 73/73 (100%) | Good |
| New tests added (vs Epic 2) | 21 (matching-utils) | Moderate |
| Tech debt items resolved | 4 (TD-020 through TD-023) | Good |
| Tech debt items still open from prior epics | 5 (TD-010, TD-013, TD-014, TD-015, TD-016) | Concerning |
| New tech debt identified | 3 (TD-017, TD-018, TD-019) | Acceptable |
| P0 AC coverage (FULL) | 0/11 (0%) | FAIL |
| P1 AC coverage (FULL) | 0/23 (0%) | FAIL |
| Overall AC coverage (FULL) | 0/53 (0%) | FAIL |
| Quality gate | FAIL | Third consecutive failure |

### Velocity Comparison Across All Epics

| Metric | Epic 1 | Epic 2 | Epic 3 | Trend |
|--------|--------|--------|--------|-------|
| Stories | 4 | 4 | 7 | +75% scope |
| Total duration | ~160 min | ~116 min | ~207 min | +78% (proportional to scope) |
| Avg story duration | ~40 min | ~29 min | ~30 min | Stable at ~30 min |
| Fastest story | 22 min (1-1) | 17 min (2-4) | 22 min (3-6) | |
| Slowest story | 50 min (1-3) | 34 min (2-1) | 41 min (3-7) | |
| Stories/hour | 1.5 | 2.1 | 2.0 | Stable at ~2/hr |
| Commits per story | 2.5 | 2.0 | 2.6 | Slightly up |

The velocity has stabilized at approximately 2 stories per hour and 30 minutes per story. Epic 3 was 75% larger in scope (7 vs 4 stories) and completed proportionally longer, indicating that per-story efficiency has plateaued. This is expected: the conventions established in Epics 1 and 2 provide a steady baseline, and the additional complexity of Epic 3 (vector search, LLM calls, crypto hashing) did not measurably impact per-story velocity.

### Story Complexity Pattern

| Story | Type | Scope | Duration | Fix Cycles | Notes |
|-------|------|-------|----------|------------|-------|
| 3-1 | Full-stack (query + 4 components + sidebar) | 5 new files + 3 modified | 38 min | 2 | Most new files; largest frontend surface |
| 3-2 | Full-stack (2 queries + 1 mutation + 2 components) | 3 new files + 3 modified | 23 min | 0 | Clean reuse of TriageDisplay |
| 3-3 | Full-stack (1 mutation + 2 queries + 2 components) | 3 new files + 4 modified | 26 min | 1 | New audit subsystem |
| 3-4 | Full-stack (6 functions + 3 components + "use node") | 4 new files + 2 modified | 32 min | 0 | OpenAI integration |
| 3-5 | Full-stack (4 functions + 2 components + schema) | 3 new files + 3 modified | 26 min | 0 | Vector search + LLM |
| 3-6 | Full-stack (4 functions + 2 components + crypto) | 3 new files + 3 modified | 23 min | 1 | Token hashing, undo toast |
| 3-7 | Full-stack (3 functions + 1 component) | 2 new files + 3 modified | 41 min | 3 | Most review cycles |

**Observations:**
- Stories with well-defined backend patterns (3-2, 3-5, 3-6) completed fastest (22-26 min)
- Story 3-7 had the most review cycles (3) and the longest duration (41 min); this correlates with it being the final story touching multiple subsystems (decisions + notifications + audit + undo logic)
- Story 3-2 achieved 0 review cycles by cleanly reusing the TriageDisplay component -- evidence that component reuse reduces review friction
- Story 3-4 introduced external API integration (OpenAI) but completed in standard time (32 min) because the embedding generation pattern was well-specified

---

## 3. Epic 2 Retrospective Follow-Through

The Epic 2 retrospective made 6 recommendations. Here is how they were addressed:

| # | Recommendation | Status | Notes |
|---|---------------|--------|-------|
| 1 | Establish Convex function test pattern (HIGHEST PRIORITY) | NOT DONE | No Convex function integration tests written. TD-010, TD-013, TD-014 all still open. Third consecutive deferral. |
| 2 | Write at least one component test as proof-of-concept | NOT DONE | TD-015 still open. Zero component tests written across all 3 epics. |
| 3 | Write unit tests for extractable pure functions | PARTIALLY DONE | `matching-utils.test.ts` added 17 tests for `buildPaperText`, `sanitizeErrorMessage`, `generateFallbackRationale`. But this was part of the story implementation, not the debt-fix pass. TD-013 triage safety functions remain untested. |
| 4 | Sequence backend stories before frontend consumers | DONE | Stories 3-1 through 3-3 established backend contracts before 3-4 through 3-7 built on them. |
| 5 | Reuse the `app/features/` pattern | DONE | Created `app/features/editor/` (14 files) and `app/features/admin/` (3 files) with barrel exports. |
| 6 | Plan for reviewer matching embedding generation | DONE | `convex/matching.ts` uses `"use node"`, OpenAI text-embedding-3-large, and `ctx.vectorSearch()`. Reused the chained-action + retry pattern from triage. |

**Assessment:** 3 of 6 recommendations fully addressed (50%), 1 partially addressed, 2 not addressed at all. The two unaddressed items (Convex test harness and component tests) are the same items that have been deferred since Epic 1. This is now a three-epic pattern of deferring test infrastructure in favor of feature velocity. The test debt is compounding: there are now 15 stories of implementation without integration or component tests.

---

## 4. What Went Well

### Largest epic completed with zero failures

7 stories delivered in a single sprint session with zero failures. This is 75% more stories than Epic 1 or 2, demonstrating that the established conventions (auth wrappers, feature folder pattern, route layout, audit logging) provide a reliable foundation for building complex features without rework.

### Consistent per-story velocity despite increased complexity

Epic 3 introduced three new external integrations (OpenAI embeddings, Vercel AI SDK rationale generation, Web Crypto API hashing) and two new Convex patterns (vector search, "use node" actions). Despite this added complexity, the average story duration (30 min) matches Epic 2's average (29 min). The well-specified story documents with code snippets and architectural patterns allowed the implementation agent to follow established patterns without exploratory delays.

### Feature folder pattern scaled excellently

`app/features/editor/` grew from 0 to 14 components across 7 stories without becoming disorganized:

```
app/features/editor/
  editor-constants.ts          (3-1)
  pipeline-table.tsx           (3-1)
  pipeline-filters.tsx         (3-1)
  editor-sidebar.tsx           (3-1)
  submission-detail-editor.tsx (3-2, extended in 3-3, 3-5, 3-6, 3-7)
  status-transition-chip.tsx   (3-2, extended in 3-7)
  action-editor-selector.tsx   (3-3)
  audit-timeline.tsx           (3-3, extended in 3-6, 3-7)
  reviewer-match-card.tsx      (3-5)
  reviewer-match-panel.tsx     (3-5, extended in 3-6)
  review-progress-indicator.tsx(3-6)
  invitation-panel.tsx         (3-6)
  decision-panel.tsx           (3-7)
  index.ts                     (barrel, all stories)
```

The barrel export (`index.ts`) kept route files clean. The naming pattern (`feature-verb.tsx`) remained consistent and discoverable. The `submission-detail-editor.tsx` component grew organically as stories added sections to it without refactoring -- this validates the "central detail page + injected panels" architecture.

### Clean debt-fix pass with meaningful consolidation

The debt-fix pass between implementation and retrospective resolved 4 tech debt items in 11 files with a net reduction of 5 lines:

1. **TD-020 (EDITOR_ROLES duplication):** Extracted to `convex/helpers/roles.ts`, all 7 consumer files updated
2. **TD-021 (duplicate decision functions):** Consolidated `decisionToNotificationType` and `decisionToAuditAction` into a single `decisionToActionString`
3. **TD-022 (DECISION_NOTE_MAX_LENGTH):** Frontend now imports the constant from backend, eliminating drift risk
4. **TD-023 (missing audit action labels):** Added 5 missing labels, removed 1 stale entry

These fixes demonstrate that the debt-fix pass is effective for DRY consolidation and cross-module consistency checks.

### Component reuse validated across features

Story 3-2 reused `TriageDisplay` from `~/features/submissions` with zero modifications. The component's internal query (`triage.getBySubmission`) already supported editor roles via `assertTriageAccess`. This cross-feature reuse pattern -- importing from a sibling feature folder's barrel export -- worked cleanly and should be the model for future cross-feature component sharing.

### Audit trail architecture proved extensible

The `logAction` internalMutation established in Story 3-2 was consumed by 5 subsequent stories (3-3 through 3-7) for 8 different action types without any modification to the audit subsystem:

| Action Type | Story | Description |
|-------------|-------|-------------|
| `status_transition` | 3-2 | Status changes via StatusTransitionChip |
| `action_editor_assigned` | 3-3 | First-time action editor assignment |
| `action_editor_reassigned` | 3-3 | Re-assignment to different editor |
| `reviewer_invited` | 3-6 | Reviewer invitation sent |
| `reviewer_invite_revoked` | 3-6 | Invitation revoked |
| `decision_accepted` | 3-7 | Accept decision |
| `decision_rejected` | 3-7 | Reject decision |
| `decision_revision_requested` | 3-7 | Revision requested |
| `decision_undone` | 3-7 | Decision reversed via undo |

The deferred-write pattern (`ctx.scheduler.runAfter(0, internal.audit.logAction, {...})`) proved both simple to use and reliable. The `AuditTimeline` component automatically displayed new action types without code changes -- it formats unknown actions with a default label.

---

## 5. What Could Improve

### Quality gate failed for the third consecutive epic -- identical root cause

The quality gate result is FAIL with 0% FULL AC coverage (0/53). This is the third consecutive epic with a FAIL quality gate, driven by the same structural problem: tests exist only for pure utility functions (transitions, errors, matching-utils, status-utils), never for the Convex mutations/queries or React components that use them.

**P0 gaps with NONE coverage (5):**

1. **Audit log creation for assignment (3-3:AC2):** No test verifying `logAction` is scheduled or that audit record content is correct
2. **Audit logs append-only invariant (3-3:AC5):** No structural test verifying no update/delete mutations exist on `auditLogs`
3. **Automatic embedding generation (3-4:AC3):** No test for the full `generateEmbedding` -> `saveEmbedding` pipeline, dimensions, or stale-check guard
4. **Invitation token hashing (3-6:AC1):** No test for SHA-256 hashing, duplicate prevention, or transactional record creation
5. **Undo decision time window (3-7:AC4):** No test for 10-second validation, status revert, or `decisionNote` clearing

**Cumulative test debt across all 3 epics:**
- 15 stories implemented, 0 integration tests
- 30+ Convex functions, 0 have integration tests
- 25+ React components, 0 have component tests
- 62 tests total, all on pure utility functions

### TD-010 (auth/RBAC tests) deferred for the third consecutive epic

This P0 item was identified during Epic 1's retrospective and has been carried forward through every subsequent epic. The auth wrappers (`withUser`, `withRole`, and 5 convenience wrappers) are the security boundary for the entire application. They now protect 30+ Convex functions across 8 files. Zero tests exist.

Each epic adds more functions behind these wrappers, increasing the blast radius of a regression. The justification for deferral ("requires Convex test harness with mocked context") has remained unchanged for 3 epics. Either the harness needs to be established or the deferral needs to be accepted as a deliberate risk.

### Story 3-7 required 3 review fix cycles -- highest of any story

Story 3-7 (Editorial Decisions) had 5 commits (2 feat + 3 fix) and took 41 minutes, making it both the longest and most review-intensive story in Epic 3. The 3 review cycles suggest the story had higher-than-average ambiguity or integration complexity. Contributing factors:

1. **Multiple subsystem integration:** The decision flow touches submissions (status patch), notifications (create), audit (log), and introduces a new undo mechanism
2. **Undo bypasses the state machine:** The `undoDecision` mutation deliberately bypasses `assertTransition`, which is a non-standard pattern requiring careful review
3. **Notification templates:** Three different templates (accept/reject/revision) with conditional note inclusion are easy to get slightly wrong

The 3 fix cycles represent the debt-fix pass catching issues (TD-021 duplicate functions, TD-022 shared constants, TD-023 missing action labels) as well as implementation feedback.

### EDITOR_ROLES constant was duplicated across 7 files before debt-fix caught it

The `EDITOR_ROLES` constant (`['editor_in_chief', 'action_editor', 'admin']`) was independently defined in 7 files by the time Story 3-7 completed. Each story that needed it copied the pattern from the previous story's spec. The debt-fix pass resolved this (TD-020 -> `convex/helpers/roles.ts`), but the pattern of "copy the constant" indicates that shared constants should be extracted earlier -- ideally during the first story that establishes a new constant, not after 7 consumers exist.

### Previous retrospective recommendations for testing remain unaddressed

The central recommendation from both Epic 1 and Epic 2 retrospectives -- establish a Convex function test pattern -- remains unimplemented. The recommendations have been clear, specific, and prioritized, but YOLO mode consistently prioritizes feature velocity over test investment. At this point, 3 consecutive epics of identical recommendations without action suggests that test writing will not happen as a side activity during feature sprints. It requires either a dedicated test-only sprint or a process change that gates feature work on test coverage.

---

## 6. Cross-Story Patterns

### Pattern 1: Central detail page + injected panels scales cleanly

`submission-detail-editor.tsx` started as a single-purpose component in Story 3-2 and grew to integrate 5 additional panels over subsequent stories:

```
submission-detail-editor.tsx
  <- ActionEditorSelector (3-3)
  <- ReviewerMatchPanel (3-5)
  <- InvitationPanel (3-6 via match panel)
  <- ReviewProgressIndicator (3-6)
  <- DecisionPanel (3-7)
  <- AuditTimeline (3-3, consumed by all later stories)
```

Each story added a section without restructuring the component. The component conditionally renders panels based on submission status (e.g., `DecisionPanel` only for `DECISION_PENDING`). This pattern is sustainable at the current scale (7 sections) but may need refactoring if Epic 4+ adds many more sections.

### Pattern 2: Deferred audit writes via scheduler are reliable and simple

Every mutation that needs an audit entry follows the same one-line pattern:

```typescript
await ctx.scheduler.runAfter(0, internal.audit.logAction, {
  submissionId, actorId: ctx.user._id, actorRole: ctx.user.role, action, details
})
```

This pattern was used 9 times across 5 stories with zero issues. The deferred write keeps mutations fast and prevents audit logging from blocking the primary operation. The append-only `logAction` internalMutation is the only write path to `auditLogs`, maintaining the integrity invariant.

### Pattern 3: The withUser + manual role check pattern is the de facto auth standard

Epic 3 consistently used `withUser` (to validate authentication) + a manual `EDITOR_ROLES.includes(ctx.user.role)` check (to validate authorization). This pattern appears in all 7 Convex files created during Epic 3:

- `convex/submissions.ts` (listForEditor, getByIdForEditor, transitionStatus, assignActionEditor)
- `convex/audit.ts` (listBySubmission)
- `convex/users.ts` (listEditors)
- `convex/matching.ts` (createOrUpdateProfile, getProfileByUserId, listProfiles, listReviewerUsers, findMatches, getMatchResults)
- `convex/invitations.ts` (sendInvitations, listBySubmission, revokeInvitation, getReviewProgress)
- `convex/decisions.ts` (makeDecision, undoDecision, getPaymentEstimates)

The `withEditor` convenience wrapper (which only allows `editor_in_chief`) was NOT used because it was too restrictive for most editor operations. The manual pattern provides flexibility but introduces the DRY risk that led to TD-020.

**Recommendation:** The `withUser` + role check could be wrapped in a new `withEditorRole` convenience wrapper that allows all three editor roles, reducing boilerplate while maintaining the server-side auth boundary.

### Pattern 4: Stories consuming pre-existing backend contracts remain fastest

Stories 3-2 (22m, 0 fix cycles) and 3-6 (23m, 1 fix cycle) were the fastest. Both consumed well-defined backend patterns established by earlier stories. Stories introducing new subsystems (3-1 dashboard, 3-4 embeddings, 3-7 decisions) took longer (32-41 min). This confirms the Epic 2 observation that backend-first sequencing accelerates downstream stories.

### Pattern 5: Shared constant extraction should happen at creation, not cleanup

The EDITOR_ROLES duplication across 7 files (TD-020) illustrates a recurring pattern: constants are defined inline in the first story, then copied by subsequent stories, until the debt-fix pass extracts them. The same pattern occurred in Epic 1 (ROLES constant duplicated across 3 files -> TD-006) and now in Epic 3 (EDITOR_ROLES across 7 files -> TD-020).

**Recommendation:** When a story spec defines a new constant, it should be placed in a shared helper file (`convex/helpers/`) from the start, not inline in the consuming file.

---

## 7. Tech Debt Summary

### Items from Prior Epics Carried Forward

| ID | Description | Priority | Status After Epic 3 | Epics Deferred |
|----|-------------|----------|---------------------|----------------|
| TD-010 | Auth/RBAC wrappers have zero automated test coverage | P0 | OPEN | 3 (since Epic 1) |
| TD-013 | Zero P0 test coverage for triage safety mechanisms | P0 | OPEN | 2 (since Epic 2) |
| TD-014 | Zero integration tests for submission mutations/queries | P0 | OPEN | 2 (since Epic 2) |
| TD-015 | Zero component tests despite infrastructure being ready | P1 | OPEN | 2 (since Epic 2) |
| TD-016 | startTriage and startTriageInternal share duplicated logic | P2 | OPEN | 2 (since Epic 2) |
| TD-004 | Validator duplicates schema shape | Low | Deferred (Convex limitation) | 3 (since Epic 1) |

### Items Resolved During Epic 3

| ID | Description | Priority | Resolution |
|----|-------------|----------|------------|
| TD-020 | EDITOR_ROLES duplicated across 7 files | P3 | Extracted to `convex/helpers/roles.ts` |
| TD-021 | Duplicate decision function mapping | P2 | Consolidated to single `decisionToActionString` |
| TD-022 | DECISION_NOTE_MAX_LENGTH duplicated backend/frontend | P2 | Frontend imports from backend module |
| TD-023 | Missing audit action labels in timeline | P2 | Added 5 missing labels, removed 1 stale entry |

### New Tech Debt Identified in Epic 3

| ID | Source | Description | Priority | Status |
|----|--------|-------------|----------|--------|
| TD-017 | 3-1 | listForEditor pagination order mismatch with display sort | P2 | Open |
| TD-018 | 3-1 | Date.now() in Convex query makes overdue calculation non-deterministic | P2 | Open |
| TD-019 | 3-1 | N+1 query pattern in listForEditor enrichment (50 extra reads per page) | P2 | Open |

### Tech Debt Accrual Trend

| Metric | Epic 1 | Epic 2 | Epic 3 |
|--------|--------|--------|--------|
| New items identified | 9 | 4 | 7 (3 new + 4 from debt-fix) |
| Items resolved | 8 | 2 | 4 |
| Net new items | 1 | 2 | 3 |
| P0 items open (cumulative) | 1 | 3 | 3 |
| Total items open | 2 | 7 | 9 |

The open tech debt inventory is growing at approximately 2-3 items per epic. The P0 items (TD-010, TD-013, TD-014) have been open since Epics 1 and 2 respectively, accumulating risk with each new feature that depends on the untested auth and data access layers.

---

## 8. Test Coverage Analysis

### Current State (from Traceability Matrix)

| Priority | Total ACs | FULL Coverage | PARTIAL | NONE | Coverage % |
|----------|-----------|---------------|---------|------|------------|
| P0 | 11 | 0 | 6 | 5 | 0% |
| P1 | 23 | 0 | 0 | 23 | 0% |
| P2 | 19 | 0 | 0 | 19 | 0% |
| **Total** | **53** | **0** | **6** | **47** | **0%** |

### What IS Covered (PARTIAL only -- no FULL coverage)

6 ACs have PARTIAL coverage through tests on supporting utility functions:

1. **3-1:AC1, 3-2:AC1, 3-3:AC1, 3-4:AC6** -- `errors.test.ts` tests the error helper functions used by these ACs' role checks, but not the mutations/queries themselves
2. **3-2:AC3/AC5** -- `transitions.test.ts` tests `assertTransition` and `VALID_TRANSITIONS`, but not the `transitionStatus` mutation
3. **3-5:AC1/AC2/AC7** -- `matching-utils.test.ts` tests `buildPaperText`, `generateFallbackRationale`, and `sanitizeErrorMessage`, but not the `findMatches` action

### What IS NOT Covered (major gaps)

- **Zero Convex mutation/query integration tests** for any Epic 3 function (18 new functions)
- **Zero component tests** for any Epic 3 React component (14 new components)
- **Zero tests for security-critical paths:** token hashing, audit append-only invariant, assignment role enforcement
- **Zero tests for time-dependent logic:** undo grace period, overdue indicators
- **Zero tests for data integrity mechanisms:** duplicate invitation prevention, stale embedding guard

### Coverage by Test Level (Cumulative Across All Epics)

| Level | Test Count | ACs Covered (FULL) |
|-------|-----------|-------------------|
| E2E | 0 | 0 |
| Integration | 0 | 0 |
| Component | 0 | 0 |
| Unit | 73 | 5 (all from Epics 1-2) |

### Highest-Priority Test Recommendations

1. **`convex/__tests__/decisions.test.ts`** -- `undoDecision` time window validation, `makeDecision` note validation
2. **`convex/__tests__/invitations.test.ts`** -- Token hashing, invitation status derivation, duplicate prevention
3. **`convex/__tests__/audit.test.ts`** -- Structural test for append-only invariant
4. **`convex/__tests__/matching-integration.test.ts`** -- Profile validation, `saveEmbedding` stale-check
5. **`convex/__tests__/submissions-editor.test.ts`** -- `assignActionEditor` role enforcement

---

## 9. Architecture Patterns Established in Epic 3

### 1. Deferred Audit Logging via Scheduler

```typescript
await ctx.scheduler.runAfter(0, internal.audit.logAction, {
  submissionId, actorId: ctx.user._id, actorRole: ctx.user.role,
  action: 'action_type', details: 'Human-readable description',
})
```

Used 9 times across 5 stories. Append-only `logAction` internalMutation is the only write path. `AuditTimeline` component subscribes reactively.

### 2. Editor Role Gating Pattern

```typescript
const EDITOR_ROLES = ['editor_in_chief', 'action_editor', 'admin'] as const
// In mutation/query handler:
if (!EDITOR_ROLES.includes(ctx.user.role as typeof EDITOR_ROLES[number])) {
  throw unauthorizedError('Requires editor role')
}
```

Now centralized in `convex/helpers/roles.ts`. Used by all 6 backend files created in Epic 3.

### 3. Reviewer Matching Pipeline

```
findMatches action → paper embedding (OpenAI) → ctx.vectorSearch → profile enrichment → LLM rationale (Vercel AI SDK) → saveMatchResults
```

The `matchResults` table persists results for reactive display. Fallback rationale handles LLM failures gracefully.

### 4. Invitation Token Pattern

```typescript
const reviewAssignmentId = crypto.randomUUID()
const tokenHash = await hashToken(reviewAssignmentId)  // SHA-256 via Web Crypto API
// Store tokenHash in reviewInvites, reviewAssignmentId in notification URL
```

Token validation deferred to Epic 4 (Story 4.1) which will look up by hash.

### 5. Tier 1 Undo Toast Pattern

```typescript
const result = await makeDecision({ submissionId, decision, decisionNote })
toast('Decision made', {
  action: { label: 'Undo', onClick: () => undoDecision({ submissionId, decidedAt: result.decidedAt }) }
})
```

Server validates `Date.now() - decidedAt <= 10000` (10-second window). Used for both decisions (3-7) and invitations (3-6).

### 6. Central Detail Page + Injected Panels

`submission-detail-editor.tsx` serves as the host for 6+ panels that conditionally render based on submission status. Each story adds panels without restructuring the host component.

### 7. Shared Backend Constants in helpers/

New pattern: `convex/helpers/roles.ts` exports `EDITOR_ROLES` and `WRITE_ROLES` for use across all Convex files. Frontend re-exports from `app/features/editor/editor-constants.ts`.

---

## 10. Lessons Learned

### 1. Feature velocity is strong; test investment is absent

Three consecutive epics have delivered features at ~2 stories/hour with zero failures. The architecture is sound, the conventions are established, and the implementation quality (typecheck, lint, 100% test pass rate) is consistently high. However, the test investment has not kept pace: 15 stories, 30+ Convex functions, and 25+ React components have zero integration or component tests. The quality gate has failed three times with the same root cause. Velocity without verification is technical debt in disguise.

### 2. Constant extraction should happen at creation time

The EDITOR_ROLES duplication pattern (7 files before extraction) recurred from Epic 1's ROLES duplication (3 files). The lesson: when a story spec defines a constant that will be used by multiple consumers, extract it to a shared helper module in the first story, not during the cleanup pass. Story specs should reference shared helpers rather than copying inline definitions.

### 3. Stories touching multiple subsystems generate more review cycles

Story 3-7 (decisions) touched 4 subsystems (submissions, notifications, audit, undo) and had 3 review fix cycles. Story 3-2 (detail view) reused existing components and had 0 review cycles. Complex integration stories should either be broken into smaller pieces or given explicit spec attention to the integration points.

### 4. The "central detail page" architecture works well for progressive enhancement

`submission-detail-editor.tsx` evolved from a simple metadata display (3-2) to a rich editor workbench (3-7) through additive changes. Each story added a conditional section without refactoring existing sections. This validates the architecture for at least 7 stories of progressive enhancement.

### 5. "use node" files concentrate complexity but work reliably

`convex/matching.ts` is the only `"use node"` file in the codebase and contains 11 functions spanning profile management, embedding generation, vector search, LLM rationale, and result persistence. Despite this concentration, it worked reliably across 2 stories (3-4, 3-5). The `"use node"` boundary is clear and does not leak into other files.

### 6. Three consecutive quality gate failures demand a process change

Recommendations to write tests have been included in every retrospective. They have been partially or fully ignored in every subsequent epic. The YOLO mode process does not allocate time for test writing, and the debt-fix pass focuses on DRY consolidation rather than test coverage. Either the process needs a dedicated test sprint, or the quality gate criteria need to be adjusted to reflect the deliberate prototype-mode tradeoff.

---

## 11. Risks Carried Forward to Epic 4

### Critical (Accumulated -- Must Address)

| Risk | Impact | Accumulated Since | Severity |
|------|--------|-------------------|----------|
| Auth/RBAC wrappers untested (TD-010) | Security boundary unverified for 30+ functions across 8 files | Epic 1 (3 epics) | P0 |
| P0 triage safety mechanisms untested (TD-013) | Idempotency, retry, sanitization unverified | Epic 2 (2 epics) | P0 |
| Submission mutation/query auth untested (TD-014) | Data access controls unverified | Epic 2 (2 epics) | P0 |
| P0 Epic 3 test gaps (5 gaps) | Audit integrity, embedding pipeline, token security, undo correctness unverified | Epic 3 (new) | P0 |

### Moderate

| Risk | Impact | Mitigation |
|------|--------|------------|
| Zero component tests (TD-015) | 25+ frontend components with no verification | Write proof-of-concept component test |
| Growing open tech debt inventory (9 items) | Maintenance burden increasing | Prioritize P0 items in next debt-fix pass |
| EDITOR_ROLES convenience wrapper missing | Boilerplate continues to grow | Create `withEditorRole` wrapper |

### Low

| Risk | Impact | Mitigation |
|------|--------|------------|
| N+1 query in listForEditor (TD-019) | Performance at scale | Denormalize when needed |
| Non-deterministic Date.now() in query (TD-018) | Stale overdue indicators | Move to client-side computation |
| Pagination sort mismatch (TD-017) | Items may jump between pages | Add composite index when UX issue arises |

---

## 12. Recommendations for Epic 4

### Process Change (Required)

1. **Schedule a dedicated test sprint before Epic 4 feature work.** Three consecutive retrospectives have recommended writing tests; three consecutive sprints have not written them. A separate, test-only sprint is the only realistic path to closing the accumulated P0 test gaps (TD-010, TD-013, TD-014, plus Epic 3 P0 gaps). Estimated effort: 1-2 days for the critical path tests.

### Before Starting Epic 4 Feature Stories

2. **Create a `withEditorRole` convenience wrapper.** Replace the repeated `withUser` + manual `EDITOR_ROLES.includes()` pattern with a single `withEditorRole` wrapper in `convex/helpers/auth.ts`. This reduces boilerplate and centralizes the role definition.

3. **Extract new shared constants at creation time.** If Epic 4 stories introduce constants expected to be shared across multiple files, place them in `convex/helpers/` or `app/features/{domain}/{domain}-constants.ts` from the first usage.

### During Epic 4 Story Planning

4. **Break complex integration stories into smaller pieces.** If a story touches 4+ subsystems (like 3-7), consider splitting it into backend + frontend stories to reduce review cycle count.

5. **Continue backend-first sequencing.** The pattern of establishing backend contracts before frontend consumers consistently produces faster, cleaner implementations.

6. **Update audit timeline action labels proactively.** When adding new audit action types, include the action label in the `AuditTimeline` ACTION_LABELS mapping in the same story -- do not defer to debt-fix.

### CLAUDE.md Updates

7. **Document the patterns established in Epic 3.** The following should be added to CLAUDE.md:
   - Editor feature folder (`app/features/editor/` with 14 components)
   - Admin feature folder (`app/features/admin/` with 3 components)
   - Shared backend constants in `convex/helpers/roles.ts`
   - Audit trail logging pattern
   - Editor role gating pattern (withUser + EDITOR_ROLES)

---

## 13. Git History Analysis

18 commits across 7 stories:

```
f5383a2 feat(3-7-editorial-decisions): implement story
ccfe519 fix: address Codex review feedback for 3-7-editorial-decisions
56e0710 fix: address Codex review feedback for 3-7-editorial-decisions
f369139 fix: address Codex review feedback for 3-7-editorial-decisions
fb0ef84 feat(3-7-editorial-decisions): implement story
62a5510 feat(3-6-reviewer-invitation-and-progress-monitoring): implement story
6b8bee0 fix(3-6): hoist duplicate invite query outside loop in sendInvitations
d33d046 feat(3-6-reviewer-invitation-and-progress-monitoring): implement story
8806385 feat(3-5-intelligent-reviewer-matching-with-explainable-rationale): implement story
67b0219 feat(3-5-intelligent-reviewer-matching-with-explainable-rationale): implement story
f622756 feat(3-4-reviewer-profile-management-and-embedding-generation): implement story
982bbcd feat(3-4-reviewer-profile-management-and-embedding-generation): implement story
88864d8 feat(3-3-action-editor-assignment-and-audit-trail): implement story
306bd96 fix: address Codex review feedback for 3-3-action-editor-assignment-and-audit-trail
3d25f38 feat(3-2-submission-detail-view-with-triage-results): implement story
c830d73 feat(3-1-editor-pipeline-dashboard): implement story
a4975d8 fix: address Codex review feedback for 3-1-editor-pipeline-dashboard
d588b97 fix: address Codex review feedback for 3-1-editor-pipeline-dashboard
```

**Commits per story:** 3-1 (3), 3-2 (1), 3-3 (2), 3-4 (2), 3-5 (2), 3-6 (3), 3-7 (5). Story 3-7 has the most commits (5), correlating with 3 fix cycles. Story 3-2 has the fewest (1), correlating with 0 fix cycles and clean component reuse.

**Pattern:** Stories with fewer integration points produce fewer review-fix commits. The "two feat commits" pattern (3-4, 3-5) appears when the implementation and review sessions happen in quick succession.

---

## 14. Appendix: Files Created/Modified in Epic 3

### New Files (22)

**Backend (6 files):**
- `convex/audit.ts` -- audit trail mutations and queries
- `convex/matching.ts` -- reviewer profiles, embeddings, vector search, LLM rationale
- `convex/invitations.ts` -- invitation management, progress monitoring
- `convex/decisions.ts` -- editorial decisions, undo, payment estimates
- `convex/helpers/roles.ts` -- shared EDITOR_ROLES and WRITE_ROLES constants
- `convex/__tests__/matching-utils.test.ts` -- 17 tests for matching utility functions

**Frontend: Editor Feature (14 files):**
- `app/features/editor/editor-constants.ts`
- `app/features/editor/pipeline-table.tsx`
- `app/features/editor/pipeline-filters.tsx`
- `app/features/editor/editor-sidebar.tsx`
- `app/features/editor/submission-detail-editor.tsx`
- `app/features/editor/status-transition-chip.tsx`
- `app/features/editor/action-editor-selector.tsx`
- `app/features/editor/audit-timeline.tsx`
- `app/features/editor/reviewer-match-card.tsx`
- `app/features/editor/reviewer-match-panel.tsx`
- `app/features/editor/review-progress-indicator.tsx`
- `app/features/editor/invitation-panel.tsx`
- `app/features/editor/decision-panel.tsx`
- `app/features/editor/index.ts`

**Frontend: Admin Feature (3 files):**
- `app/features/admin/reviewer-pool.tsx`
- `app/features/admin/reviewer-profile-form.tsx`
- `app/features/admin/index.ts`

### Modified Files

**Backend:**
- `convex/submissions.ts` -- added listForEditor, getByIdForEditor, transitionStatus, assignActionEditor
- `convex/users.ts` -- added listEditors query
- `convex/schema.ts` -- added matchResults table

**Frontend:**
- `app/routes/editor/route.tsx` -- integrated sidebar
- `app/routes/editor/index.tsx` -- replaced placeholder with pipeline dashboard
- `app/routes/editor/$submissionId.tsx` -- replaced placeholder with editor detail view
- `app/routes/admin/route.tsx` -- updated ALLOWED_ROLES to include editor_in_chief
- `app/routes/admin/index.tsx` -- replaced placeholder with reviewer pool

---

**Generated:** 2026-02-08
**Analyst:** Retrospective Agent (claude-opus-4-6)
