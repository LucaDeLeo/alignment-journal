# ATDD Checklist — Story 4.4: Semi-Confidential Threaded Discussion

## Backend Unit Tests (`convex/__tests__/discussions.test.ts`)

### listBySubmission query
- [ ] Returns null for unauthenticated/unauthorized viewer
- [ ] Returns messages sorted chronologically (oldest first) for authorized viewer
- [ ] Author viewer sees reviewer pseudonyms ("Reviewer 1", "Reviewer 2") when status is UNDER_REVIEW
- [ ] Author viewer sees real reviewer names when status is ACCEPTED (FR33)
- [ ] Author viewer sees pseudonyms permanently when status is REJECTED (FR34)
- [ ] Reviewer viewer sees all real names regardless of status
- [ ] Editor viewer sees all real names regardless of status
- [ ] Pseudonym assignment is deterministic by first message appearance order
- [ ] Returns `canPost: true` for author, editor, and reviewer with submitted/locked review
- [ ] Returns `canPost: false` for reviewer with assigned/in_progress review
- [ ] Returns `isAuthor: true` for submission author
- [ ] Returns `viewerRole` correctly for each role type
- [ ] Returns `publicConversation` from submission
- [ ] Returns `isOwnMessage: true` for viewer's own messages

### postMessage mutation
- [ ] Creates message with correct fields (authorId, editableUntil, isRetracted: false)
- [ ] Validates content is non-empty
- [ ] Validates content <= 5000 characters
- [ ] Validates user is a participant (author, reviewer with submitted/locked review, or editor)
- [ ] Rejects reviewer with assigned/in_progress review status
- [ ] Validates parentId belongs to same submission if provided
- [ ] Creates reply with parentId when provided

### editMessage mutation
- [ ] Edits message content within 5-minute window
- [ ] Rejects edit after editableUntil deadline
- [ ] Rejects edit by non-author of the message
- [ ] Validates content is non-empty and <= 5000 chars

### retractMessage mutation
- [ ] Sets isRetracted to true
- [ ] Rejects retraction by non-author of the message
- [ ] Rejects retraction when already retracted (idempotent guard)

### togglePublicConversation mutation
- [ ] Sets publicConversation to true on submission
- [ ] Rejects if user is not the submission author
- [ ] Rejects if submission status is not REJECTED
- [ ] Rejects if publicConversation is already true

## Frontend Component Tests (`app/features/review/__tests__/discussion-*.test.tsx`)

### DiscussionMessage
- [ ] Renders message with display name, role badge, timestamp, and content
- [ ] Renders retracted message as "[This message has been retracted]" in muted italic
- [ ] Shows Edit button for own message within edit window
- [ ] Shows Retract button for own message after edit window
- [ ] Hides action buttons for other users' messages
- [ ] Shows anonymous avatar (R1, R2) for anonymous reviewer messages
- [ ] Applies highlight animation class when `isHighlighted` is true

### DiscussionComposer
- [ ] Renders textarea with Post button
- [ ] Disables Post when content is empty
- [ ] Disables Post when content exceeds 5000 characters
- [ ] Shows character counter when content > 4000 characters
- [ ] Shows "Replying to [name]" indicator when replying
- [ ] Clears textarea after successful post

### DiscussionThread
- [ ] Shows placeholder when reviewer review status is assigned/in_progress
- [ ] Renders messages when review is submitted/locked
- [ ] Shows identity reveal note for ACCEPTED submissions when viewer is author
- [ ] Shows public conversation toggle for REJECTED submissions when viewer is author
- [ ] Groups replies under parent messages with indentation

## Acceptance Criteria Coverage

| AC | Test Coverage |
|----|--------------|
| AC1 | listBySubmission chronological sort, thread component render, role="log" |
| AC2 | listBySubmission pseudonym for author viewer |
| AC3 | listBySubmission real names for reviewer viewer |
| AC4 | listBySubmission real names for editor viewer |
| AC5 | listBySubmission ACCEPTED status reveals names |
| AC6 | listBySubmission REJECTED status keeps pseudonyms |
| AC7 | togglePublicConversation mutation tests |
| AC8 | postMessage mutation tests, composer tests |
| AC9 | editMessage mutation tests, message edit UI |
| AC10 | retractMessage mutation tests, message retract UI |
| AC11 | Message highlight animation class test |
| AC12 | Composer textarea, Post button, reply indicator, Cmd+Enter |
