# ATDD Checklist — Story 6.3: In-App Notification Previews

## AC1: Notification preview list renders in editor submission detail

- [x] `NotificationPreviewList` renders a "Notification Previews" section with BellIcon header
- [x] Section renders between Pipeline Progress and Audit Trail in `EditorSubmissionDetail`
- [x] Notification cards display in reverse chronological order (newest first)
- [x] Each card shows: type badge, recipient name, subject, body
- [x] Section returns `null` (hidden) when no notifications exist

## AC2: Notification preview card shows recipient, subject, and body (FR53)

- [x] Type badge shows human-readable label with icon (e.g., "Reviewer Invitation" with MailIcon)
- [x] Recipient shows as "To: [name]"
- [x] Subject shows as "Subject: [subject]" in semibold
- [x] Body renders with `whitespace-pre-line` preserving line breaks
- [x] Card shows relative timestamp (e.g., "2h ago")

## AC3: Reviewer invitation preview includes all required content

- [x] Body includes paper title, match rationale, compensation range, deadline, invitation link
- [x] Content sourced from existing `buildNotificationBody` in `convex/invitations.ts` — no duplication

## AC4: Decision notification preview includes appropriate context

- [x] Accepted decision body includes congratulations and next steps
- [x] Rejected decision body includes feedback
- [x] Revision requested body includes required changes
- [x] Content sourced from existing `buildNotificationBody` in `convex/decisions.ts` — no duplication

## AC5: Notification previews are contextual and inline

- [x] Previews are inline on submission detail page, not a separate notification center
- [x] Component loads own data via `useQuery` (self-contained pattern)
- [x] Positioned between Pipeline Progress and Audit Trail sections

## AC6: Editor-only access to notification previews

- [x] `convex/notifications.ts` `listBySubmission` query uses `withUser` + `EDITOR_ROLES` check
- [x] Query defines both `args` and `returns` validators
- [x] Non-editor users receive unauthorized error
- [x] Query enriches notifications with recipient name from users table
- [x] Query sorts results by `createdAt` descending

## Build Verification

- [x] `bunx convex dev --once` succeeds
- [x] `bun run build` succeeds
- [x] `bun run typecheck` passes with zero errors
- [x] `bun run lint` passes
- [x] `bun run test` passes (no regressions)
