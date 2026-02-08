# Story 7.1: Seed Data Generation Action

## Story

**As a** developer deploying the prototype,
**I want** a seed data Action that populates the system with realistic data across all pipeline stages,
**So that** evaluators see a living journal, not an empty shell.

## Status

**Epic:** 7 - Seed Data & Demo Experience
**Status:** ready
**Priority:** High (delivers FR47, FR48, FR49, FR50 — seed data generation with realistic content, reviews, discussions, and published article across all pipeline stages)
**Depends on:** Stories 1-6 complete (all tables and editorial pipeline stages exist)

## Context

This story creates a `convex/seed.ts` Action that populates the database with a coherent set of interconnected data spanning the full editorial pipeline. The seed data tells a believable story: submissions at various stages, triage reports with substantive analysis, reviewer assignments, and audit trails that trace each submission through its lifecycle.

**What exists today:**
- `convex/schema.ts` — 12 tables covering users, submissions, triageReports, reviewerProfiles, reviews, reviewerAbstracts, discussions, matchResults, reviewInvites, auditLogs, notifications, payments
- `convex/helpers/transitions.ts` — `SUBMISSION_STATUSES`, `assertTransition()`, state machine
- `convex/helpers/auth.ts` — `withUser`, `withRole`, `withEditor`, `withAdmin` HOF wrappers
- `convex/helpers/errors.ts` — Structured error helpers
- `convex/audit.ts` — `logAction` internalMutation (append-only)
- All Convex function modules for submissions, reviews, triage, discussions, decisions, etc.
- No existing seed data functionality — this is built from scratch

**What this story builds:**
1. New `convex/seed.ts` module — Action for seeding the database with realistic demo data (default Convex runtime, no `"use node"` needed since there are no Node.js dependencies)
2. Idempotent seed logic — running twice does not create duplicates (checks for existing seed data before inserting)
3. 5+ submissions at different pipeline stages: TRIAGE_COMPLETE (with triage complete), UNDER_REVIEW (with active reviewer assignments), ACCEPTED (with completed reviews and discussion), REJECTED (with confidential reviews), PUBLISHED (with reviewer abstract)
4. Realistic triage reports with substantive structured analysis (scope, formatting, citations, claims) using real alignment research content
5. Seed users across all roles: authors, reviewers, action editors, editor-in-chief
6. Minimal `reviewerProfiles` records for seed reviewers (without embeddings — Story 7.2 adds embeddings)
7. Coherent audit trails for each submission's lifecycle
8. Run via `--preview-run 'seedData'` on preview deployments or `npx convex run seed:seedData` locally

**Key architectural decisions:**

- **Action (default runtime), not mutation:** The seed function is an Action (not a mutation) because it needs to orchestrate multiple database writes that collectively may exceed mutation size limits and because Actions can call `ctx.runMutation` for each logical batch. Unlike `triageActions.ts` or `matchingActions.ts`, the seed Action does NOT need `"use node"` because it makes no external API calls (no LLM, no embeddings, no HTTP). Using the default Convex runtime allows the action, internalQuery, and internalMutations to coexist in a single `convex/seed.ts` file.

- **internalMutation for all writes:** The seed Action uses a single `seedBatch` internalMutation that accepts arrays of records for each table. This avoids exposing any public mutation for seed data and keeps the write path controlled. The Action calls this internalMutation in batches to stay within Convex transaction limits.

- **Idempotency via sentinel check:** Before inserting, the Action queries for a user with a known seed email (e.g., `seed-eic@alignment-journal.org`). If found, it skips seeding. This is simpler than tracking a separate "seeded" flag and naturally prevents duplicate data.

- **Realistic AI alignment content:** Seed submissions use actual alignment research topics (corrigibility, mesa-optimization, scalable oversight, value alignment, interpretability) with substantive abstracts and triage analysis. This makes the demo experience feel authentic rather than lorem-ipsum placeholders.

- **Consistent timestamps and actor references:** All seed data uses a coherent timeline. Submissions are backdated, reviews are assigned after triage, discussions happen after reviews, and decisions follow the natural editorial flow. Actor IDs are consistent — the same editor-in-chief assigns action editors, the same reviewers write reviews for their assigned submissions.

- **Minimal reviewerProfiles (no embeddings):** The seed Action creates `reviewerProfiles` records for the 3 seed reviewers with `researchAreas` and `publications` but `embedding: undefined` (the field is optional in the schema). This provides valid `profileId` references for `matchResults` records. Story 7.2 later updates these profiles with actual vector embeddings generated from the research areas and publications.

- **No external API calls:** The seed data is fully static/hardcoded. No LLM calls, no embedding generation (Story 7.2 handles reviewer embeddings separately), no PDF uploads. Triage reports contain pre-written analysis. This makes seeding fast, deterministic, and reliable.

**Key architectural references:**
- FR47: Seed Action populates the database with coherent, interconnected data
- FR48: Triage reports contain substantive, structured analysis generated from real alignment paper content

## Acceptance Criteria

### AC1: Seed Action exists and runs successfully
**Given** the `convex/seed.ts` file
**When** `npx convex run seed:seedData` executes (or `--preview-run 'seedData'`)
**Then:**
- The file uses the default Convex runtime (no `"use node"` — not needed since there are no Node.js dependencies)
- It exports a `seedData` action (public, no args needed)
- All database writes use `ctx.runMutation(internal.seed.seed*, ...)` calling typed internalMutations
- The Action completes without errors, returning a summary of what was created (e.g., `{ users: 8, submissions: 5, reviews: 6, ... }`)

### AC2: Idempotent execution
**Given** the seed Action has already run once
**When** it runs again
**Then:**
- It detects existing seed data (via sentinel user check) and skips insertion
- It returns `{ alreadySeeded: true }` without creating duplicate data
- No errors are thrown on repeated execution

### AC3: Seed users across all roles
**Given** the seed Action runs
**When** users are created
**Then:**
- Creates at least 8 users covering all roles: 2 authors, 3 reviewers, 1 action editor, 1 editor-in-chief, 1 admin
- Each user has realistic `name`, `affiliation`, and `email` fields
- `clerkId` values use a `seed_` prefix (e.g., `seed_author_1`) to distinguish from real Clerk users
- All users have `createdAt` timestamps in a coherent timeline

### AC4: Five submissions at different pipeline stages
**Given** the seed data is populated
**When** examining the submissions
**Then:**
- **Submission 1 (TRIAGE_COMPLETE):** A submitted paper with all 4 triage passes complete (scope, formatting, citations, claims). Triage reports contain substantive analysis. Title and abstract relate to a real alignment research topic.
- **Submission 2 (UNDER_REVIEW):** A paper past triage, assigned to an action editor, with 2 reviewers assigned (one `in_progress`, one `assigned`). Has review invite records and match results.
- **Submission 3 (ACCEPTED):** A paper with completed reviews (`locked` status), discussion threads between author and reviewers, and an editorial decision of ACCEPTED with a decision note.
- **Submission 4 (REJECTED):** A paper with completed reviews and a REJECTED decision. Reviews have substantive content (summary, strengths, weaknesses, questions, recommendation).
- **Submission 5 (PUBLISHED):** A fully published article with completed reviews, a signed reviewer abstract (status `approved`, `authorAccepted: true`), and an editorial decision.
- Each submission has AI alignment research content — not placeholder text

### AC5: Substantive triage reports
**Given** the seed triage data
**When** examining triage reports for Submission 1 (and any other triaged submissions)
**Then:**
- Each triaged submission has 4 triage report records (scope, formatting, citations, claims)
- Each report has status `complete` with a `result` object containing: `finding` (2-3 sentences of substantive analysis), `severity` (realistic assessment: low/medium/high), and `recommendation` (actionable editorial guidance)
- Reports reference actual alignment research concepts (not generic filler)
- `idempotencyKey` values are unique per report
- `triageRunId` is consistent per submission
- Each report includes `attemptCount: 1` and a `completedAt` timestamp

### AC6: Coherent audit trails
**Given** the seed data
**When** examining audit logs
**Then:**
- Each submission has audit log entries that trace its lifecycle:
  - Submission 1: `submitAbstract` action
  - Submission 2: `submitAbstract`, `assignActionEditor`, `sendInvitations` actions
  - Submission 3: `submitAbstract`, `assignActionEditor`, `sendInvitations`, `acceptInvitation` (x2), `makeDecision` (ACCEPTED)
  - Submission 4: `submitAbstract`, `assignActionEditor`, `sendInvitations`, `acceptInvitation` (x2), `makeDecision` (REJECTED)
  - Submission 5: `submitAbstract`, `assignActionEditor`, `sendInvitations`, `acceptInvitation` (x2), `makeDecision` (ACCEPTED), plus published transition
- Actor IDs and roles are consistent (the editor-in-chief makes decisions, action editors assign reviewers, etc.)
- Timestamps are ordered correctly within each submission's trail

### AC7: Reviews with structured content
**Given** the submissions under review, accepted, rejected, or published
**When** examining review records
**Then:**
- Reviews have all 5 sections filled (summary, strengths, weaknesses, questions, recommendation)
- Content is written in realistic academic tone relevant to the specific submission topic
- Completed reviews have status `locked` with `submittedAt` and `lockedAt` timestamps
- In-progress reviews have partial section content (summary and strengths filled, rest empty)
- Each review has `revision: 1` (or higher for completed reviews)
- Each review has `createdAt` and `updatedAt` timestamps

## Technical Notes

### New `convex/seed.ts` module

Create using the default Convex runtime (no `"use node"` — the seed action makes no external API calls, so all exports can coexist in one file):

1. **`seedData` action** (public, no args):
   ```typescript
   args: {}
   returns: v.union(
     v.object({ alreadySeeded: v.boolean() }),
     v.object({
       users: v.number(),
       submissions: v.number(),
       triageReports: v.number(),
       reviewerProfiles: v.number(),
       reviews: v.number(),
       reviewerAbstracts: v.number(),
       discussions: v.number(),
       auditLogs: v.number(),
       notifications: v.number(),
       payments: v.number(),
       reviewInvites: v.number(),
       matchResults: v.number(),
     })
   )
   ```

2. **`checkSeeded` internalQuery** — checks if seed sentinel user exists:
   ```typescript
   args: {}
   returns: v.boolean()
   ```

3. **Typed batch internalMutations** — one per table, each with proper validators:

```typescript
// Each batch mutation accepts a typed array and returns inserted IDs
seedUsers: internalMutation({
  args: { records: v.array(v.object({ clerkId: v.string(), email: v.string(), name: v.string(), affiliation: v.string(), role: v.union(...), createdAt: v.number() })) },
  returns: v.array(v.id('users')),
  handler: async (ctx, { records }) => {
    const ids = []
    for (const record of records) {
      ids.push(await ctx.db.insert('users', record))
    }
    return ids
  },
})

// Similarly: seedSubmissions, seedTriageReports, seedReviewerProfiles, seedReviews,
// seedReviewerAbstracts, seedDiscussions, seedAuditLogs, seedNotifications,
// seedPayments, seedReviewInvites, seedMatchResults
```

The Action calls each in dependency order:
```typescript
const userIds = await ctx.runMutation(internal.seed.seedUsers, { records: [...] })
const submissionIds = await ctx.runMutation(internal.seed.seedSubmissions, { records: [...] })
const profileIds = await ctx.runMutation(internal.seed.seedReviewerProfiles, { records: [...] })
// ... etc, using IDs from previous batches for foreign keys
```

### Seed data content

**Users (8):**

| # | Name | Role | Affiliation | Email |
|---|------|------|-------------|-------|
| 1 | Dr. Sarah Chen | author | UC Berkeley CHAI | seed-author-1@alignment-journal.org |
| 2 | Dr. Marcus Webb | author | Oxford FHI | seed-author-2@alignment-journal.org |
| 3 | Dr. Yuki Tanaka | reviewer | MIRI | seed-reviewer-1@alignment-journal.org |
| 4 | Dr. Priya Sharma | reviewer | Anthropic | seed-reviewer-2@alignment-journal.org |
| 5 | Dr. James Mitchell | reviewer | DeepMind | seed-reviewer-3@alignment-journal.org |
| 6 | Dr. Elena Vasquez | action_editor | Center for AI Safety | seed-ae@alignment-journal.org |
| 7 | Dr. Robert Kim | editor_in_chief | Stanford HAI | seed-eic@alignment-journal.org |
| 8 | Admin User | admin | Alignment Journal | seed-admin@alignment-journal.org |

**Submissions (5):**

| # | Title | Author | Status | Topic |
|---|-------|--------|--------|-------|
| 1 | "Corrigibility Under Distributional Shift: A Framework for Robust Shutdown" | Dr. Chen | TRIAGE_COMPLETE | Corrigibility |
| 2 | "Mesa-Optimization in Transformer Architectures: Detection and Mitigation Strategies" | Dr. Webb | UNDER_REVIEW | Mesa-optimization |
| 3 | "Scalable Oversight via Recursive Reward Modeling with Human Feedback" | Dr. Chen | ACCEPTED | Scalable oversight |
| 4 | "Utility Functions and Goodhart's Law: Pathological Optimization in Reward Models" | Dr. Webb | REJECTED | Value alignment |
| 5 | "Mechanistic Interpretability of Alignment-Relevant Circuits in Large Language Models" | Dr. Chen | PUBLISHED | Interpretability |

**Timeline:**
- Day 0 (T-60 days): Users created, first submissions
- Day 1-5: Triage runs for Submissions 1-5
- Day 7-10: Reviewer assignments for Submissions 2-5
- Day 14-21: Reviews completed for Submissions 3-5
- Day 22-25: Discussions for Submission 3
- Day 28-30: Decisions for Submissions 3, 4, 5
- Day 35: Publication of Submission 5

### Triage report content examples

**Submission 1 — Scope pass:**
- Finding: "The paper presents a novel formal framework for analyzing corrigibility properties under distributional shift, directly addressing a core concern in AI alignment research. The work extends existing utility-indifference approaches with a distributional robustness guarantee."
- Severity: low
- Recommendation: "Well-scoped for the journal's focus on theoretical alignment. Recommend proceeding to full review."

**Submission 1 — Citations pass:**
- Finding: "References 23 key works in the corrigibility literature including Soares et al. (2015), Hadfield-Menell et al. (2017), and Turner et al. (2020). Missing citation to recent work by Christiano (2023) on shutdown problems under uncertainty."
- Severity: medium
- Recommendation: "Suggest authors address the Christiano (2023) gap in revision. Core citation coverage is adequate for review."

### Review content structure

Each completed review follows this structure:
- **Summary:** 3-4 sentence overview of the paper's contribution
- **Strengths:** 3-4 bullet points identifying key contributions
- **Weaknesses:** 2-3 bullet points identifying limitations
- **Questions:** 2-3 specific questions for the author
- **Recommendation:** Accept / Reject / Revise with 2-sentence justification

### Files to create

```
convex/seed.ts                                    — NEW: seed data Action with typed batch mutations
```

### Files to modify

None. This is a standalone new module.

### Implementation sequence

1. **Create `convex/seed.ts`** — Define the `checkSeeded` internalQuery, all typed `seed*` internalMutations (seedUsers, seedSubmissions, seedTriageReports, seedReviewerProfiles, seedReviews, seedReviewerAbstracts, seedDiscussions, seedAuditLogs, seedNotifications, seedPayments, seedReviewInvites, seedMatchResults), and the `seedData` Action that orchestrates them.

2. **Define seed data constants** — All user profiles, submission content, triage report analysis, review content, discussion threads, and audit log entries as typed constants within the file.

3. **Implement idempotency check** — `checkSeeded` query looks for user with `clerkId: 'seed_eic'`.

4. **Implement the Action orchestration** — Call each batch mutation in dependency order: users first, then submissions (need authorIds), then dependent records (need submissionIds + userIds).

5. **Verify** — `bunx convex dev --once` succeeds, Action can be invoked via `npx convex run seed:seedData`.

### Import conventions

Follow the codebase pattern:
- No `"use node"` directive (default Convex runtime)
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/_generated/server` for `action`, `internalMutation`, `internalQuery`
- Import from `convex/_generated/api` for `internal` reference
- Import from `convex/values` for `v` validator

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mutation size limit exceeded | Seed fails partway | Batch inserts per table (each table is its own mutation call) |
| `clerkId` conflicts with real users | Auth confusion | Use `seed_` prefix for all seed clerkIds |
| Stale seed data after schema changes | Runtime errors | Seed data uses same validators as schema |
| Missing foreign key references | Inconsistent data | Insert in dependency order: users → submissions → dependent tables |
| Timestamps out of order | Incoherent audit trail | Use computed offsets from a single `baseTime` constant |

### Dependencies on this story

- **Story 7.2 (Seed Reviewer Pool):** Updates the minimal `reviewerProfiles` records created here by adding vector embeddings generated from research areas and publications.
- **Story 7.3 (Seed Reviews, Discussions, Published Article):** May extend or reference the seed submissions and reviews created here. However, Story 7.1 already creates all review and discussion records needed — Story 7.3 focuses on ensuring the published article experience is complete.

### What "done" looks like

- `convex/seed.ts` exists using default Convex runtime (no `"use node"`)
- `seedData` action is exported and callable via `npx convex run seed:seedData`
- `checkSeeded` internalQuery detects existing seed data
- All batch mutations have properly typed args and returns validators (no `v.any()`)
- Running `seedData` creates 8 users, 5 submissions, 20 triage reports, 3 reviewer profiles, 6 reviews, 1 reviewer abstract, discussion threads, audit logs, notifications, payment records, and match results
- Running `seedData` twice returns `{ alreadySeeded: true }` without duplicates
- All seed data is coherent: timestamps ordered, actor IDs consistent, status transitions valid
- Triage reports contain substantive alignment research analysis (not lorem ipsum)
- Reviews contain structured academic content relevant to each submission
- Audit trails trace each submission's complete lifecycle
- `bunx convex dev --once` succeeds
- `bun run build` succeeds
- `bun run typecheck` succeeds with zero errors

## Dev Notes

- All seed internalMutations use properly typed validators (no `v.any()`). Each `seed*` mutation has explicit field validators matching the corresponding table schema.
- Seed `clerkId` values (e.g., `seed_author_1`) won't match any real Clerk user, so these seed users can't actually log in. This is intentional — they exist only to populate the database for demo/evaluation purposes.
- The `pdfStorageId` field on submissions is optional in the schema. Seed submissions will NOT have PDFs attached (no file uploads in seed). The `pdfFileName` and `pdfFileSize` can be set to realistic values for display purposes.
- For reviewer invites, generate a deterministic `tokenHash` using a predictable pattern (e.g., `seed_invite_${submissionIndex}_${reviewerIndex}`) since these tokens won't be used for actual invitation acceptance.
- `reviewAssignmentId` on `reviewInvites` is a string identifier — use a pattern like `seed_assignment_${n}`.
- Discussion threads use `authorId` (the person posting), not necessarily the submission author. Both authors and reviewers post in discussions.
- Notifications should include a mix of types that match the editorial workflow: review invitations, decision notifications, etc.
- The `matchResults` table stores reviewer match suggestions. Seed at least one complete match result for Submission 2 (UNDER_REVIEW) to demonstrate the matching UI. The `matches` array requires `profileId: v.id('reviewerProfiles')` — use the IDs returned from `seedReviewerProfiles`.
- `reviewerProfiles` are created with `embedding: undefined` (the field is optional). Story 7.2 updates these with actual vector embeddings. The `researchAreas` and `publications` fields should contain realistic alignment research content that will later be embedded.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 7 spec | Sprint Agent |
| 2026-02-08 | Fix: removed `"use node"` (no Node.js deps needed), added reviewerProfiles seeding for matchResults foreign keys | Sprint Agent |
