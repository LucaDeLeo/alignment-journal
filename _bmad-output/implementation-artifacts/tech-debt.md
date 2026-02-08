# Tech Debt Registry

## TD-001: Error stack exposed in production error component
- **Story:** 1-1-initialize-project-with-tech-stack
- **File:** `app/router.tsx:35`
- **Severity:** Low
- **Description:** `defaultErrorComponent` renders `err.error.stack` directly, which exposes stack traces in production. Replace with a user-friendly error boundary that only shows stack traces in development.
- **Suggested fix:** Wrap in `import.meta.env.DEV` check or create a proper `ErrorComponent`.

## TD-002: `import.meta` cast to `any` in router
- **Story:** 1-1-initialize-project-with-tech-stack
- **File:** `app/router.tsx:9`
- **Severity:** Low
- **Description:** `(import.meta as any).env.VITE_CONVEX_URL!` casts away type safety. Vite provides proper types for `import.meta.env`. Investigate if this is needed for TanStack Start SSR or if it can be simplified to `import.meta.env.VITE_CONVEX_URL`.

## TD-004: users.ts returns validator duplicates schema shape
- **Story:** 1-2-define-data-schema-and-core-helpers
- **File:** `convex/users.ts:12-29`
- **Severity:** Low
- **Description:** The `getByClerkId` internal query manually defines a `returns` validator that mirrors the `users` table schema. If the users schema changes (e.g., new fields), this validator must be updated in sync. Convex does not provide a `v.doc("users")` shorthand, so this is the current best practice, but it's a maintenance risk.
- **Suggested fix:** When Convex adds document-level validators, migrate to that. Until then, consider extracting the user validator shape into a shared const.

## TD-003: site.webmanifest has empty name fields
- **Story:** 1-1-initialize-project-with-tech-stack
- **File:** `public/site.webmanifest`
- **Severity:** Low
- **Description:** `name` and `short_name` fields are empty strings. Should be set to "Alignment Journal".
