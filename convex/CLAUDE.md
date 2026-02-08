# Convex Layer Patterns

## Auth Wrappers (`helpers/auth.ts`)
- `withUser`, `withRole`, `withAuthor`, `withEditor`, `withAdmin` work with query, mutation, AND action contexts
- `withReviewer`, `withActionEditor` are assignment-aware and only work with query/mutation (need `ctx.db`)
- Handler signature: `(ctx: TAuthCtx<TCtx>, args: TArgs) => Promise<TReturns>` where `ctx.user` is the full user doc
- For action contexts, user lookup goes through `internal.users.getByClerkId`

## Validator Requirements
- Every `query`, `mutation`, and `action` must define both `args` and `returns` validators
- No `v.any()` — all fields use explicit validators
- Submission status uses `submissionStatusValidator` from `helpers/transitions.ts`

## Error Handling (`helpers/errors.ts`)
- Always use typed error helpers (e.g., `unauthorizedError()`, `notFoundError()`) instead of raw `ConvexError`
- All errors have `{ code: ErrorCode, message: string }` data shape

## State Machine (`helpers/transitions.ts`)
- Use `assertTransition(currentStatus, nextStatus)` before any status change
- Terminal states: DESK_REJECTED, REJECTED, PUBLISHED (no outgoing transitions)

## db.get() Usage
- Convex supports both `ctx.db.get(id)` and `ctx.db.get('tableName', id)` overloads

## Embedding Generation Pattern (`matching.ts`)
- `"use node";` first line for OpenAI SDK access
- Deferred scheduling: mutation calls `ctx.scheduler.runAfter(0, internal.matching.generateEmbedding, { profileId })`
- Stale-check in `saveEmbedding`: compares `updatedAt` from profile read against current profile `updatedAt` to prevent concurrent job overwrites
- `getProfileInternal` (internalQuery) and `saveEmbedding` (internalMutation) are internal-only — not client-accessible
- OpenAI `text-embedding-3-large` with explicit `dimensions: 1536` (default is 3072)

## Chained Action Pattern (`triage.ts`)
- `"use node";` must be first line for Node.js runtime (required by `unpdf`, `ai`, `@ai-sdk/anthropic`)
- Chained internalActions: each action writes results via internalMutation, then schedules the next action via `ctx.scheduler.runAfter(0, ...)`
- Retry: track `attemptCount` via action args (not DB), re-schedule self with exponential backoff (max 3 attempts)
- Idempotency: use `idempotencyKey` index to prevent duplicate writes; `writeResult` no-ops if already `complete`
- Terminal state guards: `markRunning` won't overwrite `complete`/`failed`; `markFailed` won't overwrite `complete`
- Pipeline continues on failure: failed passes schedule the next pass with empty text so remaining passes still execute
- Object-level auth on queries: `assertTriageAccess` checks author ownership or privileged role
