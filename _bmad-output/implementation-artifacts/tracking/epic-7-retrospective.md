# Retrospective: Epic 7 - Seed Data & Demo Experience

**Date:** 2026-02-08
**Epic:** 7 - Seed Data & Demo Experience
**FRs Covered:** FR47, FR48, FR49, FR50, FR51
**Duration:** ~88 minutes (~1h 28m)
**Sprint Mode:** YOLO (rapid implementation, no pre-implementation test gates)
**Stories:** 3

---

## 1. Epic Summary

Epic 7 delivered the seed data infrastructure for the prototype demo experience: a single `convex/seed.ts` module (2,181 lines) that populates the database with 10 users across all roles, 5 submissions spanning every pipeline stage, 20 triage reports with substantive alignment research analysis, 8 reviews with structured academic content, discussion threads with threaded replies, a signed reviewer abstract, coherent audit trails, notifications, payments, match results, and 5 reviewer profiles with scheduled vector embedding generation. The entire epic is backend-only -- zero frontend files were created or modified.

Story 7-1 created the foundational `convex/seed.ts` module (1,892 lines) with 12 typed batch internalMutations, idempotency via sentinel user check with partial-seed cleanup, and the `seedData` internalAction orchestrating writes in dependency order. Story 7-2 expanded the reviewer pool from 3 to 5 reviewers with distinct AI alignment expertise profiles and scheduled embedding generation via the existing production pipeline, adding 15 unit tests for the pure builder functions. Story 7-3 added discussion threads on Submission 5 (PUBLISHED) with threaded replies, additional audit trail entries for the reviewer abstract lifecycle, and two-phase discussion insertion for parent-child ID resolution.

All 3 stories were implemented and merged. Story 7-3 required 1 review fix cycle (Codex feedback addressed in commit `93827db`), breaking the 2-epic streak of zero-fix stories. 15 new tests were added in Story 7-2. The project test count rose from 96 to 111.

### Stories Delivered

| Story | Title | Duration | Commits | Review Fix Cycles |
|-------|-------|----------|---------|-------------------|
| 7-1 | Seed Data Generation Action | 35m 7s | 1 | 0 |
| 7-2 | Seed Reviewer Pool with Expertise Profiles | 18m 12s | 1 | 0 |
| 7-3 | Seed Reviews, Discussions, and Published Article | 35m 8s | 2 | 1 |

**Total commits:** 4 (3 feat + 1 fix)
**Total files changed:** 11 (3,547 insertions, 8 deletions)

---

## 2. Key Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Stories completed | 3/3 (100%) | Excellent |
| Stories failed | 0 | Excellent |
| Total duration | ~88 minutes | Slightly above Epic 6 (71 min) |
| Average story duration | ~29 minutes | Slightly above Epic 6 (24 min) |
| Total commits | 4 | +1 fix commit compared to Epics 5-6 |
| Average review fix cycles | 0.33 | 1 fix cycle on 1 of 3 stories |
| Tests passing | 111/111 (100%) | No regressions, 15 new |
| New tests added | 15 | Covered pure builder functions |
| Tech debt items resolved | 1 (lint: 4 violations) | Minimal -- seed module is self-contained |
| New tech debt identified | 3 (documented) | All acceptable patterns |
| P0 tech debt items open (total) | 14 | Unchanged from Epic 6 |

### Velocity Comparison Across All Epics

| Metric | Epic 1 | Epic 2 | Epic 3 | Epic 4 | Epic 5 | Epic 6 | Epic 7 | Trend |
|--------|--------|--------|--------|--------|--------|--------|--------|-------|
| Stories | 4 | 4 | 7 | 4 | 3 | 3 | 3 | -- |
| Total duration | ~160 min | ~116 min | ~207 min | ~155 min | ~80 min | ~71 min | ~88 min | Slight increase |
| Avg story duration | ~40 min | ~29 min | ~30 min | ~39 min | ~27 min | ~24 min | ~29 min | Slight increase |
| Fastest story | 22 min (1-1) | 17 min (2-4) | 22 min (3-6) | 30 min (4-2) | 25 min (5-2) | 22 min (6-2) | 18 min (7-2) | New project best |
| Slowest story | 50 min (1-3) | 34 min (2-1) | 41 min (3-7) | 54 min (4-3) | 29 min (5-3) | 26 min (6-1) | 35 min (7-1/7-3) | Slight increase |
| Stories/hour | 1.5 | 2.1 | 2.0 | 1.5 | 2.25 | 2.54 | 2.05 | Below peak |
| Commits per story | 2.5 | 2.0 | 2.6 | 2.25 | 1.0 | 1.0 | 1.33 | +0.33 from fix cycle |
| Review fix cycles avg | -- | -- | -- | 1.0 | 0.0 | 0.0 | 0.33 | Slight regression |
| Tests added | 29 | 23 | 21 | 0 | 0 | 23 | 15 | Consistent (2 consecutive epics) |

**Velocity analysis:** Epic 7's average story duration (29 min) is higher than Epics 5-6 (27 min, 24 min) but in line with Epic 3 (30 min). The primary factors:

1. **Story 7-1 was the largest single-file creation in project history.** The `convex/seed.ts` module started at 1,892 lines -- more than any individual file created in prior epics. The seed data requires authoring extensive static content (triage findings, review analysis, discussion messages) that cannot be generated from patterns. This content-heavy nature explains the 35-minute duration despite zero business logic complexity.

2. **Story 7-2 set the project's fastest story record.** At 18m 12s, Story 7-2 is the fastest story ever completed, beating the previous record of 17m (2-4, which was a simpler scope). The speed is attributable to focused scope (add 2 users, 2 profiles, 1 small mutation) and the pure function testing pattern making test authoring fast.

3. **Story 7-3 had a review fix cycle.** The Codex review flagged issues that required 212 insertions and 37 deletions in `convex/seed.ts`. This is the first fix cycle since Epic 4, breaking the 2-epic perfect streak.

### Story Complexity Pattern

| Story | Type | New Files | Modified Files | Duration | Fix Cycles | Notes |
|-------|------|-----------|----------------|----------|------------|-------|
| 7-1 | Backend-only (1,892-line new module) | 1 | 1 (api.d.ts auto-gen) | 35 min | 0 | Largest single file creation ever |
| 7-2 | Backend-only (expand existing module + tests) | 1 (test file) | 1 (seed.ts) | 18 min | 0 | Fastest story ever; 15 tests |
| 7-3 | Backend-only (enhance existing module) | 0 | 1 (seed.ts) | 35 min | 1 | Review fix added 212 lines |

**Observation:** Epic 7 is the project's first backend-only epic. No frontend components, no route files, no CSS, no feature folders. This is architecturally unusual -- every prior epic (1-6) was full-stack. The seed module's isolation meant zero risk of frontend regressions, but the content-heavy nature (writing realistic alignment research prose) made individual stories slower than the lean full-stack stories in Epics 5-6.

---

## 3. What Went Well

### 3.1 Single-file architecture kept the blast radius minimal

All Epic 7 implementation is contained in exactly one source file: `convex/seed.ts` (2,181 lines). One test file was added (`convex/__tests__/seed-reviewers.test.ts`, 129 lines). Zero frontend files were created or modified. Zero existing Convex modules were touched. This minimal blast radius meant:

- No import graph changes (seed.ts has no consumers)
- No risk of regressions in existing features
- No build coordination between frontend and backend
- Trivial revert path if seed data causes issues

**Evidence:** `git diff --stat 530ea5f..ea608c6` shows 11 files changed, but 8 of those are story specs, ATDD checklists, sprint tracking, and auto-generated files. Only 2 source files were actually written: `convex/seed.ts` and `convex/__tests__/seed-reviewers.test.ts`.

### 3.2 Pure function testing pattern continued successfully from Epic 6

Story 7-2 applied the pure function extraction pattern (established in Epic 6 with `computePaymentBreakdown`) to the seed builder functions. `buildSeedUsers` and `buildReviewerProfiles` were exported as pure functions and tested with 15 unit tests covering user counts, role distribution, distinct affiliations, research area bounds, publication requirements, user ID references, backward compatibility, and distinct primary expertise areas.

**Evidence:** `convex/__tests__/seed-reviewers.test.ts` imports `{ buildReviewerProfiles, buildSeedUsers }` directly from `../seed` and tests them with fake user IDs -- no database mocking needed.

This is the second consecutive epic to ship with meaningful automated tests, validating that the pure function extraction pattern makes testing sustainable rather than burdensome.

### 3.3 Idempotency design exceeded spec requirements

The story spec called for a simple sentinel user check (boolean: seeded or not). The implementation delivered a three-state system (`'complete' | 'partial' | 'none'`) with a `cleanupPartialSeed` mutation that handles failed seed runs by deleting all seed-prefixed data before re-seeding. This is more robust than specified and handles the real-world scenario of a seed action timing out or being interrupted mid-execution.

**Evidence:** `convex/seed.ts:1475-1563` implements `checkSeeded` returning a three-state result and `cleanupPartialSeed` with cascading deletes across 11 tables using explicit table names.

### 3.4 Realistic AI alignment content adds genuine demo value

The seed data contains substantive alignment research content -- not lorem ipsum placeholders. Topics include corrigibility under distributional shift, mesa-optimization detection, scalable oversight via recursive reward modeling, Goodhart's Law in reward models, and mechanistic interpretability of alignment-relevant circuits. Triage reports reference specific papers (Soares et al. 2015, Hadfield-Menell et al. 2017, Turner et al. 2020). Reviews use academic tone with specific technical observations ("logarithmic degradation bound", "architectural signatures predictive of mesa-optimizer formation"). Discussion threads reference concrete findings (circuit modularity, adversarial fine-tuning effects, Perez et al. 2024 sycophancy circuits).

This content quality means the demo looks like a functioning journal, not a mock-up. Evaluators interacting with the prototype see authentic editorial workflow with domain-appropriate content.

### 3.5 Coherent timeline and actor consistency

All seed data uses a single `baseTime` constant with `DAY_MS` offsets, creating a coherent 35-day editorial timeline. Actor IDs are consistent throughout: Dr. Sarah Chen (author) submits papers, Dr. Robert Kim (EIC) makes editorial decisions, Dr. Elena Vasquez (AE) invites reviewers, reviewers write reviews and accept invitations. The audit trails trace each submission's lifecycle with correct actors and chronologically ordered timestamps.

**Evidence:** The traceability matrix verified 72 sub-criteria across 18 acceptance criteria, with 100% pass rate. Audit trail chronological ordering was explicitly verified for all 5 submissions.

### 3.6 Embedding generation reuses production pipeline

Rather than creating a separate embedding mechanism for seed data, Story 7-2 schedules `internal.matchingActions.generateEmbedding` for each reviewer profile -- the same internalAction used by the production `createOrUpdateProfile` mutation. This means seed embeddings go through the same OpenAI API call, stale-check, and save path as real user embeddings, ensuring the demo experience is identical to production behavior.

**Evidence:** `convex/seed.ts:1707-1720` -- `seedEmbeddings` internalMutation calls `ctx.scheduler.runAfter(0, internal.matchingActions.generateEmbedding, { profileId })`.

### 3.7 Two-phase discussion insertion is clean

Story 7-3 needed threaded replies (messages with `parentId` referencing another discussion). Since `parentId` requires a valid `Id<'discussions'>` from an already-inserted message, the implementation uses a two-phase approach: insert all top-level messages first (get IDs back), then insert replies using those IDs. This is simpler and more reliable than attempting single-pass insertion with forward references.

**Evidence:** `convex/seed.ts:2063-2097` -- first `seedDiscussions` call for top-level messages, then `buildDiscussionReplies` uses `discussionIds[4]` (first Sub 5 message) as `parentId`, second `seedDiscussions` call for replies. Defensive bounds check at line 2081-2088 guards against index errors.

---

## 4. What Could Improve

### 4.1 Story 7-3 required a review fix cycle

Story 7-3 received a `fix: address Codex review feedback` commit (`93827db`) with 212 insertions and 37 deletions in `convex/seed.ts`. This broke the 2-epic streak of zero-fix stories (Epics 5-6). The fix commit was substantial -- more insertions than Story 7-2's entire implementation (108 insertions).

The fix likely addressed issues with discussion data structure, audit trail entries, or orchestration changes for the two-phase discussion insertion. While a single fix cycle is minor compared to earlier epics (Epic 3 averaged 1.0 fix cycles per story, Epic 4 had stories with 3 fix cycles), it suggests that Story 7-3's requirements were complex enough to warrant more careful initial implementation -- particularly the two-phase discussion insertion and the audit trail additions for the reviewer abstract lifecycle.

### 4.2 The seed module is 2,181 lines in a single file

At 2,181 lines, `convex/seed.ts` is by far the largest single file in the project. While the single-file architecture has benefits (see 3.1), this size creates maintenance challenges:

- **Navigability:** Finding specific seed data (e.g., "what are Submission 3's discussion messages?") requires scrolling through ~2,000 lines.
- **12 nearly-identical batch mutations:** The `seedUsers`, `seedSubmissions`, `seedTriageReports`, etc. mutations all follow the same pattern (accept array, insert each record, return IDs) but cannot be genericized without losing Convex validator type safety.
- **Content interleaving:** Static data definitions (the `build*` functions) are interleaved with Convex infrastructure (validators, mutations, queries, action orchestration).

The debt fix report documents this as DOC-3 (acceptable pattern) since the Convex validator system makes a generic helper infeasible. However, for a non-prototype project, splitting the data definitions into a separate file (e.g., `convex/seedData.ts` for pure functions, `convex/seed.ts` for Convex functions) would improve maintainability.

### 4.3 ATDD checklist completion inconsistency persists

Stories 7-1 and 7-2 have ATDD checklists with all items unchecked (`[ ]`), while Story 7-3 has all items checked (`[x]`). This inconsistency was already flagged in the Epic 6 retrospective (Section 4.4) and remains unresolved. The checklists serve as verification artifacts -- having unchecked items suggests either the verification was not performed or the checklist was not updated after verification.

### 4.4 No P0 tech debt items were resolved

Epic 7 did not resolve any of the 14 P0 tech debt items carried from prior epics. The debt fix pass found only 1 fixable issue (4 lint violations) and 3 acceptable patterns. This is understandable for a seed data epic (no security boundaries, no business logic, no user-facing behavior), but the P0 count remains at 14 for the fourth consecutive epic after reaching that level in Epic 6.

The Epic 6 retrospective specifically recommended applying the pure function extraction pattern to at least one legacy P0 item before starting Epic 7 (Recommendation #1, marked CRITICAL). This was not done.

### 4.5 Limited test coverage beyond the two exported functions

Only 2 of the module's ~20 functions are tested: `buildSeedUsers` (5 tests) and `buildReviewerProfiles` (10 tests). The remaining 18+ functions (`buildSubmissions`, `buildTriageReports`, `buildReviews`, `buildDiscussions`, `buildDiscussionReplies`, `buildAuditLogs`, `checkSeeded`, `cleanupPartialSeed`, and 12 batch mutations) have zero automated tests.

The debt fix report correctly identifies this as appropriate for a data definition module where the untested code is either static data arrays (verified by TypeScript compilation) or thin insert wrappers (verified by Convex push). The `checkSeeded` three-state logic is the most complex untested code (~15 lines of branching logic), but the traceability matrix classifies it as P2 risk.

---

## 5. Key Patterns Established

### 5.1 Seed Data Module Architecture

Epic 7 established the pattern for database seeding in a Convex project:

```
convex/seed.ts
  |
  +-- build*() pure functions (data definitions, testable)
  |     buildSeedUsers, buildSubmissions, buildTriageReports,
  |     buildReviewerProfiles, buildReviews, buildReviewerAbstract,
  |     buildDiscussions, buildDiscussionReplies, buildAuditLogs, ...
  |
  +-- seed* internalMutations (typed batch inserts, one per table)
  |     seedUsers, seedSubmissions, seedTriageReports, ...
  |
  +-- checkSeeded internalQuery (three-state idempotency)
  +-- cleanupPartialSeed internalMutation (cascading delete for partial seeds)
  +-- seedEmbeddings internalMutation (deferred scheduling to production pipeline)
  +-- seedData internalAction (orchestrator, calls mutations in dependency order)
```

**Pattern rules:**
- Use `internalAction` (not public `action`) to prevent client-side invocation. Run via `npx convex run seed:seedData`.
- Extract data definitions into pure `build*()` functions for testability.
- One `seed*` internalMutation per table with explicit typed validators (no `v.any()`).
- Idempotency via sentinel check (known `clerkId`) with partial-seed cleanup.
- Dependency ordering: users first, then submissions (need authorIds), then dependent records.
- Use `seed_` prefix for all synthetic clerkIds to distinguish from real Clerk users.
- Reuse existing production pipelines (e.g., `generateEmbedding`) rather than creating seed-specific versions.

### 5.2 Two-Phase Insertion for Self-Referencing Data

When seed data has parent-child relationships within the same table (e.g., discussion replies referencing parent discussions), use a two-phase approach:

1. Insert all parent records via batch mutation, receive IDs back.
2. Use returned IDs as `parentId` for child records in a second batch mutation call.

Include a defensive bounds check before accessing parent IDs by index.

**Evidence:** `convex/seed.ts:2063-2097` -- top-level discussions inserted first, then replies with `parentId: discussionIds[4]`.

### 5.3 Three-State Idempotency

Rather than a simple boolean "seeded or not" check, the three-state approach (`'complete' | 'partial' | 'none'`) handles the edge case of interrupted seed runs:

- `'complete'`: sentinel user + dependent data exist -> return `{ alreadySeeded: true }`
- `'partial'`: sentinel user exists but dependent data missing -> run `cleanupPartialSeed`, then re-seed
- `'none'`: no sentinel user -> proceed with seeding

This is more robust than a boolean check because it recovers from partial failures without manual database cleanup.

---

## 6. Tech Debt Inventory

### Tech Debt Resolved During Epic 7

| ID | Description | Resolution |
|----|-------------|------------|
| FIX-1 | 4 `ctx.db.delete()` calls missing explicit table names (lint rule `@convex-dev/explicit-table-ids`) | Changed to `ctx.db.delete('tableName', id)` and restructured generic table loop into typed helper function |

### Documented Items (Acceptable Patterns)

| ID | Description | Why Acceptable |
|----|-------------|----------------|
| DOC-1 | `roleValidator` duplicated between `seed.ts` and `users.ts` | Known pattern (TD-004); Convex validators cannot be extracted from schema |
| DOC-2 | `checkSeeded` uses global `matchResults` query for partial detection | Only called from internal seed action; sentinel check is the primary guard |
| DOC-3 | 12 nearly-identical batch insert mutations | Convex validators require typed definitions per table; generic helper loses type safety |

### Carried Tech Debt (unchanged from Epic 6)

| ID | Source | Priority | Epics Carried |
|----|--------|----------|---------------|
| TD-010 | Epic 1 | P0 | 7 |
| TD-013 | Epic 2 | P0 | 6 |
| TD-014 | Epic 2 | P0 | 6 |
| TD-015 | Epic 2 | P1 | 6 |
| TD-016 | Epic 2 | P2 | 6 |
| TD-017 | Epic 3 | P2 | 5 |
| TD-018 | Epic 3 | P2 | 5 |
| TD-019 | Epic 3 | P2 | 5 |
| TD-024 | Epic 3 | P0 | 5 |
| TD-025 | Epic 3 | P0 | 5 |
| TD-026 | Epic 3 | P0 | 5 |
| TD-027 | Epic 3 | P0 | 5 |
| TD-028 | Epic 3 | P1 | 4 |
| TD-032 | Epic 5 | P0 | 3 |
| TD-033 | Epic 5 | P0 | 3 |
| TD-034 | Epic 5 | P1 | 3 |
| TD-037 | Epic 6 | P3 | 2 |
| TD-038 | Epic 6 | P2 | 2 |
| TD-039 | Epic 6 | P0 | 2 |
| TD-040 | Epic 6 | P1 | 2 |
| TD-004 | Epic 1 | Low | 7 (deferred to Convex platform) |

**P0 summary:** 14 P0 items open, unchanged from Epic 6. No new P0 items were introduced (the seed module is internal infrastructure with no client-facing security boundaries). No existing P0 items were resolved. TD-010 has now been carried for 7 consecutive epics.

**Note on Epic 7's P0 posture:** Unlike Epics 4-6, Epic 7 did not introduce any new security-critical or auth-gated code paths. The seed module uses only `internalAction`, `internalMutation`, and `internalQuery` -- none of which are client-accessible. Therefore, the absence of new P0 items is expected and appropriate.

---

## 7. Epic 6 Retrospective Follow-Through

The Epic 6 retrospective identified 9 recommendations. Here is how they were addressed in Epic 7:

| # | Recommendation | Status | Notes |
|---|---------------|--------|-------|
| 1 | [CRITICAL] Apply pure function extraction to at least one legacy P0 item | NOT DONE | No P0 items resolved. The seed data epic had no natural connection to legacy test debt. |
| 2 | Resolve TD-033 (public article queries) | NOT DONE | No changes to `convex/articles.ts`. |
| 3 | Update CLAUDE.md feature folder sizes and add notifications folder | NOT DONE | No CLAUDE.md changes during Epic 7. Should be done in epic completion pass. |
| 4 | Continue pure function pattern for complex business logic | DONE | `buildSeedUsers` and `buildReviewerProfiles` exported as pure functions with 15 tests. |
| 5 | Use `hasEditorRole()` instead of raw type assertion | N/A | No editor role gating in seed module (all internal functions). |
| 6 | Follow notifications pattern for new feature folders | N/A | No new feature folders in Epic 7 (backend-only epic). |
| 7 | Add pure function testing pattern to CLAUDE.md | NOT DONE | Should be done in epic completion pass. |
| 8 | Update "Convex Shared Helpers" to mention `hasEditorRole()` | NOT DONE | Should be done in epic completion pass. |
| 9 | Add `app/lib/format-utils.ts` to project documentation | NOT DONE | Should be done in epic completion pass. |

**Assessment:** 1 of 9 recommendations addressed (11%), with 2 classified as N/A. The low follow-through rate is partly explained by Epic 7's nature as a backend-only seed data epic with no frontend work, no new feature folders, and no security-critical code paths. However, the CRITICAL recommendation (#1, resolve legacy P0 items) was not addressed for the third consecutive epic despite being recommended since Epic 5.

**Critical observation:** The test debt recommendations (#1, #2) have now been recommended in 5 consecutive retrospectives (Epics 3 through 7). While Epic 6 demonstrated that pure function extraction makes testing practical (23 tests for `computePaymentBreakdown`) and Epic 7 continued the pattern (15 tests for builder functions), no legacy P0 items have been resolved. The accumulated P0 count has been at 14 for two epics and growing since Epic 1.

---

## 8. Technical Decisions and Their Rationale

### 8.1 `internalAction` instead of public `action`

The story spec called for a public `action` callable via `npx convex run seed:seedData`. The implementation chose `internalAction` instead. This is a security improvement: internal actions cannot be called from the Convex client SDK (only via `npx convex run` or other internal functions). Since the seed action should never be triggered from the frontend, `internalAction` is strictly better.

### 8.2 Explicit typed batch mutations instead of a generic insert helper

Each of the 12 batch mutations (`seedUsers`, `seedSubmissions`, etc.) has identical handler logic (`for..of` loop with `ctx.db.insert`). A generic helper would reduce duplication, but Convex requires explicit validators at the function definition level. Using `v.any()` would violate project conventions and lose type safety. The 12 mutations are co-located in a single file and unlikely to need maintenance, making the duplication acceptable.

### 8.3 No `"use node"` directive

The seed module operates entirely in the default Convex runtime (no Node.js). This is possible because all seed data is static (no LLM calls, no HTTP requests, no file system access). Embedding generation is deferred to the existing `matchingActions.ts` module (which uses `"use node"`). This decision keeps all exports (queries, mutations, action) in a single file, simplifying the module structure.

### 8.4 Content-first approach over programmatic generation

The seed data uses hand-crafted alignment research content rather than programmatically generating it (e.g., via templates or LLM calls at seed time). This makes the seed action deterministic, fast (no API calls), and reliable (no external dependencies). The trade-off is a very large file (2,181 lines), but for a one-time seed module this is acceptable.

---

## 9. Cross-Story Patterns

### Pattern 1: Backend-only epics have different velocity characteristics

Epic 7 is the first backend-only epic. Compared to the full-stack Epics 5-6:

| Characteristic | Full-Stack (Epic 5-6 avg) | Backend-Only (Epic 7) |
|----------------|--------------------------|----------------------|
| Avg story duration | 25.5 min | 29 min |
| Duration spread | 4-5 min | 17 min (18-35 range) |
| New files per story | 3-4 | 0.33 |
| Modified files per story | 3-5 | 1 |
| Lines per story | ~800 | ~1,180 |
| Fix cycles per story | 0.0 | 0.33 |

Backend-only epics are slightly slower on average (more content authoring) with wider variance (7-1 and 7-3 were content-heavy; 7-2 was surgically focused). The reduced file count masks the fact that individual stories produce more lines of code per story.

### Pattern 2: Cumulative seed module growth across stories

| After Story | Lines in seed.ts | Functions | Tables Seeded |
|-------------|-----------------|-----------|---------------|
| 7-1 | 1,892 | ~16 | 12 |
| 7-2 | ~2,000 | ~17 | 12 (+ embedding scheduling) |
| 7-3 | 2,181 | ~20 | 12 (+ discussion replies) |

Each story incrementally extended the same file. Story 7-2 added 108 lines (focused expansion), while Story 7-3 added 212 lines via the fix commit (discussion + audit additions). The cumulative growth pattern worked well here because each story had clear boundaries within the file (7-1: core data, 7-2: reviewer expansion, 7-3: discussions + audit trail).

### Pattern 3: Test authoring velocity scales with function isolation

| Test Target | Tests | Authoring Time (estimated) | Lines per Test |
|-------------|-------|---------------------------|----------------|
| `computePaymentBreakdown` (Epic 6) | 23 | ~5 min (inline with impl) | 12 |
| `buildSeedUsers` (Epic 7) | 5 | ~2 min | 6 |
| `buildReviewerProfiles` (Epic 7) | 10 | ~3 min | 8 |

Pure function tests are consistently fast to write (well under 5 minutes). Story 7-2's 15 tests were part of an 18-minute story, suggesting the tests took ~5 minutes total. This validates the Epic 6 finding that pure function extraction makes testing natural.

---

## 10. Metrics Summary

### Files Created in Epic 7

**Backend (1 file):**
- `convex/seed.ts` -- 2,181 lines: 12 batch internalMutations, `seedEmbeddings` internalMutation, `checkSeeded` internalQuery, `cleanupPartialSeed` internalMutation, `seedData` internalAction, ~8 pure `build*()` functions, constants

**Tests (1 file):**
- `convex/__tests__/seed-reviewers.test.ts` -- 129 lines: 15 tests covering `buildSeedUsers` (5 tests) and `buildReviewerProfiles` (10 tests)

### Files Modified in Epic 7

- `convex/_generated/api.d.ts` -- auto-generated, new seed module exports (trivial)

### Commit Summary

| Commit | Story | Type | Files | Insertions | Deletions |
|--------|-------|------|-------|------------|-----------|
| 8ac61f8 | 7-1 | feat | 6 | 2,318 | 4 |
| d2c31d1 | 7-2 | feat | 6 | 660 | 6 |
| 93827db | 7-3 (fix) | fix | 1 | 212 | 37 |
| ea608c6 | 7-3 (feat) | feat | 4 | 400 | 4 |

**Total:** 4 commits, 11 files changed, 3,547 insertions, 8 deletions (net +3,539 lines)

### Velocity Summary

| Metric | Value |
|--------|-------|
| Stories completed | 3/3 (100%) |
| Total duration | ~88 minutes |
| Average story duration | ~29 minutes |
| Stories per hour | 2.05 |
| Total commits | 4 |
| Average review fix cycles | 0.33 |
| New Convex functions | ~17 (12 batch mutations + seedEmbeddings + checkSeeded + cleanupPartialSeed + seedData + deleteBySubmissionId helper) |
| New frontend components | 0 |
| New route files | 0 |
| New feature folders | 0 |
| Tests added | 15 |
| Tests passing | 111/111 |
| P0 tech debt items (total open) | 14 |

### Cumulative Project Metrics (End of Epic 7)

| Metric | Value |
|--------|-------|
| Total stories completed | 28 (4+4+7+4+3+3+3) |
| Total implementation time | ~877 minutes (~14.6 hours) |
| Total commits | 55 |
| Total Convex functions | ~66 |
| Total frontend components | ~53 (unchanged) |
| Total feature folders | 7 (unchanged) |
| Total tests | 111 |
| Total test files | 7 |
| Total P0 tech debt | 14 |

---

## 11. CLAUDE.md Recommendations

Based on patterns established in Epic 7, the following updates should be made to CLAUDE.md:

### Root `CLAUDE.md`

**Add "Seed Data Module" to "Convex Shared Helpers" section:**
```
- `convex/seed.ts` - Seed data module: `seedData` internalAction (run via `npx convex run seed:seedData`), `build*()` pure functions for data definitions, typed batch `seed*` internalMutations, three-state idempotency check
```

**Update "Pure Function Testing Pattern" section (if added per Epic 6 recommendation):**
Add the seed builder functions as a second example:
```
- Example: `buildSeedUsers` and `buildReviewerProfiles` in `convex/seed.ts` -- pure data definition functions exported for testing, covered by 15 unit tests in `convex/__tests__/seed-reviewers.test.ts`
```

**Update "Vitest Projects Config" subsection:**
Update test file count to reflect the new test file:
```
7 test files with 111 passing tests
```

**Outstanding CLAUDE.md updates from Epic 6 (still not done):**
1. Update "Feature Folder Pattern" established folder sizes: `app/features/editor/` (15 files), `app/features/review/` (15 files), add `app/features/notifications/` (3 files), add `app/features/article/` (3 files)
2. Add "Pure Function Testing Pattern" subsection documenting the `computePaymentBreakdown` pattern
3. Update "Convex Shared Helpers" to mention `convex/helpers/roles.ts` and `hasEditorRole()` helper
4. Add `app/lib/format-utils.ts` as a shared utility location

### `convex/CLAUDE.md`

**Add "Seed Data Module" section:**
Document the seed module architecture: `internalAction` orchestrator calling typed `internalMutation` batch inserts in dependency order, `build*()` pure functions for data definitions, three-state idempotency, `cleanupPartialSeed` for failed runs. Note that all seed functions are internal-only (no client access).

---

## 12. Recommendations for Future Work

### Immediate (CLAUDE.md / Documentation)

1. **Apply all outstanding CLAUDE.md updates.** There are now 6+ pending CLAUDE.md updates from Epics 6-7 retrospectives. These should be applied in the next documentation pass to keep the project instructions accurate.

2. **Mark Epic 7 ATDD checklists as checked.** Stories 7-1 and 7-2 checklists have all items unchecked despite passing verification. Update for consistency with Story 7-3 (which has all items checked).

### Technical Debt

3. **[CRITICAL] Resolve at least 2 legacy P0 items.** This recommendation has been made in every retrospective since Epic 3. The pure function extraction pattern is now proven across 2 epics (38 tests total). Recommended targets unchanged from Epic 6:
   - TD-010 (auth wrappers, carried 7 epics): Extract role-checking logic as pure functions
   - TD-033 (public article queries, carried 3 epics): Test the status filter security boundary via pure function extraction
   - TD-013 (triage safety, carried 6 epics): `sanitizeResult` and backoff formula are near-pure

4. **If the seed module requires future maintenance, consider splitting data from infrastructure.** Extract `build*()` functions into `convex/seedData.ts` (pure functions, testable) and keep Convex functions in `convex/seed.ts` (infrastructure). This would reduce the main file from 2,181 lines to approximately 600 lines of infrastructure + 1,500 lines of data definitions.

### Process

5. **Standardize ATDD checklist completion.** Either all checklists should be checked (`[x]`) upon verification or none should be. The current inconsistency (some stories checked, some not) undermines the checklists' value as verification artifacts.

6. **Continue the pure function testing pattern.** Two consecutive epics (6-7) have successfully applied this pattern, producing 38 tests across 2 test files. Any future Convex module with extractable business logic should follow the same approach. The pattern has proven to be the project's most effective testing strategy.

---

**Generated:** 2026-02-08
**Analyst:** Retrospective Agent (claude-opus-4-6)
