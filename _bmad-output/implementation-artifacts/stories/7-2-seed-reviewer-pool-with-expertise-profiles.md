# Story 7.2: Seed Reviewer Pool with Expertise Profiles

## Story

**As a** developer deploying the prototype,
**I want** a realistic reviewer pool seeded with profiles, publications, and vector embeddings,
**So that** reviewer matching produces meaningful results during the demo.

## Status

**Epic:** 7 - Seed Data & Demo Experience
**Status:** ready
**Priority:** High (delivers FR51 — reviewer pool with 5+ profiles and expertise data for matching)
**Depends on:** Story 7.1 complete (seed data generation Action exists with 3 reviewers)

## Context

Story 7.1 created the seed data Action (`convex/seed.ts`) which populates the database with 8 users (including 3 reviewers) and 3 reviewer profiles. However, the profiles were created **without vector embeddings** (the `embedding` field was left as `undefined`). The acceptance criteria for Story 7.2 require:
1. **5+ reviewers** with distinct alignment expertise areas
2. **Vector embeddings** generated via `text-embedding-3-large` from research areas and publications
3. **Reviewer matching** that returns meaningful results when run against seed submissions

**What exists today:**
- `convex/seed.ts` — Seed Action with 8 users (3 reviewers: Dr. Yuki Tanaka/MIRI, Dr. Priya Sharma/Anthropic, Dr. James Mitchell/DeepMind), 3 reviewer profiles (no embeddings), 5 submissions at various stages
- `convex/matchingActions.ts` — `generateEmbedding` internalAction (uses `"use node"`, calls OpenAI `text-embedding-3-large` with 1536 dimensions)
- `convex/matching.ts` — `saveEmbedding` internalMutation with stale-check, `createOrUpdateProfile` mutation that schedules embedding generation, `getProfileInternal` internalQuery
- `convex/schema.ts` — `reviewerProfiles` table with optional `embedding: v.optional(v.array(v.float64()))` and `vectorIndex('by_embedding', { vectorField: 'embedding', dimensions: 1536 })`
- Existing `buildSeedUsers()` returns 8 users (indices 0-7); reviewers are at indices 2, 3, 4
- Existing `buildReviewerProfiles()` returns 3 profiles for those 3 reviewers
- Existing `seedReviewerProfiles` internalMutation accepts records without `embedding` field

**What this story builds:**
1. **2 additional seed reviewer users** — expanding the pool from 3 to 5 reviewers with distinct AI alignment expertise
2. **2 additional reviewer profiles** — with research areas and publications for the new reviewers
3. **Embedding generation scheduling** — after seed profiles are inserted, schedule `internal.matchingActions.generateEmbedding` for each profile to generate vector embeddings asynchronously
4. **Updated match results** — the existing seed match results for Submission 2 remain as-is (they are static demo data); the real value is that after embeddings are generated, the `findMatches` action will produce live vector search results

**Key architectural decisions:**

- **Add 2 new reviewer users to the seed users array:** The `buildSeedUsers()` function returns 8 users. We add 2 more reviewer users (indices 8 and 9), bringing the total to 10 users and 5 reviewers. Since `buildSeedUsers` is called first and returns an array of IDs, the new reviewers get IDs at `userIds[8]` and `userIds[9]`.

- **Expand `buildReviewerProfiles()` to include 5 profiles:** The function takes an array of reviewer user IDs. We pass all 5 reviewer IDs instead of 3 and add 2 more profile definitions with distinct research areas.

- **Schedule embedding generation from the seed Action:** After inserting reviewer profiles via `seedReviewerProfiles`, call `ctx.scheduler.runAfter(0, internal.matchingActions.generateEmbedding, { profileId })` for each profile. This reuses the existing production embedding pipeline. The seed Action is already an Action (not a mutation) so `ctx.scheduler` is available via `ctx.runMutation` calling an internalMutation that does the scheduling, OR we schedule from the Action directly using `ctx.scheduler`.

- **Asynchronous embedding generation:** Embeddings are generated asynchronously after the seed Action completes. This is the same pattern used by the production `createOrUpdateProfile` mutation. The seed Action does NOT wait for embeddings — it schedules the jobs and returns immediately. The embeddings populate within seconds.

- **No new Convex files needed:** All changes are within `convex/seed.ts`. The existing embedding generation pipeline (`matchingActions.generateEmbedding` → `matching.saveEmbedding`) handles the actual OpenAI API call and vector storage.

**Five reviewers covering distinct alignment subfields:**

| # | Name | Affiliation | Research Areas | Key Expertise |
|---|------|-------------|----------------|---------------|
| 1 | Dr. Yuki Tanaka | MIRI | corrigibility, agent foundations, decision theory, embedded agency, logical uncertainty | Formal alignment theory |
| 2 | Dr. Priya Sharma | Anthropic | scalable oversight, reward modeling, RLHF, human feedback, evaluation methodology | Training and evaluation |
| 3 | Dr. James Mitchell | DeepMind | mechanistic interpretability, circuit analysis, transformer internals, safety evaluation, representation engineering | Interpretability |
| 4 | Dr. Amara Okafor | Oxford FHI | value alignment, moral uncertainty, preference learning, cooperative AI, game theory | Value alignment and cooperation |
| 5 | Dr. Liang Zhao | UC Berkeley CHAI | mesa-optimization, inner alignment, deceptive alignment, goal misgeneralization, distributional robustness | Inner alignment |

**Key architectural references:**
- FR51: Reviewer pool with 5+ profiles, each containing name, affiliation, research areas, 3+ publications, and expertise matching data
- `convex/matchingActions.ts:92-149` — `generateEmbedding` internalAction (existing production pipeline)
- `convex/matching.ts:101-124` — `saveEmbedding` internalMutation (with stale-check)
- `convex/schema.ts:82-100` — `reviewerProfiles` table definition with vectorIndex

## Acceptance Criteria

### AC1: Five or more reviewer profiles with distinct expertise
**Given** the seed Action runs
**When** reviewer profiles are created
**Then:**
- 5 reviewer user records exist (3 existing + 2 new) with role `reviewer`
- Each reviewer has a distinct `affiliation` from a recognized AI safety organization (MIRI, Anthropic, DeepMind, Oxford FHI, UC Berkeley CHAI)
- 5 corresponding `reviewerProfiles` records exist, one per reviewer
- Each profile has 3-5 `researchAreas` relevant to AI alignment
- Each profile has 3+ `publications` with realistic titles, venues, and years
- No two reviewers have the same primary research focus

### AC2: Vector embeddings generated for all profiles
**Given** the seed Action runs and creates reviewer profiles
**When** the Action completes
**Then:**
- For each of the 5 reviewer profiles, `ctx.scheduler.runAfter(0, internal.matchingActions.generateEmbedding, { profileId })` is scheduled
- This reuses the existing embedding pipeline (no new embedding code)
- After the scheduled jobs complete, each profile has an `embedding` field populated with a 1536-dimensional vector from OpenAI `text-embedding-3-large`
- The embeddings are generated from each reviewer's research areas and publication titles (same text format as the production `generateEmbedding` action)

### AC3: Reviewer matching returns meaningful results
**Given** the seed reviewer pool has embeddings populated
**When** the `findMatches` action runs against a seed submission (e.g., Submission 2 — mesa-optimization)
**Then:**
- Vector search via `by_embedding` index returns reviewer matches ranked by relevance
- The LLM rationale references the reviewer's actual research areas and publications
- Reviewers with relevant expertise rank higher (e.g., Dr. Liang Zhao's mesa-optimization expertise matches Submission 2)

### AC4: Existing seed data and idempotency preserved
**Given** the expanded seed Action
**When** it runs
**Then:**
- The idempotency check (`checkSeeded` via sentinel user) still works correctly
- All existing seed data (submissions, reviews, discussions, audit logs, etc.) remains unchanged
- The new reviewer users and profiles integrate seamlessly with existing seed match results
- The return summary includes the updated counts (10 users, 5 reviewer profiles)
- Running the seed Action twice still returns `{ alreadySeeded: true }`

### AC5: Build verification
**Given** all changes are made
**When** running verification commands
**Then:**
- `bunx convex dev --once` succeeds (Convex functions typecheck and deploy)
- `bun run build` succeeds (no frontend TypeScript errors)
- `bun run test` passes (no regressions)

## Technical Notes

### Changes to `convex/seed.ts`

#### 1. Expand `buildSeedUsers()` — add 2 new reviewer users

Add 2 new user entries at the end of the array (indices 8, 9):

```typescript
{
  clerkId: 'seed_reviewer_4',
  email: 'seed-reviewer-4@alignment-journal.org',
  name: 'Dr. Amara Okafor',
  affiliation: 'Oxford FHI',
  role: 'reviewer' as const,
  createdAt: baseTime,
},
{
  clerkId: 'seed_reviewer_5',
  email: 'seed-reviewer-5@alignment-journal.org',
  name: 'Dr. Liang Zhao',
  affiliation: 'UC Berkeley CHAI',
  role: 'reviewer' as const,
  createdAt: baseTime,
},
```

Both new users have `role: 'reviewer' as const` to ensure they can have reviewer profiles created.

#### 2. Expand `buildReviewerProfiles()` — add 2 new profiles

The function signature changes to accept 5 reviewer user IDs:

```typescript
function buildReviewerProfiles(
  baseTime: number,
  reviewerUserIds: Array<Id<'users'>>,  // Now expects 5 entries
)
```

Add profiles for the 2 new reviewers:

**Dr. Amara Okafor (Oxford FHI) — Value alignment & cooperative AI:**
```typescript
{
  userId: reviewerUserIds[3],
  researchAreas: [
    'value alignment',
    'moral uncertainty',
    'preference learning',
    'cooperative AI',
    'game theory',
  ],
  publications: [
    {
      title: 'Formalizing Moral Uncertainty in Multi-Agent Alignment',
      venue: 'AAAI',
      year: 2024,
    },
    {
      title: 'Cooperative Inverse Reinforcement Learning Under Partial Observability',
      venue: 'NeurIPS',
      year: 2023,
    },
    {
      title: 'Game-Theoretic Approaches to Value Lock-In Prevention',
      venue: 'Journal of AI Research',
      year: 2022,
    },
  ],
  createdAt: profileTime,
  updatedAt: profileTime,
}
```

**Dr. Liang Zhao (UC Berkeley CHAI) — Inner alignment & mesa-optimization:**
```typescript
{
  userId: reviewerUserIds[4],
  researchAreas: [
    'mesa-optimization',
    'inner alignment',
    'deceptive alignment',
    'goal misgeneralization',
    'distributional robustness',
  ],
  publications: [
    {
      title: 'Detecting Deceptive Alignment in Mesa-Optimizers via Behavioral Probing',
      venue: 'ICML',
      year: 2024,
    },
    {
      title: 'Goal Misgeneralization in Deep Reinforcement Learning: A Causal Analysis',
      venue: 'NeurIPS',
      year: 2023,
    },
    {
      title: 'Distributional Robustness and Inner Alignment: Theoretical Connections',
      venue: 'ICLR',
      year: 2022,
    },
  ],
  createdAt: profileTime,
  updatedAt: profileTime,
}
```

#### 3. Update `uids` mapping in `seedData` Action

After inserting users, expand the `uids` object to include the new reviewer IDs:

```typescript
const uids = {
  author1: userIds[0],
  author2: userIds[1],
  reviewer1: userIds[2],
  reviewer2: userIds[3],
  reviewer3: userIds[4],
  ae: userIds[5],
  eic: userIds[6],
  admin: userIds[7],
  reviewer4: userIds[8],
  reviewer5: userIds[9],
}
```

#### 4. Pass all 5 reviewer IDs to `buildReviewerProfiles()`

```typescript
const profilesData = buildReviewerProfiles(baseTime, [
  uids.reviewer1,
  uids.reviewer2,
  uids.reviewer3,
  uids.reviewer4,
  uids.reviewer5,
])
```

#### 5. Schedule embedding generation after profile insertion

After the `seedReviewerProfiles` mutation returns profile IDs, add a new `seedEmbeddings` internalMutation that schedules embedding generation for each profile:

```typescript
export const seedEmbeddings = internalMutation({
  args: { profileIds: v.array(v.id('reviewerProfiles')) },
  returns: v.null(),
  handler: async (ctx, { profileIds }) => {
    for (const profileId of profileIds) {
      await ctx.scheduler.runAfter(
        0,
        internal.matchingActions.generateEmbedding,
        { profileId },
      )
    }
    return null
  },
})
```

Then in the seed Action, after inserting profiles:

```typescript
// 4. Reviewer profiles
const profileIds = await ctx.runMutation(internal.seed.seedReviewerProfiles, { records: profilesData })

// 4a. Schedule embedding generation for all profiles
await ctx.runMutation(internal.seed.seedEmbeddings, { profileIds })
```

**Why a separate internalMutation?** The `ctx.scheduler` API is available in mutations but not directly in actions. By wrapping the scheduling calls in an internalMutation, we can call it from the action via `ctx.runMutation`. This follows the Convex pattern — actions orchestrate mutations, mutations use the scheduler.

#### 6. Update return value counts

The return summary already counts `users: userIds.length` and `reviewerProfiles: profileIds.length` dynamically, so the counts will automatically reflect the new data (10 users, 5 profiles).

### Files to create

None. All changes are within existing files.

### Files to modify

```
convex/seed.ts     — Add 2 reviewer users, 2 profiles, embedding scheduling
```

### Implementation sequence

1. **Add 2 new reviewer users** to `buildSeedUsers()` (indices 8, 9)
2. **Add 2 new reviewer profiles** to `buildReviewerProfiles()` with distinct alignment expertise
3. **Update `uids` mapping** in `seedData` Action to include `reviewer4` and `reviewer5`
4. **Pass 5 reviewer IDs** to `buildReviewerProfiles()` call
5. **Add `seedEmbeddings` internalMutation** that schedules `generateEmbedding` for each profile
6. **Call `seedEmbeddings`** after profile insertion in the seed Action
7. **Verify** — `bunx convex dev --once` succeeds, `bun run build` succeeds, `bun run test` passes

### Import conventions

Follow the codebase pattern:
- No new imports needed (the file already imports `internal` from `convex/_generated/api`)
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenAI API key not set | Embeddings not generated | `generateEmbedding` gracefully handles missing key (logs warning, leaves profile without embedding) |
| Embedding generation fails | Profiles exist but vector search returns no results | Existing fallback — seed match results for Submission 2 are static and don't depend on embeddings |
| User index array shift | Wrong user IDs for new reviewers | New users appended at end (indices 8, 9); existing indices 0-7 unchanged |
| Scheduler limit | Too many scheduled jobs | Only 5 embedding jobs — well within Convex scheduler limits |
| Stale embeddings from concurrent seed runs | Embedding overwrites | `saveEmbedding` has stale-check; idempotency prevents double-seeding anyway |

### Dependencies on this story

- **Story 7.3 (Seed Reviews, Discussions, Published Article):** May use the expanded reviewer pool for additional review assignments. The new reviewers (Dr. Okafor, Dr. Zhao) could participate in reviews or discussions.

### What "done" looks like

- `convex/seed.ts` contains 10 seed users (5 reviewers) and 5 reviewer profiles
- Each new reviewer profile has 3+ publications and 3-5 research areas covering distinct alignment subfields
- After `seedData` runs, 5 embedding generation jobs are scheduled via the existing pipeline
- `bunx convex dev --once` succeeds
- `bun run build` succeeds
- `bun run test` passes with zero regressions
- Running `seedData` with `OPENAI_API_KEY` set results in all 5 profiles having vector embeddings populated
- The `findMatches` action against any seed submission returns relevant reviewer suggestions

## Dev Notes

- The new users are appended at the end of `buildSeedUsers()`, so existing user index references (0-7) in other seed functions remain valid. The `uids` destructuring is updated to include `reviewer4` and `reviewer5`.
- The embedding generation is asynchronous — the seed Action returns before embeddings are generated. In a demo scenario, wait a few seconds after seeding for the embedding jobs to complete.
- Dr. Liang Zhao (UC Berkeley CHAI) is referenced in Submission 2's authors list as a co-author. This is intentional — in a real journal, reviewers may be related to submission co-authors (conflict of interest handling is out of scope for seed data).
- Actually, reviewing the seed data: Submission 2's co-author is "Dr. Liang Zhao" from "University of Toronto Vector Institute" — a different person. The seed reviewer is "Dr. Liang Zhao" from "UC Berkeley CHAI". This name collision could be confusing but demonstrates that the system handles distinct users with the same name.
- The static `buildMatchResults` seed data for Submission 2 references the original 3 reviewers. After embeddings are generated, running `findMatches` live would produce results that include all 5 reviewers ranked by relevance.
- The `seedEmbeddings` internalMutation uses `ctx.scheduler.runAfter(0, ...)` which is the standard Convex pattern for deferred execution. The `0` delay means "run immediately after the current transaction commits."

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 7 spec | Sprint Agent |
