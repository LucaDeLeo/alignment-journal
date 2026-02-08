# ATDD Checklist: Story 3.6 - Reviewer Invitation and Progress Monitoring

## AC1: Send invitations from selected matches

- [ ] `sendInvitations` mutation creates `reviewInvites` record for each reviewer
- [ ] `sendInvitations` generates unique `reviewAssignmentId` per reviewer
- [ ] `sendInvitations` computes `tokenHash` as SHA-256 of `reviewAssignmentId`
- [ ] `sendInvitations` sets `expiresAt` to 24 hours from now
- [ ] `sendInvitations` creates `reviews` record with status `assigned`, revision 0
- [ ] `sendInvitations` creates `notifications` record with type `reviewer_invitation`
- [ ] `sendInvitations` logs audit entry with action `reviewer_invited`
- [ ] `sendInvitations` uses `withUser` + `EDITOR_ROLES` authorization
- [ ] `sendInvitations` prevents duplicate invitations (same reviewer + submission + non-revoked)
- [ ] `sendInvitations` defines both `args` and `returns` validators
- [ ] `sendInvitations` returns array of invite IDs

## AC2: Notification preview for invitation email

- [ ] Notification `type` is `'reviewer_invitation'`
- [ ] Notification `subject` follows `'Invitation to Review: {paper title}'` format
- [ ] Notification `body` includes: paper title, rationale, compensation range, deadline, placeholder link

## AC3: Invitation list with status

- [ ] `listBySubmission` query returns all invitations for a submission
- [ ] Each invitation includes: reviewer name, status, `createdAt`, `expiresAt`
- [ ] Status derivation: `revokedAt` → revoked, `consumedAt` → accepted, expired → expired, else → pending
- [ ] `listBySubmission` requires editor-level authorization
- [ ] `listBySubmission` defines both `args` and `returns` validators

## AC4: Revoke invitation

- [ ] `revokeInvitation` mutation sets `revokedAt` to current timestamp
- [ ] `revokeInvitation` logs audit entry with action `reviewer_invite_revoked`
- [ ] `revokeInvitation` throws for already-consumed or revoked invitation
- [ ] `revokeInvitation` defines both `args` and `returns` validators

## AC5: Review progress indicators

- [ ] `getReviewProgress` query returns progress data per reviewer
- [ ] Each entry includes: reviewer name, review status, invitation status, `createdAt`, days since assignment
- [ ] Green = submitted/locked, Amber = in_progress or assigned < 7 days, Red = assigned > 7 days
- [ ] `getReviewProgress` requires editor-level authorization
- [ ] `getReviewProgress` defines both `args` and `returns` validators

## AC6: Invitation panel UI

- [ ] Shows "{N} reviewers selected for invitation" summary
- [ ] Lists each selected reviewer with name, affiliation, rationale preview (80 chars)
- [ ] "Send Invitations" button triggers mutation
- [ ] Toast with undo appears after sending (10s window)
- [ ] Undo revokes all just-created invitations
- [ ] Button disabled while mutation in flight
- [ ] Selection cleared after successful send

## AC7: Progress monitoring section

- [ ] "Review Progress" section appears below matching section
- [ ] Displays invited reviewers with progress indicators
- [ ] Each entry shows: name, status dot + label, days since invitation
- [ ] Revokable invitations show "Revoke" button
- [ ] Section only appears when invitations exist
- [ ] Section updates reactively

## AC8: Audit trail integration

- [ ] `reviewer_invited` audit entry includes reviewer name and rationale snippet
- [ ] `reviewer_invite_revoked` audit entry includes reviewer name

## Verification

- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes
