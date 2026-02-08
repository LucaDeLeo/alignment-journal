# Tech Debt Registry

## TD-001: Error stack exposed in production error component
- **Story:** 1-1-initialize-project-with-tech-stack
- **File:** `app/router.tsx:35`
- **Severity:** Low
- **Description:** `defaultErrorComponent` renders `err.error.stack` directly, which exposes stack traces in production. Replace with a user-friendly error boundary that only shows stack traces in development.
- **Suggested fix:** Wrap in `import.meta.env.DEV` check or create a proper `ErrorComponent`.
- **Status:** Resolved 2026-02-08. Wrapped stack trace in `import.meta.env.DEV` conditional; production shows generic error message.

## TD-002: `import.meta` cast to `any` in router
- **Story:** 1-1-initialize-project-with-tech-stack
- **File:** `app/router.tsx:9`
- **Severity:** Low
- **Description:** `(import.meta as any).env.VITE_CONVEX_URL!` casts away type safety. Vite provides proper types for `import.meta.env`. Investigate if this is needed for TanStack Start SSR or if it can be simplified to `import.meta.env.VITE_CONVEX_URL`.
- **Status:** Resolved 2026-02-08. Removed `(import.meta as any)` cast; using `import.meta.env.VITE_CONVEX_URL` directly with Vite's built-in types.

## TD-004: users.ts returns validator duplicates schema shape
- **Story:** 1-2-define-data-schema-and-core-helpers
- **File:** `convex/users.ts:12-29`
- **Severity:** Low
- **Description:** The `getByClerkId` internal query manually defines a `returns` validator that mirrors the `users` table schema. If the users schema changes (e.g., new fields), this validator must be updated in sync. Convex does not provide a `v.doc("users")` shorthand, so this is the current best practice, but it's a maintenance risk.
- **Suggested fix:** When Convex adds document-level validators, migrate to that. Until then, consider extracting the user validator shape into a shared const.
- **Status:** Deferred. Added code comment in `convex/users.ts` documenting the duplication and intended migration path. Will resolve when Convex ships `v.doc()` or equivalent.

## TD-003: site.webmanifest has empty name fields
- **Story:** 1-1-initialize-project-with-tech-stack
- **File:** `public/site.webmanifest`
- **Severity:** Low
- **Description:** `name` and `short_name` fields are empty strings. Should be set to "Alignment Journal".
- **Status:** Resolved 2026-02-08. Set both `name` and `short_name` to "Alignment Journal".

## TD-005: ErrorBoundary custom fallback cannot reset
- **Story:** 1-4-app-shell-routing-and-design-system-foundation (ErrorBoundary)
- **Location:** `app/components/error-boundary.tsx:38-39`
- **Issue:** The `fallback` prop is typed as `React.ReactNode`. When a custom fallback is provided, the `handleReset` method is inaccessible, so the error boundary stays in an error state permanently.
- **Impact:** Any consumer using a custom fallback creates a dead-end error UI with no recovery path. Currently no consumer passes a custom fallback, but the API is a trap for future usage.
- **Fix:** Change `fallback` to a render function `(props: { onReset: () => void }) => ReactNode` or add a separate `fallbackRender` prop.
- **Priority:** P2
- **Status:** Resolved 2026-02-08. Changed `fallback` prop type to `(props: { onReset: () => void; error: Error | null }) => React.ReactNode`. Custom fallbacks now receive `onReset` and `error` via render function arguments.

## TD-006: ROLES constant duplicated across 3 files
- **Story:** 1-4-app-shell-routing-and-design-system-foundation (DRY violation)
- **Location:** `app/components/command-palette.tsx:34-40`, `app/features/auth/role-switcher.tsx:16-22`, `app/features/auth/role-badge.tsx:5-11`
- **Issue:** Three files define the same role value-to-label mapping independently.
- **Impact:** Adding or renaming a role requires updating three files in sync. Easy to miss one and create inconsistency.
- **Fix:** Extract a shared `ROLE_OPTIONS` constant (with value and label) to `app/features/auth/constants.ts` and import in all three files.
- **Priority:** P2
- **Status:** Resolved 2026-02-08. Created `app/features/auth/constants.ts` with `ROLE_OPTIONS` and `ROLE_DISPLAY_NAMES`. All three consumer files now import from the shared module.

## TD-007: CommandPaletteTrigger uses synthetic KeyboardEvent
- **Story:** 1-4-app-shell-routing-and-design-system-foundation (fragile coupling)
- **Location:** `app/routes/__root.tsx:169-175`
- **Issue:** The header search trigger dispatches a fake `KeyboardEvent('keydown', { key: 'k', metaKey: true })` to toggle the command palette, relying on event bubbling to reach the palette's document listener.
- **Impact:** Any event handler calling `stopPropagation` on keydown events would silently break the trigger. The pattern is non-obvious to future developers.
- **Fix:** Lift the `open` state to a shared context or pass a toggle callback from CommandPalette.
- **Priority:** P2
- **Status:** Resolved 2026-02-08. Lifted `open` state to `AuthenticatedHeader`. CommandPalette now receives `open`/`onOpenChange` as props. CommandPaletteTrigger receives an `onToggle` callback. Synthetic KeyboardEvent dispatch removed.

## TD-008: Type assertion in role-based route guards
- **Story:** 1-4-app-shell-routing-and-design-system-foundation (type safety)
- **Location:** `app/routes/editor/route.tsx:29`, `app/routes/review/route.tsx:29`, `app/routes/submit/route.tsx:29`, `app/routes/admin/route.tsx:29`
- **Issue:** `ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])` casts away TypeScript's strict narrowing on `.includes()`.
- **Impact:** If a new role is added to the schema, the cast hides the fact that it is not handled in any route guard.
- **Fix:** Create a type-safe `hasRole(role: string, allowed: ReadonlyArray<string>): boolean` utility that uses proper type narrowing.
- **Priority:** P3
- **Status:** Resolved 2026-02-08. Created `hasRole()` utility in `app/features/auth/constants.ts`. All four route guards updated to use `hasRole(user.role, ALLOWED_ROLES)` without type assertions.

## TD-009: Kbd component lacks platform detection
- **Story:** 1-4-app-shell-routing-and-design-system-foundation (accessibility)
- **Location:** `app/routes/__root.tsx:181`, `app/components/ui/kbd.tsx`
- **Issue:** The Kbd trigger always displays the Mac modifier symbol. Windows/Linux users see an unfamiliar character.
- **Impact:** Minor UX confusion for non-Mac users. Does not affect functionality since the cmd+K listener correctly checks both `metaKey` and `ctrlKey`.
- **Fix:** Add platform detection (e.g., `navigator.userAgentData?.platform` or `navigator.platform`) and render `Ctrl+K` on non-Mac platforms.
- **Priority:** P3
- **Status:** Resolved 2026-02-08. Added `useIsMac()` hook in `__root.tsx` using `navigator.platform` with `navigator.userAgentData` fallback. CommandPaletteTrigger now renders `Ctrl+K` on non-Mac platforms.

<!-- Added from Epic 1 retrospective -->

## TD-010: Auth/RBAC wrappers have zero automated test coverage
- **Story:** Epic 1 retrospective (spans 1-2-AC4, 1-3-AC1, 1-3-AC3, 1-3-AC6)
- **Location:** `convex/helpers/auth.ts`, `convex/users.ts`
- **Severity:** P0
- **Description:** The auth wrappers (`withUser`, `withRole`, `withAuthor`, `withEditor`, `withAdmin`, `withReviewer`, `withActionEditor`) and user management mutations (`ensureUser`, `updateRole`, `switchRole`) are the security boundary for the entire application. They have zero automated tests. The `switchRole` production guard (which checks `DEMO_ROLE_SWITCHER` env var to prevent role self-escalation) is also untested.
- **Impact:** Regressions to the RBAC system would be undetected. A code change could silently remove the production safety check, enabling any authenticated user to self-escalate to admin.
- **Root cause:** Story 1-2 deferred auth wrapper tests to Story 1-3. Story 1-3 did not include the deferred tests in its task breakdown -- the obligation was dropped.
- **Fix:** Create `convex/__tests__/auth.test.ts` and `convex/__tests__/users.test.ts` with mocked Convex context and Clerk identity. Test all wrapper variants for both success and rejection paths. Test ensureUser (creation, idempotency, default role), updateRole (admin enforcement), switchRole (env var guard).
- **Priority:** P0 -- Must resolve before Epic 2 feature work
- **Status:** Open. Identified 2026-02-08 during Epic 1 retrospective. Quality gate FAIL is driven by this gap.

## TD-011: No component test infrastructure [RESOLVED]
- **Story:** Epic 1 retrospective (spans 1-3-AC4, 1-3-AC5, 1-4-AC5)
- **Location:** `vitest.config.ts`
- **Severity:** P1
- **Description:** There is no component test renderer configured (jsdom or happy-dom). Component-level tests cannot be written for `RoleBadge`, `RoleSwitcher`, `ErrorBoundary`, or `CommandPalette` without first setting up the infrastructure.
- **Impact:** Frontend components have no automated verification. Error boundary behavior, environment-conditional rendering (role switcher), and auth UI components are untested.
- **Resolution:** Installed `happy-dom` and configured Vitest with `projects` to run `app/**/*.test.tsx` files under `happy-dom` environment and all other tests under `node`. Component tests can now be authored.
- **Resolved:** 2026-02-08 (Epic 2 completion)

## TD-012: No code coverage reporting configured [RESOLVED]
- **Story:** Epic 1 retrospective
- **Location:** `vitest.config.ts`
- **Severity:** P2
- **Description:** Vitest coverage plugin (`@vitest/coverage-v8`) is not installed. There is no visibility into line, branch, or function coverage. This makes it harder to identify untested code paths and set coverage gates.
- **Resolution:** Installed `@vitest/coverage-v8@3.2.4` and configured coverage provider in `vitest.config.ts` with source includes/excludes. Run `bun run test -- --coverage` to generate reports.
- **Resolved:** 2026-02-08 (Epic 2 completion)

<!-- Added from Epic 2 retrospective -->

## TD-013: Zero P0 test coverage for triage safety mechanisms
- **Story:** Epic 2 retrospective (spans 2-3:AC4, 2-3:AC5, 2-3:AC7)
- **Location:** `convex/triage.ts`
- **Severity:** P0
- **Description:** The triage pipeline's three critical safety mechanisms have zero automated test coverage: (1) `writeResult` mutation's idempotency guard (idempotencyKey index lookup, no-op when status is "complete"), (2) bounded exponential backoff retry logic (attempt counting, delay calculation `1000 * Math.pow(2, attempt - 1)`, terminal failure at attempt 3 via `markFailed`), and (3) external API response sanitization (`sanitizeResult`, `truncateLlmField` with MAX_LLM_FIELD_LENGTH=5000, sanitized `lastError` strings).
- **Impact:** Data integrity risk (duplicate triage writes), reliability risk (uncontrolled retries), and security risk (raw API errors or stack traces leaking to clients).
- **Fix:** Extract `sanitizeResult`, `truncateLlmField`, and the backoff delay formula as pure functions if not already. Write unit tests for: writeResult idempotency (duplicate calls with same key no-op), markFailed terminal state guard, sanitizeResult/truncateLlmField output, and backoff delay calculation. Integration tests for writeResult mutation with mocked Convex context.
- **Priority:** P0 -- Must resolve before Epic 3 feature work
- **Status:** Open. Identified 2026-02-08 during Epic 2 retrospective. Quality gate FAIL is driven by this gap.

## TD-014: Zero integration tests for submission mutations/queries
- **Story:** Epic 2 retrospective (spans 2-1:AC5, 2-2:AC1)
- **Location:** `convex/submissions.ts`, `convex/storage.ts`
- **Severity:** P0
- **Description:** The submission backend functions (`submissions.create`, `submissions.getById`, `submissions.listByAuthor`, `storage.generateUploadUrl`) have zero integration tests. Auth enforcement via `withAuthor`/`withUser` wrappers, ownership checks in `getById`, and server-side Convex validators are all unverified. The `getById` ownership check is the data access boundary preventing cross-user submission leaks.
- **Impact:** Auth bypass risk (withAuthor enforcement unverified), data leak risk (ownership check in getById unverified).
- **Fix:** Write integration tests with mocked Convex context (`QueryCtx`, `MutationCtx`) and mocked Clerk identity. Test: create mutation auth enforcement, getById ownership check (NOT_FOUND/UNAUTHORIZED errors), listByAuthor index usage and projection, generateUploadUrl auth check.
- **Priority:** P0 -- Must resolve before Epic 3 feature work
- **Status:** Open. Identified 2026-02-08 during Epic 2 retrospective.

## TD-015: Zero component tests despite infrastructure being ready
- **Story:** Epic 2 retrospective (spans all Epic 2 frontend components)
- **Location:** `app/features/submissions/` (11 components)
- **Severity:** P1
- **Description:** The component test infrastructure was set up during the Epic 2 debt-fix pass (TD-011: happy-dom + Vitest projects config), but zero component tests were written across all 4 stories. There are 11 frontend components in `app/features/submissions/` with no component-level verification. This is a tooling-without-adoption pattern.
- **Impact:** Frontend components have no automated verification. Form validation behavior, conditional rendering, and error states are untested.
- **Fix:** Write at least one proof-of-concept component test (recommended: `TriageReportCard` or `StatusTimeline` -- relatively simple with deterministic rendering) to establish the import pattern, mock setup, and assertion style for future component tests.
- **Priority:** P1 -- Address during Epic 3 debt-fix pass
- **Status:** Open. Identified 2026-02-08 during Epic 2 retrospective.

## TD-016: startTriage and startTriageInternal share duplicated logic
- **Story:** 2-3-pdf-text-extraction-and-triage-orchestration
- **Location:** `convex/triage.ts`
- **Severity:** P2
- **Description:** The `startTriage` (public mutation) and `startTriageInternal` (internal mutation) functions share duplicated triage initialization logic (creating 4 pending triageReport records, transitioning submission status to TRIAGING, scheduling the first triage action). Changes to initialization logic must be made in two places.
- **Fix:** Extract shared triage initialization into a helper function called by both `startTriage` and `startTriageInternal`.
- **Priority:** P2 -- Address when convenient
- **Status:** Open. Identified 2026-02-08 during Epic 2 retrospective.

## TD-017: listForEditor pagination order mismatch with display sort
- **Story:** 3-1-editor-pipeline-dashboard
- **Location:** `convex/submissions.ts:252-267`
- **Severity:** P2
- **Description:** The `listForEditor` query paginates using the default `_creationTime` index order but then re-sorts each page by `updatedAt` descending for display. This means pagination boundaries are based on creation time while the user sees an `updatedAt` sort. Items recently updated but created long ago appear on later pages, and items can appear to "jump" between pages after status changes.
- **Fix:** Add a `by_updatedAt` index (and a composite `by_status_updatedAt` index for filtered queries) to the `submissions` table schema and paginate on that index directly. This eliminates the per-page re-sort.
- **Priority:** P2 -- Address when pagination UX becomes a user-reported issue
- **Status:** Open. Identified 2026-02-08 during code review.

## TD-018: Date.now() in Convex query makes overdue calculation non-deterministic
- **Story:** 3-1-editor-pipeline-dashboard
- **Location:** `convex/submissions.ts:288-292`
- **Severity:** P2
- **Description:** The `listForEditor` query uses `Date.now()` to compute the overdue flag for reviewer indicators. Convex queries should ideally be deterministic. The overdue flag won't update as time passes unless data changes trigger a reactive re-evaluation. Overdue badges can go stale for static submissions.
- **Fix:** Move the overdue calculation client-side (pass `createdAt` from each review in the summary, compute overdue in the UI), or materialize a derived `isOverdue` field via scheduled mutations.
- **Priority:** P2 -- Address when real-time overdue accuracy becomes important
- **Status:** Open. Identified 2026-02-08 during code review.

## TD-019: N+1 query pattern in listForEditor enrichment
- **Story:** 3-1-editor-pipeline-dashboard
- **Location:** `convex/submissions.ts:271-302`
- **Severity:** P2
- **Description:** For each submission in the paginated page (25 items), the query runs 2 additional sub-queries (reviews + triageReports), totaling 50 additional reads per page load. This is acceptable at prototype scale (<100 submissions) but will degrade as data grows.
- **Fix:** Denormalize reviewer summary and triage severity onto the `submissions` table (updated by mutations that create/update reviews and triage reports), or create a separate summary table.
- **Priority:** P2 -- Address before production scale
- **Status:** Open. Identified 2026-02-08 during code review.
