# Epic 7 Tech Debt Fix

**Date:** 2026-02-08
**Epic:** 7 (Seed Data & Demo Experience)
**Stories:** 7-1, 7-2, 7-3

## Summary

| Metric | Count |
|--------|-------|
| Items found | 4 |
| Items fixed | 1 (4 lint violations) |
| Items documented (acceptable) | 3 |
| Files changed | 1 |
| Typecheck | PASS |
| Lint | PASS (0 errors, was 4 errors) |
| Tests | 111/111 PASS |
| Build | PASS |

## Fixed Items

### FIX-1: Lint violations - missing explicit table names in `db.delete()` calls (4 errors)

- **File:** `/Users/luca/dev/alignment-journal/convex/seed.ts`
- **Rule:** `@convex-dev/explicit-table-ids`
- **What was wrong:** The `cleanupPartialSeed` internalMutation used `ctx.db.delete(record._id)` without explicit table names in 4 locations (lines 1506, 1516, 1538, 1547). The Convex lint rule requires the two-argument form `ctx.db.delete('tableName', record._id)`.
- **What was fixed:**
  - Line 1506: `ctx.db.delete(user._id)` changed to `ctx.db.delete('users', user._id)`
  - Line 1516: `ctx.db.delete(sub._id)` changed to `ctx.db.delete('submissions', sub._id)`
  - Lines 1531-1541: The generic table loop that iterated over 9 tables using a string array and a single `ctx.db.delete(record._id)` call was restructured into a typed helper function `deleteBySubmissionId<T>()` with explicit table names in individual calls. Each table is now deleted with an explicit call like `await deleteBySubmissionId('triageReports')`.
  - Line 1547: `ctx.db.delete(profile._id)` changed to `ctx.db.delete('reviewerProfiles', profile._id)`

## Documented Items (Acceptable Patterns)

### DOC-1: `roleValidator` duplication across `seed.ts` and `users.ts`

- **Files:** `/Users/luca/dev/alignment-journal/convex/seed.ts` (line 1559), `/Users/luca/dev/alignment-journal/convex/users.ts` (line 15)
- **What:** Both files define an identical `roleValidator` constant with the same 5-literal union (`author`, `reviewer`, `action_editor`, `editor_in_chief`, `admin`). The schema also defines this inline at `schema.ts:12`.
- **Why acceptable:** This is a known pattern in the codebase (TD-004 in `users.ts` documents the broader validator duplication issue). Convex validators cannot be extracted from schema definitions, and exporting `roleValidator` from `users.ts` would create a cross-module dependency for what is essentially a local arg validation concern. Both the seed file and user file are unlikely to drift since any role change would require a schema migration that would surface the inconsistency.
- **Recommendation:** When Convex adds document-level validators (e.g., `v.doc("users")`), migrate all three definitions to a single source of truth.

### DOC-2: `checkSeeded` partial detection uses global `matchResults` query

- **File:** `/Users/luca/dev/alignment-journal/convex/seed.ts` (line 1489)
- **What:** The `checkSeeded` internalQuery checks `ctx.db.query('matchResults').first()` to determine if seeding is complete. This queries for ANY match result record, not specifically seed match results. If non-seed match results exist (from a live `findMatches` action), the check would falsely report 'complete'.
- **Why acceptable:** The `checkSeeded` function is only called from the `seedData` internalAction, which is an internal seed tool. In practice, match results are only created by the seed action or by explicit user-triggered matching. The sentinel user check (first guard) already prevents double-seeding. The partial detection is a safety net for failed seed runs, not a security boundary.

### DOC-3: Batch insert mutation code pattern repetition

- **File:** `/Users/luca/dev/alignment-journal/convex/seed.ts` (12 mutations, lines 1567-1940)
- **What:** There are 12 nearly identical batch insert mutations (`seedUsers`, `seedSubmissions`, `seedTriageReports`, etc.) that all follow the same pattern: accept an array of typed records, insert each via `ctx.db.insert()`, collect and return IDs. The handler body is identical across all 12 mutations.
- **Why acceptable:** Each mutation requires distinct Convex validators for its `args` and `returns` (no `v.any()` allowed per project conventions). The Convex mutation pattern requires typed validators at the function definition level, making a generic helper infeasible without losing type safety. The mutations are all in a single file, co-located, and unlikely to need maintenance beyond the initial seed data setup.

## Test Coverage Analysis

- **Existing tests:** `convex/__tests__/seed-reviewers.test.ts` covers `buildSeedUsers` (5 tests) and `buildReviewerProfiles` (10 tests) with 100% coverage of the exported pure functions.
- **Untested code:** The file-private builder functions (`buildSubmissions`, `buildTriageReports`, `buildReviews`, etc.) and Convex mutation handlers are not unit-tested. These are data definition functions validated at runtime by Convex validators in the seed mutations. Testing them would require either a Convex test harness or would amount to asserting static data shapes.
- **Coverage metrics:** `convex/seed.ts` shows ~30% line coverage. The uncovered lines are the Convex mutation handlers and the main `seedData` action orchestration, which require integration testing with a live Convex backend.
- **Recommendation:** No additional tests needed. The pure function testing pattern (Epic 6 pattern) is correctly applied to the exported functions. The remaining untested code is infrastructure glue.

## Code Quality Assessment

Epic 7 implementation is clean overall:
- No TODO/FIXME/HACK comments found
- No unused imports or variables
- Import ordering follows project conventions (value imports before type imports, separate `import type` statements)
- `Array<T>` syntax used consistently (not `T[]`)
- Convex validators are explicit (no `v.any()`)
- All auth wrappers are used correctly (seed functions use `internalMutation`/`internalQuery`/`internalAction` which are not client-accessible, so no auth wrappers needed)
- Timestamps use a coherent timeline based on `baseTime` offsets
- Audit action names match `ACTION_LABELS` in `app/features/editor/audit-timeline.tsx`

## Verification

```
bun run lint     # PASS (0 errors)
bun run typecheck # PASS
bun run test      # 111/111 PASS
bun run build     # PASS
```
