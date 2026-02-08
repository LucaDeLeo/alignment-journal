# Epic 2 Tech Debt Fixes

**Date:** 2026-02-08
**Epic:** 2 (Author Submission Pipeline)

## Summary

| Metric | Count |
|--------|-------|
| Items from registry | 3 (TD-010, TD-011, TD-012) |
| Items fixed | 2 (TD-011, TD-012) |
| Items skipped | 1 (TD-010 -- P0, requires Convex test harness with mocked context, out of scope for this pass) |
| Additional code quality fixes | 3 |
| Files changed | 6 |
| Typecheck | PASS |
| Lint | PASS |
| Tests | 52/52 PASS |

## Registry Items

### TD-011: No component test infrastructure [RESOLVED]

- **Priority:** P1
- **What was done:** Installed `happy-dom` (v20.5.0) and configured Vitest with the `projects` API (replacing the deprecated `environmentMatchGlobs`). Two test projects defined:
  - `unit`: runs `app/**/*.test.ts` and `convex/__tests__/**/*.test.ts` under Node environment
  - `component`: runs `app/**/*.test.tsx` under happy-dom environment
- **Files changed:**
  - `/Users/luca/dev/alignment-journal/vitest.config.ts` -- added `projects` config
  - `/Users/luca/dev/alignment-journal/package.json` -- added `happy-dom` devDependency

### TD-012: No code coverage reporting configured [RESOLVED]

- **Priority:** P2
- **What was done:** Installed `@vitest/coverage-v8@3.2.4` (matching vitest 3.2.4) and configured the `coverage` block in `vitest.config.ts` with:
  - Provider: v8
  - Includes: `app/**/*.{ts,tsx}`, `convex/**/*.ts`
  - Excludes: generated files (`app/routeTree.gen.ts`, `convex/_generated/**`), test files, type declarations
- **Usage:** Run `bun run test -- --coverage` to generate coverage reports.
- **Files changed:**
  - `/Users/luca/dev/alignment-journal/vitest.config.ts` -- added `coverage` config
  - `/Users/luca/dev/alignment-journal/package.json` -- added `@vitest/coverage-v8` devDependency

### TD-010: Auth/RBAC wrappers have zero automated test coverage [SKIPPED]

- **Priority:** P0
- **Reason for skipping:** This item requires writing integration tests with a mocked Convex function context (`QueryCtx`, `MutationCtx`, `ActionCtx`) and mocked Clerk identity. The Convex testing patterns for mocking `ctx.auth.getUserIdentity()`, `ctx.db.query()`, `ctx.db.patch()`, and `ctx.runQuery()` are non-trivial and require a dedicated testing harness (e.g., `convex-test`). This is better addressed as a focused testing story rather than a debt-fix pass.
- **Recommendation:** Create a dedicated story in the next sprint to write auth wrapper tests using `convex-test` or manual mocks.

## Additional Code Quality Fixes

### Fix 1: Duplicated PASS_DISPLAY_NAMES constant

- **Issue:** `PASS_DISPLAY_NAMES` (pass name to display label mapping) and `PASS_ORDER` (canonical ordering) were defined independently in both `triage-progress.tsx` and `triage-display.tsx`.
- **Fix:** Extracted both constants to a new shared module `app/features/submissions/triage-constants.ts`. Both consumer files now import from the shared module.
- **Files changed:**
  - `/Users/luca/dev/alignment-journal/app/features/submissions/triage-constants.ts` (new)
  - `/Users/luca/dev/alignment-journal/app/features/submissions/triage-progress.tsx`
  - `/Users/luca/dev/alignment-journal/app/features/submissions/triage-display.tsx`

### Fix 2: Duplicated triage access check functions

- **Issue:** `assertTriageAccess` (for `QueryCtx`) and `assertTriageAccessMut` (for `MutationCtx`) in `convex/triage.ts` contained nearly identical logic. The only differences were the context type parameter and that the mutation variant returned the submission document while the query variant returned `void`.
- **Fix:** Consolidated into a single generic function `assertTriageAccess<TCtx extends QueryCtx>` that works with both context types and always returns the submission document. Also extracted the duplicated `privilegedRoles` array into a module-level `TRIAGE_PRIVILEGED_ROLES` constant.
- **Files changed:**
  - `/Users/luca/dev/alignment-journal/convex/triage.ts`

### Fix 3: Inconsistent string quoting in db.get/db.patch calls

- **Issue:** `convex/triage.ts` used double-quoted strings for table names in `ctx.db.get("submissions", ...)` and `ctx.db.patch("submissions", ...)`, while the rest of the codebase consistently uses single quotes.
- **Fix:** Changed all double-quoted table name arguments to single quotes for consistency with the project style.
- **Files changed:**
  - `/Users/luca/dev/alignment-journal/convex/triage.ts`

## Verification

All verification checks pass after fixes:

```
$ bun run typecheck  # tsc --noEmit -- PASS
$ bun run lint       # eslint .     -- PASS
$ bun run test       # vitest run   -- 52/52 tests PASS
```
