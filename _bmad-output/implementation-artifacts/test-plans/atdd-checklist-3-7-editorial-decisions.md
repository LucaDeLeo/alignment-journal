# ATDD Checklist: Story 3.7 - Editorial Decisions

## Unit Tests — `convex/__tests__/decisions.test.ts`

### AC1: Make editorial decision (Accept)
- [ ] `makeDecision` accepts submission in DECISION_PENDING with decision='ACCEPTED' and optional note
- [ ] Submission status transitions to ACCEPTED after makeDecision
- [ ] decisionNote is stored on submission when provided
- [ ] Notification created for author with type 'decision_accepted'
- [ ] Audit log scheduled with action 'decision_accepted'
- [ ] Returns { submissionId, decision, decidedAt }

### AC2: Make editorial decision (Reject)
- [ ] `makeDecision` rejects without decisionNote when decision='REJECTED' (validation error)
- [ ] `makeDecision` rejects with empty decisionNote when decision='REJECTED'
- [ ] Submission transitions to REJECTED with valid decisionNote
- [ ] Notification created for author with type 'decision_rejected'

### AC3: Make editorial decision (Revision Requested)
- [ ] `makeDecision` rejects without decisionNote when decision='REVISION_REQUESTED'
- [ ] Submission transitions to REVISION_REQUESTED with valid decisionNote
- [ ] Notification created for author with type 'decision_revision_requested'

### AC4: Undo decision within grace period
- [ ] `undoDecision` reverts status back to DECISION_PENDING within 10s
- [ ] `undoDecision` clears decisionNote on submission
- [ ] `undoDecision` logs audit entry with action 'decision_undone'
- [ ] `undoDecision` throws validation error after 10-second window
- [ ] `undoDecision` throws if submission status doesn't match previousDecision

### AC6: Payment estimate summary
- [ ] `getPaymentEstimates` returns correct ranges for submitted reviews ($600-$1500)
- [ ] `getPaymentEstimates` returns correct ranges for in_progress reviews ($500-$1200)
- [ ] `getPaymentEstimates` returns $0-$0 for assigned (not started) reviews
- [ ] `getPaymentEstimates` returns reviewer names with estimates

### Authorization
- [ ] `makeDecision` throws UNAUTHORIZED for non-editor roles (author, reviewer)
- [ ] `undoDecision` throws UNAUTHORIZED for non-editor roles
- [ ] `getPaymentEstimates` throws UNAUTHORIZED for non-editor roles

### Validation
- [ ] `makeDecision` throws if submission is not in DECISION_PENDING status
- [ ] `makeDecision` throws if submission not found
- [ ] `makeDecision` validates decisionNote length <= 2000 characters

### AC7: Author notification content
- [ ] Accept notification includes correct subject and body template
- [ ] Reject notification includes correct subject and body with editor's reasoning
- [ ] Revision notification includes correct subject and body with required changes

### AC8: Audit trail integration
- [ ] All four decision actions create appropriate audit log entries
- [ ] Audit entries include correct action types and details snippets

## Notes
- Tests are unit-level focusing on Convex function logic
- Component tests (AC5) are deferred — covered by typecheck + manual verification
- StatusTransitionChip non-interactive behavior verified by typecheck of prop addition
