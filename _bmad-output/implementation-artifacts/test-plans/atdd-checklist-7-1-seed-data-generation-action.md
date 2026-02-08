# ATDD Checklist — Story 7.1: Seed Data Generation Action

## Test Strategy

This story creates a `convex/seed.ts` module — a standalone Convex Action with internalMutations. Since Convex actions/mutations cannot be unit-tested locally without a running backend, verification is done via:

1. **TypeScript compilation** (`bun run typecheck`) — validates all validators, field types, and import references
2. **Convex push** (`bunx convex dev --once`) — validates the module deploys successfully with proper schema alignment
3. **Build verification** (`bun run build`) — ensures no frontend breakage
4. **Lint** (`bun run lint`) — lint compliance

No unit tests are written for this story because:
- The seed module contains only static data and simple insert loops
- There is no business logic to test (no computations, no state machines, no branching logic)
- The pure function testing pattern (Epic 6) doesn't apply — there are no pure functions to extract
- Integration testing would require a running Convex backend

## Acceptance Criteria Verification

### AC1: Seed Action exists and runs successfully
- [ ] `convex/seed.ts` exists with no `"use node"` directive
- [ ] Exports public `seedData` action with `args: {}`
- [ ] Returns typed summary object with counts for each table
- [ ] All writes go through `ctx.runMutation(internal.seed.seed*, ...)`
- [ ] `bunx convex dev --once` succeeds (validates schema alignment)

### AC2: Idempotent execution
- [ ] `checkSeeded` internalQuery checks for sentinel user (`clerkId: 'seed_eic'`)
- [ ] Action returns `{ alreadySeeded: true }` when sentinel exists
- [ ] No duplicate data created on re-run

### AC3: Seed users across all roles
- [ ] 8 users created covering: 2 authors, 3 reviewers, 1 action_editor, 1 editor_in_chief, 1 admin
- [ ] Each has name, affiliation, email, role, createdAt
- [ ] clerkId uses `seed_` prefix
- [ ] Validators match `users` table schema exactly

### AC4: Five submissions at different pipeline stages
- [ ] Submission 1: TRIAGE_COMPLETE with triage reports
- [ ] Submission 2: UNDER_REVIEW with reviewer assignments
- [ ] Submission 3: ACCEPTED with completed reviews and discussion
- [ ] Submission 4: REJECTED with completed reviews
- [ ] Submission 5: PUBLISHED with reviewer abstract
- [ ] All have real alignment research content

### AC5: Substantive triage reports
- [ ] 4 triage reports per triaged submission (scope, formatting, citations, claims)
- [ ] Each has status `complete`, result with finding/severity/recommendation
- [ ] Unique idempotencyKeys, consistent triageRunId per submission
- [ ] attemptCount: 1, completedAt timestamp

### AC6: Coherent audit trails
- [ ] Each submission has correct lifecycle audit entries
- [ ] Actor IDs match the role performing the action
- [ ] Timestamps ordered within each submission's trail

### AC7: Reviews with structured content
- [ ] Completed reviews have all 5 sections filled
- [ ] In-progress reviews have partial content
- [ ] Status: locked for completed, in_progress/assigned for active
- [ ] revision >= 1, proper timestamps

## Verification Commands

```bash
bun run typecheck    # TypeScript compilation
bunx convex dev --once  # Convex deployment validation
bun run build        # Frontend build
bun run lint         # Lint compliance
bun run test         # Existing test suite passes
```
