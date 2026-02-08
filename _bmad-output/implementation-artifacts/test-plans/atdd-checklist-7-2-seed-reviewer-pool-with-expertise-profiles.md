# ATDD Checklist: Story 7.2 - Seed Reviewer Pool with Expertise Profiles

## AC1: Five or more reviewer profiles with distinct expertise
- [ ] `buildSeedUsers()` returns 10 users (8 existing + 2 new)
- [ ] New user at index 8 is Dr. Amara Okafor with role `reviewer` and affiliation `Oxford FHI`
- [ ] New user at index 9 is Dr. Liang Zhao with role `reviewer` and affiliation `UC Berkeley CHAI`
- [ ] `buildReviewerProfiles()` returns 5 profiles when given 5 reviewer IDs
- [ ] Each profile has 3-5 `researchAreas`
- [ ] Each profile has 3+ `publications` with title, venue, and year
- [ ] All 5 affiliations are distinct: MIRI, Anthropic, DeepMind, Oxford FHI, UC Berkeley CHAI

## AC2: Vector embeddings scheduled for all profiles
- [ ] `seedEmbeddings` internalMutation exists and accepts `profileIds` arg
- [ ] `seedEmbeddings` calls `ctx.scheduler.runAfter(0, internal.matchingActions.generateEmbedding, { profileId })` for each profile
- [ ] `seedData` action calls `seedEmbeddings` after inserting profiles

## AC3: Reviewer matching meaningful results (design-level, not unit-testable)
- [ ] Verified by manual demo after embeddings populate — not unit tested
- [ ] Five distinct research focus areas: formal alignment, training/evaluation, interpretability, value alignment, inner alignment

## AC4: Existing seed data and idempotency preserved
- [ ] `uids` object in `seedData` includes `reviewer4` and `reviewer5`
- [ ] Existing user indices (0-7) unchanged
- [ ] All existing seed data functions receive the same inputs as before
- [ ] `buildReviewerProfiles` receives 5 reviewer IDs but existing 3 profiles are identical
- [ ] Return summary counts update dynamically (10 users, 5 profiles)

## AC5: Build verification
- [ ] `bunx convex dev --once` succeeds
- [ ] `bun run build` succeeds
- [ ] `bun run test` passes

## Test Plan

### Unit Tests (`convex/__tests__/seed-reviewers.test.ts`)

1. **buildSeedUsers returns 10 users** — verify length, new indices have correct role/affiliation/name
2. **New reviewers have distinct affiliations** — verify no duplicate affiliations across all 5 reviewers
3. **buildReviewerProfiles returns 5 profiles** — verify length when given 5 IDs
4. **Each profile has 3-5 research areas** — verify bounds for all 5 profiles
5. **Each profile has 3+ publications** — verify minimum publication count
6. **Publications have required fields** — verify title, venue, year present on all publications
7. **Research areas are distinct across profiles** — verify primary areas don't overlap heavily

### Integration Verification (manual)
- Run `seedData` action → verify 10 users, 5 profiles in return
- After embedding jobs complete → verify `findMatches` returns meaningful results
