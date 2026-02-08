# Retrospective: Epic 6 - Payment Tracking & Notifications

**Date:** 2026-02-08
**Epic:** 6 - Payment Tracking & Notifications
**FRs Covered:** FR44, FR45, FR46, FR52, FR53
**Duration:** ~71 minutes (~1h 11m)
**Sprint Mode:** YOLO (rapid implementation, no pre-implementation test gates)
**Stories:** 3

---

## 1. Epic Summary

Epic 6 delivered the payment tracking and notification preview features: a reviewer-facing payment calculator with animated line-item breakdown, an editor-facing payment summary table with quality assessment controls, and an in-app notification preview system surfacing existing notification records. The epic covers the complete compensation visibility chain from reviewer self-service to editor oversight, plus notification transparency.

Story 6-1 created the `convex/payments.ts` module (416 lines, 3 exported Convex functions + 1 pure function + constants/interfaces) and the `PaymentCalculator` component (310 lines) with `useCountUp` rAF-based animation, `useDeadlineCountdown` live countdown, and collapsible footer layout. Story 6-2 added `getPaymentSummary` query and `setQualityLevel` mutation to the same module, created `PaymentSummaryTable` (165 lines) with per-reviewer quality selector, and removed the placeholder `getPaymentEstimates` from `decisions.ts`. Story 6-3 created the `convex/notifications.ts` module (70 lines), established the `app/features/notifications/` feature folder (3 files), and added `NotificationPreviewList` as a self-contained inline component.

All 3 stories were implemented and merged. Each completed in a single commit with zero review fix cycles -- the second consecutive epic with a perfect review record. TypeScript clean, ESLint clean. 23 new tests were added for the `computePaymentBreakdown` pure function -- the first time tests shipped as part of feature implementation since Epic 3. Two tech debt items were resolved during the debt-fix pass (formatCurrency duplication, hasEditorRole type assertion). Six new tech debt items were identified.

### Stories Delivered

| Story | Title | Duration | Commits | Review Fix Cycles |
|-------|-------|----------|---------|-------------------|
| 6-1 | Reviewer Payment Calculation and Display | 26m 28s | 1 | 0 |
| 6-2 | Editor Payment Summary View | 21m 45s | 1 | 0 |
| 6-3 | In-App Notification Previews | 23m 14s | 1 | 0 |

**Total commits:** 3
**Total files changed:** 23 (2,540 insertions, 145 deletions)

---

## 2. Key Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Stories completed | 3/3 (100%) | Excellent |
| Stories failed | 0 | Excellent |
| Total duration | ~71 minutes | Fastest epic to date |
| Average story duration | ~24 minutes | New project best |
| Total commits | 3 | Cleanest history (1 per story, 2nd consecutive epic) |
| Average review fix cycles | 0.0 | Perfect -- 2nd consecutive zero-fix epic |
| Tests passing | 96/96 (100%) | No regressions, 23 new |
| New tests added | 23 | First tests shipped with features since Epic 3 |
| Tech debt items resolved (inline) | 2 (TD-035, TD-036) | Cross-cutting utility extractions |
| New tech debt identified | 6 (TD-035 through TD-040) | 2 resolved, 4 remain open |
| P0 tech debt items open (total) | 14 | +1 from Epic 5 (new TD-039) |

### Velocity Comparison Across All Epics

| Metric | Epic 1 | Epic 2 | Epic 3 | Epic 4 | Epic 5 | Epic 6 | Trend |
|--------|--------|--------|--------|--------|--------|--------|-------|
| Stories | 4 | 4 | 7 | 4 | 3 | 3 | -- |
| Total duration | ~160 min | ~116 min | ~207 min | ~155 min | ~80 min | ~71 min | New low |
| Avg story duration | ~40 min | ~29 min | ~30 min | ~39 min | ~27 min | ~24 min | New low |
| Fastest story | 22 min (1-1) | 17 min (2-4) | 22 min (3-6) | 30 min (4-2) | 25 min (5-2) | 22 min (6-2) | Tied best |
| Slowest story | 50 min (1-3) | 34 min (2-1) | 41 min (3-7) | 54 min (4-3) | 29 min (5-3) | 26 min (6-1) | New low |
| Stories/hour | 1.5 | 2.1 | 2.0 | 1.5 | 2.25 | 2.54 | New high |
| Commits per story | 2.5 | 2.0 | 2.6 | 2.25 | 1.0 | 1.0 | Best (tied) |
| Review fix cycles avg | -- | -- | -- | 1.0 | 0.0 | 0.0 | Perfect (2nd consecutive) |
| Tests added | 29 | 23 | 21 | 0 | 0 | 23 | Restored |

**Velocity analysis:** Epic 6 achieved the highest stories/hour rate (2.54) and lowest average story duration (~24 minutes) across all 6 epics, with a remarkably tight duration spread (22-26 min range, only 4 minutes between fastest and slowest). Three factors explain this:

1. **Pure function extraction enabled parallel backend/frontend velocity.** The architectural decision to extract `computePaymentBreakdown` as a pure function (no database dependencies, no auth context) meant the core business logic could be written and tested independently of the Convex query handlers. Story 6-1 established this function; Story 6-2 reused it verbatim via a single function call. This is the first time in the project that a backend function was designed for testability from the start.

2. **Debt-fix patterns from prior epics were reused directly.** The `hasEditorRole` helper (TD-036) and `formatCurrency` extraction (TD-035) followed patterns established in prior epics: `hasRole` (TD-008, Epic 1 frontend), `countWords` extraction (TD-029, Epic 5), and constant export patterns (TD-022, TD-030). The debt-fix pass completed rapidly because the patterns were familiar.

3. **Self-contained component pattern from Epic 5 recommendation was followed.** `NotificationPreviewList` loads its own data via `useQuery`, matching the `DiscussionThread` pattern from Epic 4/5. This eliminated prop-drilling complexity and made the component trivially embeddable.

### Story Complexity Pattern

| Story | Type | New Files | Modified Files | Duration | Fix Cycles | Notes |
|-------|------|-----------|----------------|----------|------------|-------|
| 6-1 | Full-stack (pure fn + query + component + route update) | 2 | 2 | 26 min | 0 | Heaviest: 416-line module + 310-line component |
| 6-2 | Full-stack (query + mutation + component + removal cleanup) | 1 | 5 | 22 min | 0 | Most modifications; removed placeholder code |
| 6-3 | Full-stack (query module + feature folder + component) | 4 | 1 | 23 min | 0 | Most new files; new feature folder |

**Observation:** Story 6-1 was the largest in absolute code volume (726 net lines across payments.ts + payment-calculator.tsx + 281-line test file) yet completed in 26 minutes. This is faster than any story from Epics 1, 4, or the median of Epic 3, despite being a substantial full-stack feature with animated UI. The pure function architecture enabled rapid verification -- 23 tests were written inline with the implementation, not deferred.

---

## 3. What Went Well

### 3.1 First epic to ship with meaningful automated tests since Epic 3

Epic 6 broke the test drought that lasted from Epic 4 through Epic 5. The `convex/__tests__/payments.test.ts` file contains 23 tests covering all branches of the `computePaymentBreakdown` pure function: base pay (5 tests), quality multiplier (3 tests), speed bonus (4 tests), abstract bonus (2 tests), total calculation (2 tests), deadline computation (1 test), and constant verification (6 tests). The project test count rose from 73 to 96.

**Evidence:** `convex/__tests__/payments.test.ts` (281 lines) covers: explicit page count, PDF estimation with min-1-page guard, default 15-page fallback, explicit-over-PDF precedence, standard/excellent quality multipliers applied to base pay only, submitted/in-progress/locked/deadline-passed speed bonus scenarios, abstract bonus presence/absence, and full formula verification with a concrete expected value ($1,700).

**Why it worked:** The Epic 5 retrospective specifically recommended that payment calculation was "the most testable feature in the project -- pure arithmetic with deterministic inputs and outputs." The architecture decision to extract `computePaymentBreakdown` as a pure function (separate from Convex query handlers) eliminated the need to mock database context, making tests trivial to write.

### 3.2 Pure function architecture enabled formula consistency guarantee

The `computePaymentBreakdown` function is called by both `getPaymentBreakdown` (reviewer-facing, Story 6-1) and `getPaymentSummary` (editor-facing, Story 6-2). This guarantees that reviewers and editors always see identical payment calculations -- a key acceptance criterion (6-2 AC3). The function is also the sole test target, meaning 23 tests verify the formula for both user perspectives simultaneously.

**Evidence:** `convex/payments.ts` line 183 (`return computePaymentBreakdown({...})` in `getPaymentBreakdown`) and line 289 (`const breakdown = computePaymentBreakdown({...})` in `getPaymentSummary`) call the same pure function with the same input shape.

### 3.3 Placeholder code removal was clean (zero orphaned imports)

Story 6-2 removed the `getPaymentEstimates` placeholder query from `convex/decisions.ts` and its rendering from `DecisionPanel`. The removal was clean -- no orphaned imports, no build errors, no references in other files. The `DollarSignIcon` import was also removed from `decision-panel.tsx` since it became unused. This confirms that placeholder code was well-isolated.

**Evidence:** Traceability matrix AC6 verified via grep that `getPaymentEstimates` and `DollarSignIcon` do not appear in any source file under `convex/` or `app/` (only in documentation/story files).

### 3.4 New feature folder `app/features/notifications/` follows all conventions

The notifications feature folder was created in Story 6-3 following every convention from the Epic 5 retrospective recommendations:
- Barrel export (`index.ts` with single export)
- Constants file (`notification-constants.ts` with type config mapping)
- Self-contained component loading its own data via `useQuery`
- Naming convention (`notification-preview-list.tsx`, `notification-constants.ts`)

This is the sixth feature folder in the project and the third created by following the retrospective recommendation pattern (after `article/` in Epic 5).

### 3.5 Debt-fix pass resolved cross-cutting concerns efficiently

Two debt items were identified and resolved during the Epic 6 debt-fix pass:

1. **TD-035 (formatCurrency duplication):** Extracted to `app/lib/format-utils.ts` as a shared utility. Both `payment-calculator.tsx` and `payment-summary-table.tsx` now import from the shared module. This is the first shared utility in `app/lib/` beyond `utils.ts`.
2. **TD-036 (hasEditorRole type assertion):** Created `hasEditorRole(role: string): boolean` in `convex/helpers/roles.ts`. Updated all 3 Epic 6 callsites in `payments.ts` and `notifications.ts`. The function uses `(EDITOR_ROLES as ReadonlyArray<string>).includes(role)` to avoid the unsafe cast pattern.

### 3.6 Quality level mutation implements correct create-or-update semantics

The `setQualityLevel` mutation handles the "no payments record exists" case by creating a new record with defaults (page count from PDF size or 15, weeksEarly 0, hasAbstractBonus false). When a record exists, it patches only `qualityLevel` and `updatedAt`. This upsert pattern is well-tested by the traceability verification (AC5 with 6 sub-criteria, all PASS).

**Evidence:** `convex/payments.ts` lines 378-403 -- two branches: `ctx.db.patch` for existing records, `ctx.db.insert` for new records with PDF-size-based page estimation fallback.

---

## 4. What Could Improve

### 4.1 Tests cover only the pure function, not query/mutation handlers

The 23 tests in `payments.test.ts` cover `computePaymentBreakdown` exclusively. The three Convex functions (`getPaymentBreakdown`, `getPaymentSummary`, `setQualityLevel`) and the `listBySubmission` query in `notifications.ts` have zero automated tests. These functions contain authorization checks (editor role enforcement), database lookups (review/payment/abstract record resolution), and data transformation logic (reviewer deduplication, recipient name enrichment) that are not exercised by the pure function tests.

The traceability matrix classifies these as P1 gaps (mutation/query handler logic) rather than P0 because the most critical business logic (the payment formula) is covered. However, the authorization checks in `getPaymentSummary`, `setQualityLevel`, and `listBySubmission` are security boundaries that remain unverified by any automated test (TD-039).

### 4.2 P0 tech debt now at 14 items across 6 epics

The P0 tech debt count grew from 13 (end of Epic 5) to 14 (end of Epic 6). While Epic 6 added tests for the payment formula, it also introduced a new P0 item (TD-039: zero backend tests for handler logic). The net effect is +1 P0 despite the testing progress.

| Age | Count | Items |
|-----|-------|-------|
| 6 epics | 1 | TD-010 (auth wrappers) |
| 5 epics | 2 | TD-013 (triage safety), TD-014 (submission auth) |
| 4 epics | 4 | TD-024 (audit), TD-025 (embeddings), TD-026 (invitations), TD-027 (undo decision) |
| 3 epics | 4 | TD-029* (reviews OCC), TD-030* (discussion identity), TD-031* (review functions), TD-032* (discussions) |
| 2 epics | 2 | TD-032 (reviewer abstracts), TD-033 (public article queries) |
| 1 epic | 1 | TD-039 (payment/notification handlers) |

*Note: TD-029 through TD-032 in the "3 epics" row refer to Epic 4's original numbering, which was renumbered in the tech debt registry. See the tech debt registry for current IDs.

TD-010 has been carried for 6 consecutive epics. This is the project's most persistent quality gap.

### 4.3 `notifications` table still missing `by_submissionId` index (TD-038)

The `listBySubmission` query in `convex/notifications.ts` uses `.filter()` to match on `submissionId`, performing a full table scan. This was explicitly acknowledged in the story spec as acceptable for the prototype (3-5 notifications per submission), but the missing index is logged as TD-038 (P2). The notification volume will grow with each reviewer invitation and editorial decision.

### 4.4 ATDD checklists for Stories 6-1 and 6-2 have unchecked items

The ATDD checklist files for Stories 6-1 and 6-2 have all items unchecked (`[ ]`), even though all criteria pass code review verification in the traceability matrix. Story 6-3 has all items checked (`[x]`). This is a process inconsistency -- either all stories should be checked or none.

### 4.5 `payment-summary-table.tsx` uses relative import path for Convex modules

The `PaymentSummaryTable` component imports Convex modules via relative paths (`../../../convex/_generated/api` and `../../../convex/_generated/dataModel`) instead of the project's standard import paths (`convex/_generated/api`). The `NotificationPreviewList` uses the same relative pattern. This is inconsistent with the `PaymentCalculator` component in the review feature folder, which uses the standard import path.

**Evidence:** `app/features/editor/payment-summary-table.tsx:4` uses `'../../../convex/_generated/api'`; `app/features/review/payment-calculator.tsx:13` uses `'convex/_generated/api'`.

---

## 5. Key Patterns Established

### 5.1 Pure Function Extraction for Testability

The `computePaymentBreakdown` function is the project's first deliberate testability-by-design pattern. By separating business logic from database access, the function can be tested without mocking Convex context, and the same function serves multiple Convex query handlers.

**Architecture:**
```
computePaymentBreakdown(input: PaymentInput): PaymentBreakdown
  |
  +-- getPaymentBreakdown (reviewer-facing query, withReviewer)
  |     Collects input from reviews + payments + reviewerAbstracts tables
  |
  +-- getPaymentSummary (editor-facing query, withUser + EDITOR_ROLES)
        Collects input for each reviewer, calls computePaymentBreakdown per reviewer
```

**Pattern rule:** For any Convex function with complex business logic (calculations, state machines, validation rules), extract the logic into a pure function that takes a plain TypeScript interface as input. Test the pure function directly. The Convex handler becomes a thin adapter that collects input data from the database and calls the pure function.

### 5.2 Shared Utility in `app/lib/`

Epic 6 established `app/lib/format-utils.ts` as the location for shared formatting utilities. Previously, `app/lib/` only contained `utils.ts` (the `cn` classname merger). The `formatCurrency` function is the first domain utility extracted here.

**Pattern rule:** Utilities used across multiple feature folders belong in `app/lib/`. Feature-specific utilities belong in their feature folder (e.g., `notification-constants.ts` in `app/features/notifications/`).

### 5.3 Counting-Up Animation Hook

The `useCountUp(target, duration, active)` hook provides rAF-based number animation with ease-out cubic easing. It is designed for one-shot animations triggered by component mount (via `key` prop change).

**Pattern rule:** For future animated number displays, reuse the `useCountUp` pattern from `payment-calculator.tsx`. If the pattern is needed in multiple components, extract to `app/lib/hooks/`.

### 5.4 Live Countdown via `setInterval` + Server Timestamp

The `useDeadlineCountdown(deadlineMs)` hook computes days remaining client-side from a server-provided deadline timestamp. It updates every 60 seconds via `setInterval`. This avoids making the Convex query non-deterministic (the server provides `deadlineMs`; the client handles the countdown display).

**Pattern rule:** Time-sensitive display values should be computed client-side from server-provided timestamps. Do not use `Date.now()` in Convex queries for display purposes (TD-018 already identifies this as a concern for overdue calculations).

### 5.5 Create-or-Update (Upsert) Mutation Pattern

The `setQualityLevel` mutation implements explicit create-or-update logic: query by index, check if record exists, either `ctx.db.patch` or `ctx.db.insert`. This is the first mutation in the project to implement upsert semantics.

**Pattern rule:** For mutations that may need to create or update a record, query for the existing record by index, then branch on existence. Use typed branches (not `Record<string, unknown>` patches) to preserve TypeScript inference.

---

## 6. Tech Debt Inventory

### Tech Debt Resolved During Epic 6

| ID | Description | Resolution |
|----|-------------|------------|
| TD-035 | `formatCurrency` duplicated between `payment-calculator.tsx` and `payment-summary-table.tsx` | Extracted to `app/lib/format-utils.ts` as shared utility |
| TD-036 | `hasEditorRole` type assertion pattern in 3 Epic 6 callsites | Created `hasEditorRole()` helper in `convex/helpers/roles.ts` |

### New Tech Debt from Epic 6

| ID | Story | Description | Priority | Location |
|----|-------|-------------|----------|----------|
| TD-037 | Systemic | `EDITOR_ROLES.includes(... as ...)` type assertion in 20+ backend callsites across Epics 3-5 | P3 | 9 Convex files |
| TD-038 | 6-3 | `notifications` table missing `by_submissionId` index; `listBySubmission` does full table scan | P2 | `convex/schema.ts`, `convex/notifications.ts` |
| TD-039 | 6-1/6-2/6-3 | Zero backend tests for handler logic (`getPaymentSummary`, `setQualityLevel`, `listBySubmission`) | P0 | `convex/payments.ts`, `convex/notifications.ts` |
| TD-040 | 6-1/6-2/6-3 | Zero component tests for Epic 6 frontend (PaymentCalculator, PaymentSummaryTable, NotificationPreviewList) | P1 | `app/features/review/`, `app/features/editor/`, `app/features/notifications/` |

### Carried Tech Debt (from prior epics, still open)

| ID | Source | Priority | Epics Carried |
|----|--------|----------|---------------|
| TD-010 | Epic 1 | P0 | 6 |
| TD-013 | Epic 2 | P0 | 5 |
| TD-014 | Epic 2 | P0 | 5 |
| TD-015 | Epic 2 | P1 | 5 |
| TD-016 | Epic 2 | P2 | 5 |
| TD-017 | Epic 3 | P2 | 4 |
| TD-018 | Epic 3 | P2 | 4 |
| TD-019 | Epic 3 | P2 | 4 |
| TD-024 | Epic 3 | P0 | 4 |
| TD-025 | Epic 3 | P0 | 4 |
| TD-026 | Epic 3 | P0 | 4 |
| TD-027 | Epic 3 | P0 | 4 |
| TD-028 | Epic 3 | P1 | 4 |
| TD-032 | Epic 5 | P0 | 2 |
| TD-033 | Epic 5 | P0 | 2 |
| TD-034 | Epic 5 | P1 | 2 |
| TD-004 | Epic 1 | Low | 6 (deferred to Convex platform) |

**P0 summary:** 14 P0 items open across 6 epics. While Epic 6 added 23 tests (the first feature tests since Epic 3), it also introduced 1 new P0 item (TD-039). The net P0 count grew from 13 to 14. All P0 items are zero-test-coverage gaps for security-critical and data-integrity-critical code paths.

**Progress note:** Unlike Epics 4-5 which added zero tests, Epic 6 demonstrates that the pure function extraction pattern makes testing practical. The `computePaymentBreakdown` tests were written inline with implementation (not deferred), validating the Epic 5 retrospective's recommendation. This pattern should be applied to future domain logic.

---

## 7. CLAUDE.md Recommendations

Based on patterns established in Epic 6, the following additions should be made to CLAUDE.md files:

### Root `CLAUDE.md`

**Update "Feature Folder Pattern" subsection:**
Update folder sizes to reflect Epic 6 additions:
- `app/features/review/` now has 15 files (was 14, added `payment-calculator.tsx`)
- `app/features/editor/` now has 15 files (was 14, added `payment-summary-table.tsx`)
- Add `app/features/notifications/` (3 files) to the established folders list

**Update "Auth Wrappers (Convex RBAC)" subsection:**
Add note about `hasEditorRole()` helper in `convex/helpers/roles.ts`:
- "Editor role gating" bullet can be updated to mention that `hasEditorRole(ctx.user.role)` is available as a type-safe alternative to the raw `EDITOR_ROLES.includes(... as ...)` pattern
- New Convex functions should prefer `hasEditorRole()` over the raw cast pattern

**Update "Convex Shared Helpers" subsection:**
Add `convex/helpers/roles.ts` entry to mention `hasEditorRole()` helper alongside existing `EDITOR_ROLES` and `WRITE_ROLES`.

**Consider adding "Pure Function Testing Pattern" subsection:**
The `computePaymentBreakdown` pattern (extract business logic from Convex handlers into pure functions, test the pure function directly) is a project-level architectural decision. A brief CLAUDE.md note would guide future implementations:
- When writing Convex functions with complex logic, extract to a pure function
- Test the pure function without mocking database context
- Convex handler becomes a thin adapter (collect data, call pure function, return result)

### `convex/CLAUDE.md`

**Add "Pure Function Extraction" section:**
Document the pattern established by `convex/payments.ts`: `computePaymentBreakdown` is exported and tested independently. Multiple Convex query handlers call the same pure function. This is the project's first example of testability-driven architecture in the Convex layer.

---

## 8. Epic 5 Retrospective Follow-Through

The Epic 5 retrospective identified 7 recommendations. Here is how they were addressed in Epic 6:

| # | Recommendation | Status | Notes |
|---|---------------|--------|-------|
| 1 | [CRITICAL] Address test debt -- resolve TD-010 and TD-033 before adding more code | PARTIAL | TD-010 and TD-033 remain unresolved. However, 23 new tests were added for payment formula -- first feature tests since Epic 3. P0 count grew from 13 to 14 (net +1 despite testing progress). |
| 2 | Write at least one proof-of-concept test -- any test | DONE | 23 tests written in `convex/__tests__/payments.test.ts` covering all branches of `computePaymentBreakdown`. This breaks the 2-epic drought of zero tests. |
| 3 | Payment calculation is pure logic -- ideal for testing. Include tests as AC | DONE | `computePaymentBreakdown` extracted as a pure function and tested with 23 unit tests. Architecture was specifically designed for testability per this recommendation. |
| 4 | Notification previews should reuse the self-contained component pattern | DONE | `NotificationPreviewList` loads its own data via `useQuery(api.notifications.listBySubmission, { submissionId })`. Follows the `DiscussionThread` cross-feature embedding pattern from Epic 4/5. |
| 5 | Follow the article feature folder pattern for new domains | DONE | Created `app/features/notifications/` with `notification-constants.ts`, `notification-preview-list.tsx`, and `index.ts` barrel export. Third feature folder created following retrospective guidance. |
| 6 | Update feature folder sizes in CLAUDE.md | NOT DONE | CLAUDE.md still shows `review/` (14 files) and `editor/` (14 files). Both now have 15 files. `notifications/` (3 files) is not listed. |
| 7 | Add audit trail action types reference | NOT DONE | No audit trail changes in Epic 6. Recommendation deferred -- still valid for future epics that add new audit action types. |

**Assessment:** 5 of 7 recommendations addressed (71%). The two highest-priority items from Epic 5 (items 1 and 2) were both addressed, though item 1 was partial (new tests added but legacy P0 items remain). Items 3, 4, and 5 were fully executed. Items 6 and 7 are documentation updates that can be done in the next CLAUDE.md optimization pass.

**Critical improvement:** For the first time in the project's history, a retrospective recommendation to write tests was actually followed through. The pure function extraction architecture (item 3) made testing natural rather than burdensome. This validates the hypothesis that test debt accumulation was partly an architecture problem (Convex function testing requires mocking), not just a process problem.

---

## 9. Cross-Story Patterns

### Pattern 1: Payment module is the project's first multi-query, single-source-of-truth module

The `convex/payments.ts` module exports 3 Convex functions and 1 pure function:

| Function | Type | Auth | Consumer |
|----------|------|------|----------|
| `computePaymentBreakdown` | Pure function (exported) | None | Both queries + test file |
| `getPaymentBreakdown` | query | `withReviewer` | `PaymentCalculator` (reviewer) |
| `getPaymentSummary` | query | `withUser` + `EDITOR_ROLES` | `PaymentSummaryTable` (editor) |
| `setQualityLevel` | mutation | `withUser` + `EDITOR_ROLES` | `PaymentSummaryTable` (editor) |

This is the first Convex module in the project that serves two different user roles (reviewer and editor) with distinct auth requirements but shared business logic. Previous modules served a single role each (e.g., `reviews.ts` = reviewer, `decisions.ts` = editor).

### Pattern 2: Feature folders now span the full application domain

With the addition of `app/features/notifications/`, the project has 6 feature folders covering all domain areas:

| Feature Folder | Files | Established | Primary Role |
|---------------|-------|-------------|--------------|
| `app/features/submissions/` | 12 | Epic 2 | Author |
| `app/features/auth/` | 4 | Epic 1 | Cross-cutting |
| `app/features/editor/` | 15 | Epic 3 | Editor |
| `app/features/review/` | 15 | Epic 4 | Reviewer |
| `app/features/article/` | 3 | Epic 5 | Public (reader) |
| `app/features/notifications/` | 3 | Epic 6 | Editor (inline preview) |
| `app/features/admin/` | 3 | Epic 3 | Admin |

Epic 6 extended two existing folders by one component each (`review/` + `payment-calculator.tsx`, `editor/` + `payment-summary-table.tsx`) and created one new folder (`notifications/`). This matches the Epic 5 pattern where one new folder was created and two were extended.

### Pattern 3: Debt-fix pass follows a consistent pattern

Across Epics 5 and 6, the debt-fix pass follows the same structure:

| Step | Epic 5 | Epic 6 |
|------|--------|--------|
| Identify duplication | `countWords`, word count constants, `Record<string,unknown>` | `formatCurrency`, `EDITOR_ROLES` type assertion |
| Extract shared utility | Import from existing file (TD-029), export from backend (TD-030) | Create new shared file (TD-035), create new helper function (TD-036) |
| Items resolved | 3 | 2 |
| Items identified | 3 | 6 (4 net new after resolving 2) |

The debt-fix pass is becoming a reliable project ritual: identify cross-file duplication during implementation, extract to shared locations, and log remaining items for future passes.

### Pattern 4: Self-contained component pattern scales reliably

Three components now use the self-contained pattern (load own data via `useQuery`):

| Component | Epic | Query | Context |
|-----------|------|-------|---------|
| `DiscussionThread` | 4 | `api.discussions.listBySubmission` | Embedded in author `submission-detail.tsx` (Epic 5) |
| `AuditTimeline` | 3 | `api.audit.listBySubmission` (paginated) | Embedded in editor `submission-detail-editor.tsx` |
| `NotificationPreviewList` | 6 | `api.notifications.listBySubmission` | Embedded in editor `submission-detail-editor.tsx` |

All three follow the same contract: receive `submissionId` as a prop, call `useQuery` to load data, return `null` when empty, show skeleton when loading. This pattern is now established enough to be considered a project convention.

---

## 10. Metrics Summary

### Files Created in Epic 6

**Backend (2 files):**
- `convex/payments.ts` -- 3 functions (`getPaymentBreakdown`, `getPaymentSummary`, `setQualityLevel`) + 1 pure function (`computePaymentBreakdown`) + exported constants + interfaces (416 lines)
- `convex/notifications.ts` -- 1 query (`listBySubmission`) with editor auth + recipient enrichment (70 lines)

**Tests (1 file):**
- `convex/__tests__/payments.test.ts` -- 23 tests covering `computePaymentBreakdown` pure function (281 lines)

**Frontend components (4 files across 3 feature folders):**
- `app/features/review/payment-calculator.tsx` -- collapsible footer with counting-up animation, deadline countdown (310 lines)
- `app/features/editor/payment-summary-table.tsx` -- per-reviewer table with quality Select dropdown (165 lines)
- `app/features/notifications/notification-preview-list.tsx` -- self-contained notification cards (120 lines)
- `app/features/notifications/notification-constants.ts` -- notification type config mapping (17 lines)

**Barrel exports (1 file):**
- `app/features/notifications/index.ts` -- single export (1 line)

**Shared utilities (1 file):**
- `app/lib/format-utils.ts` -- `formatCurrency` utility (4 lines)

### Files Modified in Epic 6

- `convex/decisions.ts` -- removed `getPaymentEstimates` placeholder query (88 lines deleted, minor additions)
- `convex/_generated/api.d.ts` -- auto-generated, new exports for payments and notifications modules
- `app/features/editor/decision-panel.tsx` -- removed payment estimates section and `DollarSignIcon` import
- `app/features/editor/submission-detail-editor.tsx` -- added `PaymentSummaryTable` and `NotificationPreviewList` sections
- `app/features/editor/index.ts` -- added `PaymentSummaryTable` export
- `app/features/review/index.ts` -- added `PaymentCalculator` export
- `app/routes/review/$submissionId.tsx` -- added `PaymentCalculator` below split panels

### Commit Summary

| Commit | Story | Type | Files | Insertions | Deletions |
|--------|-------|------|-------|------------|-----------|
| 9daf388 | 6-1 | feat | ~10 | ~1,200 | ~20 |
| a0b1aea | 6-2 | feat | ~8 | ~500 | ~100 |
| 3ca30bf | 6-3 | feat | ~7 | ~800 | ~25 |

**Total:** 3 commits, 23 files changed, 2,540 insertions, 145 deletions (net +2,395 lines)

### Velocity Summary

| Metric | Value |
|--------|-------|
| Stories completed | 3/3 (100%) |
| Total duration | ~71 minutes |
| Average story duration | ~24 minutes |
| Stories per hour | 2.54 |
| Total commits | 3 |
| Average review fix cycles | 0.0 |
| New Convex functions | 4 (1 pure + 2 queries + 1 mutation) |
| New frontend components | 3 |
| New utility files | 2 (format-utils.ts, notification-constants.ts) |
| New feature folders | 1 (notifications) |
| Tests added | 23 |
| Tests passing | 96/96 |
| P0 tech debt items (total open) | 14 |

### Cumulative Project Metrics (End of Epic 6)

| Metric | Value |
|--------|-------|
| Total stories completed | 25 (4+4+7+4+3+3) |
| Total implementation time | ~789 minutes (~13.1 hours) |
| Total commits | 51 |
| Total Convex functions | ~49 |
| Total frontend components | ~53 |
| Total feature folders | 7 (submissions, editor, review, article, notifications, admin, auth) |
| Total tests | 96 |
| Total test files | 6 |
| Total P0 tech debt | 14 |

---

## 11. Recommendations for Epic 7

### Before Starting Epic 7 Feature Stories

1. **[CRITICAL] Apply the pure function extraction pattern to at least one legacy P0 item.** Epic 6 proved that pure function extraction makes testing practical. Apply this pattern to resolve at least one of: TD-010 (auth wrappers -- extract role-checking logic as pure functions), TD-013 (triage safety -- `sanitizeResult` and backoff delay formula are already nearly pure), or TD-027 (undo decision -- time window validation is a pure comparison). The pattern is now proven; the remaining barrier is prioritization, not architecture.

2. **Resolve TD-033 (public article queries).** This is the project's highest security-risk untested code. The `articles.getPublishedArticle` query's status filter (`submission.status !== 'PUBLISHED'`) is the security boundary for unauthenticated data access. A regression test is straightforward: mock a submission with each status, verify only PUBLISHED returns data. This can be done as a pure function extraction + test.

3. **Update CLAUDE.md feature folder sizes and add notifications folder.** From recommendation 6 (not done in Epic 6): `review/` (15 files), `editor/` (15 files), add `notifications/` (3 files).

### During Epic 7 Story Planning

4. **Continue the pure function pattern for any complex business logic.** Any story with calculations, validation rules, or state machine logic should extract that logic into a testable pure function. The `computePaymentBreakdown` pattern reduced both implementation time and testing time.

5. **If writing new Convex modules, use `hasEditorRole()` instead of the raw type assertion.** The helper is now available in `convex/helpers/roles.ts`. Avoid introducing new instances of the `EDITOR_ROLES.includes(... as ...)` pattern (TD-037).

6. **For new feature folders, follow the notifications pattern.** Three files: constants, component, barrel export. Self-contained components that load their own data via `useQuery`.

### CLAUDE.md Updates

7. **Add pure function testing pattern to CLAUDE.md.** The `computePaymentBreakdown` approach (extract from Convex handler, test directly) should be documented as a project convention. Recommended section: "Testing Patterns" after the existing "Vitest Projects Config" section.

8. **Update "Convex Shared Helpers" to mention `hasEditorRole()`.** The function exists in `convex/helpers/roles.ts` alongside `EDITOR_ROLES` and `WRITE_ROLES` but is not mentioned in CLAUDE.md.

9. **Add `app/lib/format-utils.ts` to project documentation.** This is the first shared utility file beyond `utils.ts`. Future shared formatting functions (currency, dates, numbers) should go here.

---

**Generated:** 2026-02-08
**Analyst:** Retrospective Agent (claude-opus-4-6)
