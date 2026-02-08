# ATDD Checklist — Story 1.2: Define Data Schema and Core Helpers

## AC1: Complete Convex schema defined
- [ ] `convex/schema.ts` defines `users` table with all specified fields and `by_clerkId` index
- [ ] `submissions` table with all fields, `by_authorId`, `by_status`, `by_actionEditorId` indexes
- [ ] `triageReports` table with all fields, `by_submissionId`, `by_idempotencyKey` indexes
- [ ] `reviewerProfiles` table with all fields, `by_userId` index, vector index `by_embedding` (1536 dims)
- [ ] `reviews` table with all fields, `by_submissionId`, `by_reviewerId`, `by_submissionId_reviewerId` indexes
- [ ] `reviewerAbstracts` table with all fields, `by_submissionId` index
- [ ] `discussions` table with all fields, `by_submissionId` index
- [ ] `reviewInvites` table with all fields, `by_tokenHash`, `by_submissionId` indexes
- [ ] `auditLogs` table with all fields, `by_submissionId`, `by_actorId` indexes
- [ ] `notifications` table with all fields, `by_recipientId` index
- [ ] `payments` table with all fields, `by_submissionId`, `by_reviewerId` indexes
- [ ] Placeholder `tasks` table is removed
- [ ] No `v.any()` usage — all fields use explicit validators

## AC2: Editorial state machine with transition enforcement
- [ ] `SUBMISSION_STATUSES` exported as validator and type
- [ ] `VALID_TRANSITIONS` defines all 11 statuses with correct next-state arrays
- [ ] `assertTransition()` allows valid transitions
- [ ] `assertTransition()` throws `ConvexError({ code: "INVALID_TRANSITION" })` on invalid transitions
- [ ] Terminal states (DESK_REJECTED, REJECTED, PUBLISHED) have empty next-state arrays
- [ ] Full pipeline path works: DRAFT→SUBMITTED→TRIAGING→...→PUBLISHED
- [ ] Revision loop works: REVISION_REQUESTED→SUBMITTED

## AC3: Structured error codes and helpers
- [ ] All 10 error helper functions exist and return `ConvexError` with correct `code`
- [ ] `ErrorCode` type exported enumerating all codes
- [ ] Each helper includes descriptive message with relevant context
- [ ] `invalidTransitionError("SUBMITTED", "PUBLISHED")` mentions both statuses

## AC4: Role-gated authentication wrappers
- [ ] `withUser(handler)` resolves Clerk identity and looks up user by `clerkId`
- [ ] `withUser` throws UNAUTHORIZED if no identity or no user record
- [ ] `withRole(role, handler)` checks user's role field
- [ ] Convenience wrappers: `withAuthor`, `withEditor`, `withAdmin`
- [ ] `withReviewer(handler)` checks role + assignment via reviews table
- [ ] `withActionEditor(handler)` checks role + assignment via submissions.actionEditorId
- [ ] Handler callback receives `ctx` with `user` property
- [ ] Type safety preserved for args and return types

## AC5: Unit tests for transitions and error helpers
- [ ] `convex/__tests__/transitions.test.ts` — valid transitions succeed
- [ ] `convex/__tests__/transitions.test.ts` — invalid transitions throw INVALID_TRANSITION
- [ ] `convex/__tests__/transitions.test.ts` — terminal states have no next states
- [ ] `convex/__tests__/transitions.test.ts` — full pipeline path works
- [ ] `convex/__tests__/transitions.test.ts` — revision loop works
- [ ] `convex/__tests__/errors.test.ts` — each helper returns ConvexError with correct code
- [ ] `convex/__tests__/errors.test.ts` — messages include relevant context
- [ ] All tests pass with `bun run test`

## AC6: Args/returns validator convention documented
- [ ] JSDoc at top of `convex/helpers/auth.ts` states requirement
- [ ] Includes inline code example with both `args` and `returns`

## AC7: Convex codegen succeeds
- [ ] `bunx convex dev --once` succeeds (codegen)
- [ ] `bun run typecheck` passes with zero errors
- [ ] Generated types reflect all tables
