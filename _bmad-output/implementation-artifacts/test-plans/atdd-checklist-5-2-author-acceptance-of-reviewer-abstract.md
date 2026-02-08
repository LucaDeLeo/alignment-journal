# ATDD Checklist: Story 5.2 — Author Acceptance of Reviewer Abstract

## AC1: Author sees reviewer abstract for comparison
- [ ] `getBySubmission` returns `authorAccepted` and `authorAcceptedAt` fields
- [ ] `AbstractReviewPanel` renders nothing when no abstract exists
- [ ] `AbstractReviewPanel` renders nothing when abstract status is `drafting`
- [ ] `AbstractReviewPanel` renders reviewer abstract content in serif font for `submitted` status
- [ ] `AbstractReviewPanel` renders reviewer abstract content for `approved` status
- [ ] Reviewer attribution shows real name when abstract is signed
- [ ] Reviewer attribution shows "Anonymous Reviewer" when abstract is unsigned
- [ ] Abstract status badge shown (Submitted / Approved)
- [ ] Word count metadata displayed

## AC2: Author accepts the reviewer abstract
- [ ] "Accept Abstract" button visible when `authorAccepted` is false/undefined
- [ ] Clicking "Accept Abstract" opens confirmation AlertDialog
- [ ] Confirming sets `authorAccepted: true` and `authorAcceptedAt`
- [ ] After acceptance, green "Accepted" badge with checkmark shown
- [ ] "Accept Abstract" button replaced by accepted confirmation
- [ ] `authorAcceptAbstract` mutation validates caller is submission author
- [ ] `authorAcceptAbstract` rejects if abstract status is `drafting`
- [ ] `authorAcceptAbstract` is idempotent (returns early if already accepted)
- [ ] Audit trail entry logged with action `abstract_author_accepted`

## AC3: Author provides feedback via discussion thread
- [ ] `DiscussionThread` rendered on submission detail for ACCEPTED submissions
- [ ] "Provide Feedback" hint text near abstract review section

## AC4: Acceptance cleared on content change
- [ ] `updateContent` clears `authorAccepted` when previously true
- [ ] `updateContent` clears `authorAcceptedAt` when previously set
- [ ] `updateContent` does not touch `authorAccepted` when it was false/undefined

## AC5: Audit trail logging
- [ ] `abstract_author_accepted` added to `ACTION_LABELS` in `audit-timeline.tsx`
- [ ] `abstract_assigned`, `abstract_submitted`, `abstract_approved` labels present (from 5.1)
