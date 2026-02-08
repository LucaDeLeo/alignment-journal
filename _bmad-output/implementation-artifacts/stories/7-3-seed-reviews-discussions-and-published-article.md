# Story 7.3: Seed Reviews, Discussions, and Published Article

## Story

**As an** evaluator (Jess or Dan),
**I want** to see sample reviews with discussion threads and at least one fully published article with a reviewer abstract,
**So that** I can assess the complete editorial workflow without waiting for real submissions.

## Status

**Epic:** 7 - Seed Data & Demo Experience
**Status:** ready
**Priority:** High (delivers FR49, FR50 — sample reviews with discussion threads and a published article with reviewer abstract)
**Depends on:** Stories 7.1 and 7.2 complete (seed data Action exists with users, submissions, reviews, discussions, reviewer abstract, and reviewer pool with embeddings)

## Context

Stories 7.1 and 7.2 created the seed data infrastructure in `convex/seed.ts` — a comprehensive Action that populates the database with 10 users, 5 submissions at different pipeline stages, 8 reviews, 1 reviewer abstract, 4 discussion messages, audit logs, payments, notifications, and a reviewer pool with vector embeddings. The core data for FR49 and FR50 already exists.

**What this story does:**

Story 7.3 is a **verification and enhancement story** that ensures the seeded data delivers a complete, polished demo experience — specifically:

1. **Add discussion threads to Submission 5 (PUBLISHED)** — Currently discussions only exist on Submission 3 (ACCEPTED). The published article should also have discussion threads so evaluators can see discussions in the editor view for a published submission.

2. **Add a threaded reply** to demonstrate the threading capability — Current discussions are all top-level messages. Adding a `parentId` reference shows the threading UI works.

3. **Add reviewer-abstract audit trail entries** — The current audit logs don't include reviewer-abstract events for Submission 5. Adding `abstract_assigned` and `abstract_author_accepted` audit entries for Submission 5 creates a more complete lifecycle trail.

4. **Verify end-to-end published article experience** — Ensure the published article at `/article/$id` renders correctly with the existing seed data: author abstract, signed reviewer abstract, and metadata. No PDF is expected (seed submissions intentionally skip file uploads).

**What exists today:**
- `convex/seed.ts` — Complete seed Action with 10 users (5 reviewers), 5 submissions, 8 reviews, 1 reviewer abstract (Submission 5, signed, approved, author-accepted), 4 discussions (Submission 3 only), 18+ audit logs, 5 notifications, 6 payments, 8 review invites, 1 match result, 5 reviewer profiles with scheduled embeddings
- Reviews on Submissions 2-5 with realistic academic content, structured sections (summary, strengths, weaknesses, questions, recommendation)
- Discussion thread on Submission 3 (ACCEPTED) — 4 messages between reviewer 1, reviewer 2, and author 1 about decomposability assumptions
- Reviewer abstract on Submission 5 (PUBLISHED) — 109-word signed abstract by Dr. Yuki Tanaka, status `approved`, `authorAccepted: true`
- `convex/articles.ts` — Public queries `getPublishedArticle` and `listPublished` (no auth required, Diamond Open Access)
- `app/features/article/` — Article page, metadata, and dual abstract display components

**Key architectural decisions:**

- **Discussions on the PUBLISHED submission matter for the demo:** Discussions are viewed via the authenticated `listBySubmission` query in the editor/review UI — not on the public article page. The public article page (`/article/$id`) does not render discussions. When an editor or reviewer views Submission 5's discussions, they see real reviewer names (editors/reviewers are never anonymized). When the author views them, the current identity gating anonymizes reviewers because `convex/discussions.ts:150` only de-anonymizes for authors when `status !== 'ACCEPTED'` — meaning `PUBLISHED` status is treated as anonymized for authors. This story does **not** change the identity gating logic; it seeds discussion data that can be verified through the editor/reviewer view.

- **Threaded reply via `parentId`:** The existing `seedDiscussions` internalMutation already supports `parentId: v.optional(v.id('discussions'))`. We add a reply message that references a parent discussion ID. Since discussions are inserted in order and IDs are returned, the first message's ID can be used as `parentId` for the reply.

- **Additional audit log entries:** Add `abstract_assigned` (reviewer abstract assigned to reviewer) and `abstract_author_accepted` (author accepts abstract) entries for Submission 5 to show the abstract lifecycle in the audit timeline. These action names match the actual actions emitted by `convex/reviewerAbstracts.ts` and the `ACTION_LABELS` mapping in `app/features/editor/audit-timeline.tsx`.

- **No new files, no new mutations:** All changes are within `convex/seed.ts` — modifying `buildDiscussions()` and `buildAuditLogs()` functions and the orchestration in `seedData` Action.

- **Discussion insertion requires two-phase approach:** Since threaded replies need the parent discussion's ID, and `seedDiscussions` returns inserted IDs, we insert all top-level discussions first, then insert replies in a second call using the returned IDs. This is the simplest approach and requires minimal changes to the existing orchestration.

**Key architectural references:**
- FR49: Seed data includes sample reviews with discussion threads
- FR50: Seed data includes at least 1 fully published article with reviewer abstract
- `convex/discussions.ts:42-93` — `listBySubmission` query (auth-gated via `withUser`, semi-confidential identity gating)
- `convex/discussions.ts:150` — Anonymization condition: `viewerRole === 'author' && submission.status !== 'ACCEPTED'` (only `ACCEPTED` de-anonymizes for authors; `PUBLISHED` does not)
- `convex/articles.ts:10-63` — `getPublishedArticle` public query (includes reviewer abstract if approved + author-accepted; does not include discussions)
- `app/features/article/dual-abstract-display.tsx` — Shows author + reviewer abstracts side-by-side
- `convex/reviewerAbstracts.ts:199` — Emits `abstract_assigned` audit action
- `convex/reviewerAbstracts.ts:531` — Emits `abstract_author_accepted` audit action
- `convex/reviewerAbstracts.ts:461` — Emits `abstract_approved` audit action
- `app/features/editor/audit-timeline.tsx:13-28` — `ACTION_LABELS` mapping for UI display

## Acceptance Criteria

### AC1: Discussion threads on Submission 5 (PUBLISHED)
**Given** the seed data is populated
**When** querying the `discussions` table filtered by `submissionId` for Submission 5
**Then:**
- At least 3 discussion messages exist on Submission 5
- Messages include `authorId` values for at least 2 distinct users (reviewer and author)
- At least one message has a non-null `parentId` reference (demonstrating threaded replies)
- Each message has non-empty `content`, valid `createdAt` / `updatedAt` timestamps, and references Submission 5's `submissionId`

### AC2: Discussion data viewable by editors/reviewers
**Given** Submission 5 has status `PUBLISHED` and discussion messages seeded
**When** an authenticated user with role `editor_in_chief` (or a reviewer assigned to Submission 5) calls `listBySubmission({ submissionId: <sub5Id> })`
**Then:**
- The query returns a non-null result with `messages` array containing the seeded discussions
- `displayName` values show real reviewer names (editors and reviewers are never anonymized by the identity gating logic)
- **Note:** When an author calls `listBySubmission` for a `PUBLISHED` submission, reviewer names are anonymized (pseudonymized as "Reviewer N") because `convex/discussions.ts:150` only de-anonymizes for status `ACCEPTED`. This story does not change that behavior — it is a known limitation documented here for awareness.

### AC3: Published article displays correctly with existing seed data
**Given** Submission 5 is PUBLISHED with a signed reviewer abstract
**When** viewed at `/article/$id` (via `getPublishedArticle` query)
**Then:**
- The article displays: title, authors with affiliations, author abstract, keywords
- The reviewer abstract is shown (signed by "Dr. Yuki Tanaka") because `status === 'approved'` and `authorAccepted === true` and `isSigned === true`
- No PDF download link is expected (seed submissions don't include file uploads — this is documented and intentional)
- The `decidedAt` and `createdAt` timestamps provide publication date metadata
- The public article page does **not** render discussions (this is expected — discussions are only available via the authenticated editor/review UI)

### AC4: Complete audit trail for Submission 5
**Given** the seed data audit logs
**When** querying the `auditLogs` table filtered by `submissionId` for Submission 5
**Then:**
- The audit trail includes these actions (matching the actual action strings emitted by the codebase): `status_transition` (submission), `action_editor_assigned`, `reviewer_invited`, `invitation_accepted` (x2), `decision_accepted`, `abstract_assigned` (reviewer abstract assigned to reviewer), `abstract_author_accepted` (author accepts abstract), `abstract_approved` (publication)
- Timestamps are ordered chronologically
- Actor IDs and roles are consistent: author submits, EIC assigns AE, AE invites reviewers, reviewers accept invitations, EIC decides, reviewer is assigned abstract (`actorId` = reviewer's user ID, `actorRole` = `reviewer`), author accepts abstract (`actorId` = author, `actorRole` = `author`), EIC approves abstract

### AC5: Existing seed data preserved
**Given** the enhanced seed Action
**When** it runs
**Then:**
- The seed Action inserts all previously-defined records (submissions, reviews, triage reports, payments, etc.) without error
- The idempotency check still works correctly: running `seedData` twice returns `{ alreadySeeded: true }`
- The return summary reflects updated counts (additional discussions and audit logs)

### AC6: Build verification
**Given** all changes are made
**When** running verification commands
**Then:**
- `bunx convex dev --once` succeeds (Convex functions typecheck and deploy)
- `bun run build` succeeds (no frontend TypeScript errors)
- `bun run test` passes (no regressions)

## Technical Notes

### Changes to `convex/seed.ts`

#### 1. Add discussions for Submission 5 to `buildDiscussions()`

Expand the function signature to accept Submission 5 IDs and reviewer 3 (who reviewed Submission 5 along with reviewer 1):

```typescript
function buildDiscussions(
  baseTime: number,
  ids: {
    submission3: Id<'submissions'>
    submission5: Id<'submissions'>
    author1: Id<'users'>
    reviewer1: Id<'users'>
    reviewer2: Id<'users'>
    reviewer3: Id<'users'>
  },
)
```

Add 3 new discussion messages for Submission 5 (the published interpretability article), after the existing 4 messages for Submission 3:

```typescript
// Submission 5 (PUBLISHED — Mechanistic Interpretability)
// Discussion between reviewers and author about the interpretability findings
{
  submissionId: ids.submission5,
  authorId: ids.reviewer1,
  content: 'The modularity finding for refusal circuits is striking. Have you investigated whether these circuits remain modular when the model is fine-tuned on adversarial data? My concern is that adversarial fine-tuning might entangle the refusal circuits with other capabilities in ways that undermine targeted safety interventions.',
  createdAt: sub5DiscussBase,
  updatedAt: sub5DiscussBase,
},
{
  submissionId: ids.submission5,
  authorId: ids.author1,
  content: 'Thank you for raising this important point. We ran a preliminary experiment on adversarial fine-tuning (Appendix D, Table 3) and found that moderate adversarial training (up to 5% of training data) preserves circuit modularity. However, at 20% adversarial data, we observed significant circuit entanglement — particularly between refusal and instruction-following circuits. We have added a discussion of this limitation in Section 6.2 of the revision.',
  createdAt: sub5DiscussBase + 6 * 3_600_000,
  updatedAt: sub5DiscussBase + 6 * 3_600_000,
},
{
  submissionId: ids.submission5,
  authorId: ids.reviewer3,
  content: 'Building on Reviewer 1\'s question — the entanglement at 20% adversarial data is concerning but not surprising given similar findings in representation engineering. Could you clarify whether the "honesty circuits" you identified overlap with the sycophancy circuits described in recent work by Perez et al. (2024)? This seems relevant for understanding the generalizability of your circuit taxonomy.',
  createdAt: sub5DiscussBase + DAY_MS,
  updatedAt: sub5DiscussBase + DAY_MS,
},
```

The discussion timestamp base for Submission 5 should be after reviews are locked: `baseTime + 22 * DAY_MS` (same timing as Submission 3 discussions).

#### 2. Add threaded reply for Submission 5

After inserting the top-level discussions, insert a reply that references the first Submission 5 discussion message's ID. This requires the two-phase insertion approach:

**Phase 1:** Insert all top-level discussions (existing 4 for Sub 3 + 3 new for Sub 5) → get discussion IDs back
**Phase 2:** Insert reply discussion(s) using the returned ID as `parentId`

The reply message:

```typescript
{
  submissionId: ids.submission5,
  authorId: ids.author1,
  parentId: sub5FirstDiscussionId,  // ID of the first Sub 5 discussion message
  content: 'Regarding the connection to Perez et al. (2024) — we found partial overlap between our "honesty circuits" and their sycophancy circuits (approximately 40% shared attention heads). However, the refusal circuits we identified are largely distinct, suggesting that refusal behavior relies on different mechanisms than sycophancy suppression. We have added a comparison table in Section 5.3 of the revision.',
  createdAt: sub5DiscussBase + DAY_MS + 4 * 3_600_000,
  updatedAt: sub5DiscussBase + DAY_MS + 4 * 3_600_000,
},
```

#### 3. Create `buildDiscussionReplies()` helper

Create a separate helper function that accepts discussion IDs and returns reply messages with `parentId`:

```typescript
function buildDiscussionReplies(
  baseTime: number,
  ids: {
    submission5: Id<'submissions'>
    author1: Id<'users'>
    sub5FirstDiscussionId: Id<'discussions'>
  },
): Array<{ ... }>
```

This is the single recommended approach — no alternatives. The function returns an array of reply records that include `parentId`.

#### 4. Update orchestration in `seedData` Action

```typescript
// 7. Discussions (Submission 3 and 5 — top-level messages)
const discussionsData = buildDiscussions(baseTime, {
  submission3: submissionIds[2],
  submission5: submissionIds[4],
  author1: uids.author1,
  reviewer1: uids.reviewer1,
  reviewer2: uids.reviewer2,
  reviewer3: uids.reviewer3,
})
const discussionIds: Array<Id<'discussions'>> = await ctx.runMutation(
  internal.seed.seedDiscussions,
  { records: discussionsData },
)

// 7a. Discussion replies (need parent IDs from step 7)
const repliesData = buildDiscussionReplies(baseTime, {
  submission5: submissionIds[4],
  author1: uids.author1,
  sub5FirstDiscussionId: discussionIds[4], // index 4 = first Sub 5 discussion (after 4 Sub 3 messages)
})
const replyIds: Array<Id<'discussions'>> = await ctx.runMutation(
  internal.seed.seedDiscussions,
  { records: repliesData },
)
```

#### 5. Add audit log entries for Submission 5 abstract lifecycle

Add to `buildAuditLogs()`. **Use the actual action strings** from `convex/reviewerAbstracts.ts` (not the old names from the codebase's mutation-level API):

```typescript
// Submission 5 — reviewer abstract lifecycle
t = baseTime + 25 * DAY_MS
logs.push({
  submissionId: ids.submissions[4],
  actorId: ids.reviewer1,   // reviewer is assigned the abstract
  actorRole: 'reviewer',
  action: 'abstract_assigned',
  details: 'Reviewer abstract assigned to Dr. Yuki Tanaka',
  createdAt: t,
})
t = baseTime + 33 * DAY_MS
logs.push({
  submissionId: ids.submissions[4],
  actorId: ids.author1,
  actorRole: 'author',
  action: 'abstract_author_accepted',
  details: 'Author accepted reviewer abstract',
  createdAt: t,
})
```

These entries fill the gap between `decision_accepted` (day 30) and `abstract_approved` (day 35) in the Submission 5 audit trail, showing the reviewer abstract lifecycle.

#### 6. Update return summary

The return value already counts dynamically (`discussions: discussionIds.length`). Since we now have two discussion insert calls, update to sum both:

```typescript
discussions: discussionIds.length + replyIds.length,
```

### Files to create

None. All changes are within existing files.

### Files to modify

```
convex/seed.ts     — Add discussions for Sub 5, threaded reply, audit log entries
```

### Implementation sequence

1. **Expand `buildDiscussions()`** — Add `submission5`, `reviewer3` params, add 3 new discussion messages for Submission 5
2. **Create `buildDiscussionReplies()`** — New helper returning reply messages with `parentId`
3. **Add audit log entries** — Add `abstract_assigned` and `abstract_author_accepted` entries for Submission 5 to `buildAuditLogs()`
4. **Update `seedData` Action orchestration** — Pass new params to `buildDiscussions()`, add second `seedDiscussions` call for replies, update return summary
5. **Verify** — `bunx convex dev --once` succeeds, `bun run build` succeeds, `bun run test` passes

### Import conventions

Follow the codebase pattern:
- No new imports needed (existing imports sufficient)
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Discussion `parentId` references wrong message | Threading UI shows incorrect hierarchy | Use explicit index into returned discussion IDs (index 4 = first Sub 5 message after 4 Sub 3 messages) |
| Discussion insert order affects parent ID indexing | Off-by-one error | Two-phase insertion: all top-level first, then replies separately |
| Additional audit logs change expected counts | Test assertions fail | No existing tests assert exact audit log counts; return value counts dynamically |
| Existing `buildDiscussions` callers affected | Type errors in seedData Action | Only one caller (`seedData`), updated in the same change |
| `PUBLISHED` status anonymizes reviewer names for authors | Author-view demo shows pseudonyms instead of real names | Documented in AC2 as known behavior; editor/reviewer views show real names. Fixing identity gating for `PUBLISHED` is out of scope (would require changing `convex/discussions.ts`) |
| Public article page does not render discussions | Evaluators may expect discussions on `/article/$id` | Documented in AC3; discussions are available in the editor/review UI, not the public article page |
| Audit action name mismatch with codebase | Audit entries not rendered correctly in timeline UI | Use actual action strings from `convex/reviewerAbstracts.ts` (`abstract_assigned`, `abstract_author_accepted`, `abstract_approved`) which match `ACTION_LABELS` in `audit-timeline.tsx` |

### Dependencies on this story

None. This is the final story in Epic 7.

### What "done" looks like

- `convex/seed.ts` includes 3+ discussion messages for Submission 5 (PUBLISHED)
- At least one discussion message has a `parentId` (threaded reply)
- Discussion content references specific interpretability findings (honesty circuits, refusal circuits, modularity)
- Audit trail for Submission 5 includes `abstract_assigned` and `abstract_author_accepted` entries with correct actor roles
- Published article at `/article/$id` renders correctly with seed data (verified by build success + query structure)
- `bunx convex dev --once` succeeds
- `bun run build` succeeds
- `bun run test` passes with zero regressions
- Running `seedData` returns updated counts reflecting additional discussions and audit logs
- Idempotency preserved: running twice returns `{ alreadySeeded: true }`

## Dev Notes

- The published article page (`/article/$id`) does not require a PDF to render — `pdfStorageId` is optional in the schema and the article page gracefully handles missing PDFs. The evaluator sees the full article metadata, abstracts, and text.
- The public article page does **not** render discussions. `listBySubmission` in `convex/discussions.ts` is auth-gated via `withUser` and is used by the editor/review UI, not the article page. The `publicConversation` field on submissions does not make discussions visible on `/article/$id`.
- **Identity gating for `PUBLISHED` status:** `convex/discussions.ts:150` anonymizes reviewer names for authors when `submission.status !== 'ACCEPTED'`. This means `PUBLISHED` submissions show pseudonyms to authors (only `ACCEPTED` de-anonymizes). Editors and reviewers always see real names regardless of status. This story seeds discussion data verifiable through the editor/reviewer view. Changing the identity gating condition to also de-anonymize for `PUBLISHED` is out of scope for this story.
- Discussion messages for Submission 5 use reviewers 1 (Dr. Yuki Tanaka) and 3 (Dr. James Mitchell), matching the actual review assignments for that submission.
- **Audit action names:** Use `abstract_assigned`, `abstract_author_accepted`, and `abstract_approved` — these are the actual action strings emitted by `convex/reviewerAbstracts.ts` (lines 199, 531, 461) and rendered by `ACTION_LABELS` in `app/features/editor/audit-timeline.tsx:13-28`. Do **not** use the old names `createDraft` / `authorAcceptAbstract` / `approveAbstract`.
- The `abstract_assigned` audit entry should use the reviewer's user ID as `actorId` with `actorRole: 'reviewer'`, matching the actual behavior in `convex/reviewerAbstracts.ts:195-199` where the reviewer is the actor for abstract assignment.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 7 spec | Sprint Agent |
| 2026-02-08 | Fixed: AC1 made objectively testable (removed "realistic academic tone", added concrete field checks). AC2 rewritten to specify viewer identity (editor/reviewer), document PUBLISHED anonymization behavior, remove false claim about public article visibility. AC3 updated to note article page does not render discussions. AC4 corrected audit action names to match codebase (`abstract_assigned`/`abstract_author_accepted`/`abstract_approved`), fixed actor role for abstract assignment (reviewer, not EIC). AC5 made testable (removed unbounded "remains unchanged" language). Technical Notes: removed dual-design ambiguity (single approach only), corrected audit action names and actor roles. Risks table: added PUBLISHED identity gating, public-view visibility, and audit action naming risks. Dev Notes: corrected all inaccurate claims about public visibility and identity gating. | Fix Agent |
