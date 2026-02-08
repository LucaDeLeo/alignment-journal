# Story 1.2: Define Data Schema and Core Helpers

## Story

**As a** developer,
**I want** the complete Convex schema, editorial state machine, error codes, and RBAC helper wrappers defined,
**So that** all subsequent stories have a typed data layer and security boundary to build on.

## Status

**Epic:** 1 - Project Foundation & Authentication
**Status:** ready
**Priority:** Highest (blocks all stories that touch Convex functions)
**Depends on:** Story 1.1 (project initialized with tech stack)

## Context

This story defines the entire data model and foundational backend infrastructure for the Alignment Journal platform. Every subsequent story depends on these definitions: the schema defines all tables, the state machine governs the editorial pipeline, the error codes standardize failure handling, and the RBAC wrappers enforce security at every endpoint.

The architecture mandates a single `convex/schema.ts` file defining all tables, indexes, and validators. All Convex functions must define both `args` and `returns` validators. Role-gated wrappers enforce Clerk JWT authentication and role-based access at the data layer.

**Key architectural references:**
- Schema: architecture.md "Data Architecture" section
- State machine: architecture.md "Editorial State Machine" transition map
- Error codes: architecture.md "Error Handling" section (10 typed codes)
- RBAC wrappers: architecture.md "Authentication & Security" section
- Naming conventions: architecture.md "Naming Patterns" section

## Acceptance Criteria

### AC1: Complete Convex schema defined
**Given** the project with Convex configured
**When** `convex/schema.ts` is created with all tables
**Then:**
- The `users` table is defined with fields: `clerkId` (string, indexed), `email` (string), `name` (string), `affiliation` (string), `role` (union of "author" | "reviewer" | "action_editor" | "editor_in_chief" | "admin"), `createdAt` (number)
- The `submissions` table is defined with fields: `authorId` (id reference to users), `title` (string), `authors` (`v.array(v.object({ name: v.string(), affiliation: v.string() }))`), `abstract` (string), `keywords` (array of strings), `status` (union of all editorial states), `pdfStorageId` (optional id reference to _storage), `pdfFileName` (optional string), `pdfFileSize` (optional number), `actionEditorId` (optional id reference to users), `assignedAt` (optional number), `decisionNote` (optional string), `publicConversation` (optional boolean for FR35), `createdAt` (number), `updatedAt` (number)
- Indexes on `submissions`: `by_authorId`, `by_status`, `by_actionEditorId`
- The `triageReports` table is defined with fields: `submissionId` (id reference to submissions), `triageRunId` (string), `passName` (union of "scope" | "formatting" | "citations" | "claims"), `status` (union of "pending" | "running" | "complete" | "failed"), `idempotencyKey` (string, indexed), `attemptCount` (number), `result` (`v.optional(v.object({ finding: v.string(), severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")), recommendation: v.string() }))`), `lastError` (optional string), `completedAt` (optional number), `createdAt` (number)
- Index on `triageReports`: `by_submissionId`, `by_idempotencyKey`
- The `reviewerProfiles` table is defined with fields: `userId` (id reference to users, indexed), `researchAreas` (array of strings), `publications` (`v.array(v.object({ title: v.string(), venue: v.string(), year: v.number() }))`), `embedding` (optional `v.array(v.float64())` for vector search), `createdAt` (number), `updatedAt` (number)
- Vector index on `reviewerProfiles`: `by_embedding` on `embedding` field (dimensions: 1536 for text-embedding-3-small). Note: Convex vector indexes support dimensions up to 4096; text-embedding-3-large (3072) could be used, but 1536 (text-embedding-3-small) is chosen for cost/performance balance.
- The `reviews` table is defined with fields: `submissionId` (id reference to submissions), `reviewerId` (id reference to users), `sections` (object with summary/strengths/weaknesses/questions/recommendation as optional strings), `status` (union of "assigned" | "in_progress" | "submitted" | "locked"), `revision` (number for optimistic concurrency), `submittedAt` (optional number), `lockedAt` (optional number), `createdAt` (number), `updatedAt` (number)
- Indexes on `reviews`: `by_submissionId`, `by_reviewerId`, `by_submissionId_reviewerId`
- The `reviewerAbstracts` table is defined with fields: `submissionId` (id reference to submissions), `reviewerId` (id reference to users), `content` (string), `wordCount` (number), `isSigned` (boolean), `status` (union of "drafting" | "submitted" | "approved"), `revision` (number), `createdAt` (number), `updatedAt` (number)
- Index on `reviewerAbstracts`: `by_submissionId`
- The `discussions` table is defined with fields: `submissionId` (id reference to submissions), `authorId` (id reference to users), `parentId` (optional id reference to discussions), `content` (string), `isRetracted` (optional boolean), `editableUntil` (optional number), `createdAt` (number), `updatedAt` (number)
- Index on `discussions`: `by_submissionId`
- The `reviewInvites` table is defined with fields: `submissionId` (id reference to submissions), `reviewerId` (id reference to users), `reviewAssignmentId` (string), `createdBy` (id reference to users), `tokenHash` (string, indexed), `expiresAt` (number), `consumedAt` (optional number), `revokedAt` (optional number), `createdAt` (number)
- Indexes on `reviewInvites`: `by_tokenHash`, `by_submissionId`
- The `auditLogs` table is defined with fields: `submissionId` (id reference to submissions), `actorId` (id reference to users), `actorRole` (string), `action` (string), `details` (optional string), `createdAt` (number)
- Indexes on `auditLogs`: `by_submissionId`, `by_actorId`
- The `notifications` table is defined with fields: `recipientId` (id reference to users), `submissionId` (optional id reference to submissions), `type` (string), `subject` (string), `body` (string), `readAt` (optional number), `createdAt` (number)
- Index on `notifications`: `by_recipientId`
- The `payments` table is defined with fields: `submissionId` (id reference to submissions), `reviewerId` (id reference to users), `pageCount` (number), `qualityLevel` (union of "standard" | "excellent"), `weeksEarly` (number), `hasAbstractBonus` (boolean), `createdAt` (number), `updatedAt` (number)
- Index on `payments`: `by_submissionId`, `by_reviewerId`
- The old placeholder `tasks` table is removed
- All field types use `v.*` validators (no `v.any()`)
- `convex dev` or `convex deploy` accepts the schema without errors

### AC2: Editorial state machine with transition enforcement
**Given** `convex/helpers/transitions.ts`
**When** the transition map and assertion helper are defined
**Then:**
- `VALID_TRANSITIONS` is a const object mapping each status to its array of valid next statuses:
  - `DRAFT` → `["SUBMITTED"]`
  - `SUBMITTED` → `["TRIAGING"]`
  - `TRIAGING` → `["TRIAGE_COMPLETE"]`
  - `TRIAGE_COMPLETE` → `["DESK_REJECTED", "UNDER_REVIEW"]`
  - `UNDER_REVIEW` → `["DECISION_PENDING"]`
  - `DECISION_PENDING` → `["ACCEPTED", "REJECTED", "REVISION_REQUESTED"]`
  - `ACCEPTED` → `["PUBLISHED"]`
  - `REVISION_REQUESTED` → `["SUBMITTED"]`
  - `DESK_REJECTED` → `[]` (terminal)
  - `REJECTED` → `[]` (terminal)
  - `PUBLISHED` → `[]` (terminal)
- `assertTransition(currentStatus, nextStatus)` function validates the transition and throws `ConvexError({ code: "INVALID_TRANSITION" })` with a descriptive message on failure
- `SUBMISSION_STATUSES` is exported as a union type and as a `v.union()` validator for use in the schema
- The `SubmissionStatus` TypeScript type is exported for use in frontend code

### AC3: Structured error codes and helpers
**Given** `convex/helpers/errors.ts`
**When** error helper functions are defined
**Then:**
- All 10 error codes from the architecture are available as helper functions:
  - `unauthorizedError(message?)` → `ConvexError({ code: "UNAUTHORIZED", message })`
  - `invalidTransitionError(from, to)` → `ConvexError({ code: "INVALID_TRANSITION", message })`
  - `notFoundError(resource, id?)` → `ConvexError({ code: "NOT_FOUND", message })`
  - `validationError(message)` → `ConvexError({ code: "VALIDATION_ERROR", message })`
  - `versionConflictError()` → `ConvexError({ code: "VERSION_CONFLICT", message })`
  - `inviteTokenInvalidError()` → `ConvexError({ code: "INVITE_TOKEN_INVALID", message })`
  - `inviteTokenExpiredError()` → `ConvexError({ code: "INVITE_TOKEN_EXPIRED", message })`
  - `inviteTokenUsedError()` → `ConvexError({ code: "INVITE_TOKEN_USED", message })`
  - `externalServiceError(service, message?)` → `ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message })`
  - `environmentMisconfiguredError(message)` → `ConvexError({ code: "ENVIRONMENT_MISCONFIGURED", message })`
- An `ErrorCode` type is exported enumerating all valid codes
- Each helper returns a `ConvexError` with a typed `{ code, message }` data payload

### AC4: Role-gated authentication wrappers
**Given** `convex/helpers/auth.ts`
**When** RBAC higher-order function wrappers are defined
**Then:**
- `withUser(handler)` resolves the Clerk identity from `ctx.auth.getUserIdentity()`, extracts `identity.subject` (the Clerk user ID), and looks up the user in the `users` table by `clerkId` matching that subject. Passes the authenticated user document to the handler. Throws `UNAUTHORIZED` if no identity or no matching user record.
- `withRole(role, handler)` extends `withUser` by additionally checking that the user's `role` field matches the required role. Throws `UNAUTHORIZED` with a descriptive message if role doesn't match.
- Convenience wrappers with role-only checks: `withAuthor(handler)`, `withEditor(handler)`, `withAdmin(handler)` — each calls `withRole` with the appropriate role string.
- Assignment-aware wrappers: `withReviewer(handler)` validates reviewer role AND that the user is assigned to the submission (via a matching record in `reviews` for the given `submissionId` arg). `withActionEditor(handler)` validates action editor role AND that the user is assigned to the submission (via `submissions.actionEditorId` matching the user's `_id`). Both throw `UNAUTHORIZED` if the role matches but the assignment check fails. `submissionId` must be present in the function's `args` for assignment checks to work. Assignment-aware wrappers only support `query` and `mutation` contexts (since they require `ctx.db`); for `action` contexts, callers must use `ctx.runQuery` with an internal query to perform the assignment check.
- The handler callback signature is `(ctx, args)` where `ctx` is the Convex context extended with a `user` property containing the full user document from the `users` table, and `args` is the original args object. Example: `withAuthor(async (ctx, args) => { ctx.user.role; args.submissionId; })`.
- Basic wrappers (`withUser`, `withRole`, `withAuthor`, `withEditor`, `withAdmin`) work with `query`, `mutation`, and `action` function contexts.
- Type safety is preserved — the handler's args and return type are properly forwarded.

### AC5: Unit tests for transitions and error helpers
**Given** `convex/__tests__/transitions.test.ts` and `convex/__tests__/errors.test.ts`
**When** tests are written
**Then:**
- Transition tests verify: valid transitions succeed for each status; invalid transitions throw `INVALID_TRANSITION`; terminal states (DESK_REJECTED, REJECTED, PUBLISHED) have no valid next states; the full pipeline path DRAFT→SUBMITTED→TRIAGING→TRIAGE_COMPLETE→UNDER_REVIEW→DECISION_PENDING→ACCEPTED→PUBLISHED works; the revision loop REVISION_REQUESTED→SUBMITTED works
- Error helper tests verify: each helper returns a `ConvexError` with the correct `code` field; messages are descriptive and include relevant context (e.g., `invalidTransitionError("SUBMITTED", "PUBLISHED")` mentions both statuses)
- All tests pass with `bun run test`

### AC6: Args/returns validator convention documented and enforced
**Given** the auth wrapper file `convex/helpers/auth.ts`
**When** the file is reviewed
**Then:**
- A JSDoc comment or block comment at the top of `convex/helpers/auth.ts` states the project-wide requirement: every `query`, `mutation`, and `action` must define both `args` and `returns` validators using `v.*` syntax
- The comment includes a concrete inline code example showing a query wrapped with `withAuthor` that specifies both `args: { submissionId: v.id("submissions") }` and `returns: v.object({ ... })` (or similar)
- Verification: inspect `convex/schema.ts` to confirm it compiles, and inspect each `query()`/`mutation()`/`action()` definition in `convex/` files created by this story to confirm it includes both `args:` and `returns:` keys. (Note: `export const` in helper files like `convex/helpers/*.ts` are not Convex function definitions and are excluded from this check.)

### AC7: Convex codegen succeeds
**Given** the complete schema and helper files
**When** the Convex dev server runs
**Then:**
- `convex/_generated/` files regenerate without errors
- TypeScript compilation succeeds with zero type errors
- The `api` and `internal` imports from `convex/_generated/api` are usable in function files
- The `DataModel` type from `convex/_generated/dataModel` correctly reflects all table types

## Technical Notes

### Schema design decisions

**Table naming:** camelCase plural per architecture conventions: `submissions`, `triageReports`, `reviewerProfiles`, `auditLogs`, `reviewInvites`, `reviewerAbstracts`.

**Index naming:** `by_` prefix + fields per architecture conventions: `by_submissionId`, `by_status`, `by_clerkId`.

**System fields:** All Convex documents automatically include `_id` and `_creationTime`. We add explicit `createdAt` and `updatedAt` fields where needed for business logic (sorting, display, conflict detection). `_creationTime` is system-managed; `createdAt` is application-managed for portability.

**Vector index:** The `reviewerProfiles` table uses a vector index on `embedding` with 1536 dimensions (matching OpenAI text-embedding-3-small output). Convex vector indexes support dimensions up to 4096, so text-embedding-3-large (3072) could be used if needed in a future upgrade. The 1536-dim model is chosen for cost/performance balance. This enables `ctx.vectorSearch("reviewerProfiles", "by_embedding", ...)` in reviewer matching.

**Submission status union:** All 11 statuses defined as a `v.union()` of `v.literal()` values. This provides runtime validation and TypeScript type safety.

**Semi-confidential identity:** The schema stores data neutrally (reviewerId on reviews, discussions). Identity gating is enforced in query functions (Story 1.3+), not in the schema itself. Author-facing queries will simply omit reviewer identity fields.

**Payments table:** Architecture says "no stored derived data — compute in queries." However, the `payments` table stores input factors (pageCount, qualityLevel, weeksEarly, hasAbstractBonus) that are set by editor actions, not the calculated totals. Totals are computed in queries from these inputs.

### Auth wrapper design

The auth wrappers use Convex's `ctx.auth.getUserIdentity()` which returns the Clerk JWT claims. The `identity.subject` field (the Clerk user ID) is used to look up the user by matching the `clerkId` field in the users table. This pattern is standard for Clerk + Convex integration.

The wrappers are designed as higher-order functions that wrap the handler logic, NOT as middleware. Each Convex function that needs auth will call the wrapper inline:

```typescript
export const myQuery = query({
  args: { submissionId: v.id("submissions") },
  returns: v.object({ title: v.string() }),
  handler: withAuthor(async (ctx, args) => {
    // ctx.user is the authenticated user with Author role
    const sub = await ctx.db.get(args.submissionId);
    return { title: sub!.title };
  }),
})
```

### Files to create

```
convex/
  schema.ts                    — Full schema (replace placeholder)
  helpers/
    transitions.ts             — VALID_TRANSITIONS + assertTransition()
    errors.ts                  — Error code helpers
    auth.ts                    — withUser, withRole, withAuthor, etc.
  __tests__/
    transitions.test.ts        — Transition map tests
    errors.test.ts             — Error helper tests
```

### Files to modify

```
convex/schema.ts               — Replace placeholder tasks table with full schema
```

### Task Breakdown (ordered)

1. **Create `convex/helpers/transitions.ts`** — Define `SUBMISSION_STATUSES`, `VALID_TRANSITIONS`, `assertTransition()`, and the `SubmissionStatus` type/validator. (AC2)
2. **Create `convex/helpers/errors.ts`** — Define all 10 error code helpers and the `ErrorCode` type. (AC3)
3. **Update `convex/schema.ts`** — Replace placeholder `tasks` table with the full schema: all tables, indexes, and vector index. Import `SUBMISSION_STATUSES` validator from step 1. (AC1)
4. **Create `convex/helpers/auth.ts`** — Define `withUser`, `withRole`, role convenience wrappers (`withAuthor`, `withEditor`, `withAdmin`), and assignment-aware wrappers (`withReviewer`, `withActionEditor`). Document args+returns validator requirement in code comments. (AC4, AC6)
5. **Create `convex/__tests__/transitions.test.ts`** — Unit tests for transition map and assertTransition. (AC5)
6. **Create `convex/__tests__/errors.test.ts`** — Unit tests for all error helpers. (AC5)
7. **Verify codegen and typecheck** — Run `bunx convex dev --once` to regenerate `_generated/` files (the `--once` flag runs codegen and exits immediately rather than starting a long-running watcher), then `bun run typecheck`. (AC7)
8. **Run all tests** — `bun run test` must pass. (AC5)

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth wrapper tests deferred to Story 1.3 | Wrappers ship without integration test coverage | Write the wrappers with clear type signatures and inline JSDoc; verify they compile and that the handler callback types are correct via typecheck. Story 1.3 will add integration tests with mocked Clerk auth context. |
| Vector dimension change (1536 vs architecture's 3072) | Mismatch with architecture docs | Architecture doc references text-embedding-3-large (3072 dims). Convex supports up to 4096 dimensions, so 3072 is technically feasible. This story uses 1536 (text-embedding-3-small) for cost/performance balance. If higher dimensionality is needed later, switching to text-embedding-3-large requires only a dimension change and re-embedding. Update architecture doc in follow-up. |
| Schema changes after deployment are harder | Breaking changes require migrations | This story defines the initial schema before any data exists, so no migration risk. Subsequent schema changes should follow Convex migration patterns. |
| Assignment-aware wrappers depend on data from other tables | `withReviewer` queries `reviews` and `withActionEditor` queries `submissions`, which may not have data during early testing | Unit tests for auth wrappers are deferred to Story 1.3. In this story, verify type correctness via typecheck only. Document the required `submissionId` arg contract clearly so callers cannot accidentally omit the assignment check. |

### Dependencies on this story

Every subsequent story in every epic depends on this story's outputs:
- **Schema:** All Convex function files import table types from `convex/_generated/dataModel`
- **Transitions:** `convex/submissions.ts` (Story 2.1+) uses `assertTransition()` for all status changes
- **Errors:** Every Convex function file uses error helpers for consistent error handling
- **Auth wrappers:** Every role-gated Convex function uses `withAuthor`, `withReviewer`, `withEditor`, etc.

### What "done" looks like

- `convex/schema.ts` defines all 10+ tables with proper types, indexes, and the vector index
- `convex/helpers/transitions.ts` enforces the editorial state machine
- `convex/helpers/errors.ts` provides all 10 typed error code helpers
- `convex/helpers/auth.ts` provides role-gated wrapper functions
- All tests pass with `bun run test`
- `bun run typecheck` succeeds with zero errors
- Convex dev server accepts the schema (codegen succeeds)
- The placeholder `tasks` table from Story 1.1 is removed

## Dev Notes

- The Convex schema must use `v.*` validators from `convex/values` — NOT Zod. Zod is for frontend forms and Vercel AI SDK only.
- Every field must have an explicit validator. No `v.any()` usage.
- The vector index for `reviewerProfiles` uses Convex's built-in `vectorIndex()` API with cosine similarity and 1536 dimensions (text-embedding-3-small).
- Auth wrappers will need the Clerk Convex integration from `convex/auth.config.ts` (already configured in Story 1.1).
- The `withRole` wrapper checks the `role` field on the user document, NOT Clerk's role metadata. Roles are stored in Convex for single-source-of-truth.
- `withReviewer` and `withActionEditor` go beyond role checks: they also verify the user is assigned to the specific submission referenced by `submissionId` in the function args. `withReviewer` checks for a matching `reviews` record; `withActionEditor` checks `submissions.actionEditorId`. These assignment-aware wrappers only work with `query`/`mutation` contexts (they need `ctx.db`). For `action` contexts that need assignment checks, the action should call `ctx.runQuery` on an internal query that performs the check. This matches the architecture's assignment-aware security model.
- Tests for auth wrappers are deferred to Story 1.3 where the full Clerk integration is wired up and testable with mocked auth context.
- Import conventions: value imports before type imports, separate `import type` statements.
