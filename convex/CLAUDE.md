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

## Node.js Action Split Pattern
- Convex `"use node"` files can only export actions/internalActions (not queries/mutations)
- Each domain module is split into two files:
  - `{name}.ts` — queries, mutations, internalQueries, internalMutations (default Convex runtime)
  - `{name}Actions.ts` — actions and internalActions with `"use node"` (Node.js runtime)
- API paths: `internal.matching.*` for queries/mutations, `internal.matchingActions.*` for actions
- Frontend: `api.matching.*` for queries/mutations, `api.matchingActions.*` for actions

## Embedding Generation Pattern (`matching.ts` + `matchingActions.ts`)
- Deferred scheduling: mutation calls `ctx.scheduler.runAfter(0, internal.matchingActions.generateEmbedding, { profileId })`
- Stale-check in `saveEmbedding`: compares `updatedAt` from profile read against current profile `updatedAt` to prevent concurrent job overwrites
- `getProfileInternal` (internalQuery) and `saveEmbedding` (internalMutation) are internal-only — not client-accessible
- OpenAI `text-embedding-3-large` with explicit `dimensions: 1536` (default is 3072)

## Vector Search + LLM Enrichment Pattern (`matchingActions.ts`)
- `findMatches` action: generates paper embedding → `ctx.vectorSearch()` → LLM rationale → saves results
- `ctx.vectorSearch()` only available in actions (not queries/mutations); returns `Array<{ _id, _score }>`
- Results persisted to `matchResults` table via `internal.matching.saveMatchResults` internalMutation (upsert semantics)
- UI subscribes reactively via `useQuery(api.matching.getMatchResults)` for status-driven rendering
- LLM rationale via Vercel AI SDK `generateObject` with zod schema; graceful fallback to keyword-overlap rationale
- Error sanitization via `sanitizeErrorMessage` before writing to client-visible `matchResults.error` field
- `@ai-sdk/openai` provider with `gpt-4o-mini` for cost-efficient rationale generation

## Single PDF Triage Action (`triage.ts` + `triageActions.ts`)
- `triageActions.ts` has `"use node"` for Node.js runtime (required by `ai`, `@ai-sdk/anthropic`)
- Single `runTriage` internalAction sends the PDF directly to Haiku via `generateObject` with `type: 'file'` — one call returns all 4 dimensions (scope, formatting, citations, claims)
- `triage.ts` has mutations/queries in default runtime; schedules action via `internal.triageActions.runTriage`
- Batch mutations: `markAllRunning`, `writeAllResults` (writes all 4 reports + transitions to TRIAGE_COMPLETE), `markAllFailed`
- Retry: track `attemptCount` via action args (not DB), re-schedule self with exponential backoff (max 3 attempts)
- Idempotency: use `idempotencyKey` index to prevent duplicate writes; batch mutations no-op on terminal states
- Terminal state guards: `markAllRunning` won't overwrite `complete`/`failed`; `markAllFailed` won't overwrite `complete`
- Object-level auth on queries: `assertTriageAccess` checks author ownership or privileged role
