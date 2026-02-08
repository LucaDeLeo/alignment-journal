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
