# ATDD Checklist: Story 7.3 - Seed Reviews, Discussions, and Published Article

## AC1: Discussion threads on Submission 5 (PUBLISHED)

- [x] `buildDiscussions()` accepts `submission5` and `reviewer3` parameters
- [x] At least 3 discussion messages exist targeting Submission 5
- [x] Messages include `authorId` values for at least 2 distinct users (reviewer1, reviewer3, and author1)
- [x] At least one message has a non-null `parentId` reference (threaded reply via `buildDiscussionReplies`)
- [x] Each message has non-empty `content`, valid `createdAt`/`updatedAt` timestamps

## AC2: Discussion data viewable by editors/reviewers

- [x] Discussions for Submission 5 are inserted via `seedDiscussions` internal mutation
- [x] Build succeeds confirming type-correctness of discussion records (editor/reviewer can call `listBySubmission`)

## AC3: Published article displays correctly with existing seed data

- [x] Submission 5 has status `PUBLISHED` with reviewer abstract (already exists from 7.1)
- [x] Build succeeds confirming `/article/$id` route renders with existing seed data structure

## AC4: Complete audit trail for Submission 5

- [x] Audit logs include `abstract_assigned` with `actorId` = reviewer1, `actorRole` = `'reviewer'`
- [x] Audit logs include `abstract_author_accepted` with `actorId` = author1, `actorRole` = `'author'`
- [x] Existing `approveAbstract` action corrected to `abstract_approved` (matching `ACTION_LABELS`)
- [x] Timestamps are chronologically ordered: `abstract_assigned` (day 25) < `decision_accepted` (day 30) < `abstract_author_accepted` (day 33) < `abstract_approved` (day 35)

## AC5: Existing seed data preserved

- [x] `buildSeedUsers`, `buildSubmissions`, `buildReviews`, `buildReviewerAbstract` unchanged
- [x] Idempotency check (`checkSeeded`) still returns `true` on second run
- [x] Return summary counts discussions correctly (top-level + replies = `discussionIds.length + replyIds.length`)

## AC6: Build verification

- [x] `bunx convex dev --once` succeeds
- [x] `bun run build` succeeds
- [x] `bun run test` passes (111 tests, 0 failures)
