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

## TD-011: No component test infrastructure
- **Story:** Epic 1 retrospective (spans 1-3-AC4, 1-3-AC5, 1-4-AC5)
- **Location:** `vitest.config.ts`
- **Severity:** P1
- **Description:** There is no component test renderer configured (jsdom or happy-dom). Component-level tests cannot be written for `RoleBadge`, `RoleSwitcher`, `ErrorBoundary`, or `CommandPalette` without first setting up the infrastructure.
- **Impact:** Frontend components have no automated verification. Error boundary behavior, environment-conditional rendering (role switcher), and auth UI components are untested.
- **Fix:** Install `happy-dom` (or `jsdom`) and configure Vitest's `environment` option for component test files. Use a convention like `*.component.test.ts` or a separate test directory.
- **Priority:** P1 -- Address during Epic 2
- **Status:** Open. Identified 2026-02-08 during Epic 1 retrospective.

## TD-012: No code coverage reporting configured
- **Story:** Epic 1 retrospective
- **Location:** `vitest.config.ts`
- **Severity:** P2
- **Description:** Vitest coverage plugin (`@vitest/coverage-v8`) is not installed. There is no visibility into line, branch, or function coverage. This makes it harder to identify untested code paths and set coverage gates.
- **Fix:** Install `@vitest/coverage-v8` and configure minimum thresholds in `vitest.config.ts`.
- **Priority:** P2
- **Status:** Open. Identified 2026-02-08 during Epic 1 retrospective.
