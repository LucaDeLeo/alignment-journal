# Story 6.3: In-App Notification Previews

## Story

**As an** editor,
**I want** to see previews of all notification emails the system generates at each touchpoint,
**So that** I can verify communication content and the system demonstrates a complete notification flow.

## Status

**Epic:** 6 - Payment Tracking & Notifications
**Status:** complete
**Priority:** High (delivers FR52, FR53 — in-app notification previews for all email touchpoints)
**Depends on:** Story 3.6 (reviewer invitation with `notifications` records), Story 3.7 (editorial decisions with `notifications` records)

## Context

This story adds a notification preview system that displays in-app representations of all emails the system would send. Notifications are already being created as records in the `notifications` table by `sendInvitations` (reviewer invitations) and `makeDecision` (editorial decisions). This story surfaces those records as inline previews visible to editors on the submission detail page, and creates a dedicated query for fetching notifications by submission.

**What exists today:**
- `convex/schema.ts` — `notifications` table with `recipientId`, `submissionId`, `type`, `subject`, `body`, `readAt`, `createdAt`, index `by_recipientId`
- `convex/invitations.ts` — `sendInvitations` mutation inserts `notifications` records with type `reviewer_invitation`, including paper title, match rationale, compensation range, deadline, and invitation link
- `convex/decisions.ts` — `makeDecision` mutation inserts `notifications` records with types `decision_accepted`, `decision_rejected`, `decision_revision_requested`, including paper title, editor feedback, and next steps
- `app/features/editor/submission-detail-editor.tsx` — `EditorSubmissionDetail` component with sections: metadata, abstract, authors, keywords, triage, reviewer matching, review progress, payment summary, decision panel, pipeline progress, audit trail
- `app/features/editor/index.ts` — barrel exports for editor feature folder
- `convex/helpers/auth.ts` — `withUser` HOF wrapper
- `convex/helpers/roles.ts` — `EDITOR_ROLES`

**What this story builds:**
1. New `convex/notifications.ts` module — `listBySubmission` query for editor-facing notification previews
2. New `app/features/notifications/` feature folder — `notification-preview-list.tsx` component, `notification-constants.ts` with type labels/icons, `index.ts` barrel export
3. Updated `app/features/editor/submission-detail-editor.tsx` — renders `NotificationPreviewList` section inline near the audit trail

**Key architectural decisions:**

- **Self-contained component pattern (from Epic 5 retrospective):** The `NotificationPreviewList` component loads its own data via `useQuery` rather than receiving all data as props. This makes it embeddable in multiple contexts (submission detail, future notification center, command palette results).

- **New feature folder (from Epic 5 retrospective):** Creates `app/features/notifications/` with barrel exports, following the pattern established by `app/features/article/`. Does not add notification components to the editor feature folder.

- **Contextual inline display (from epic AC):** Notification previews are displayed inline on the submission detail page, not in a separate notification center. They appear near the audit trail since both provide chronological event context.

- **Editor-facing query:** Uses `withUser` + manual `EDITOR_ROLES.includes()` check, matching the existing pattern in other editor queries. Only editors can see notification previews for a submission.

- **Email preview card UI:** Each notification renders as a card showing recipient name, subject line, and body content — mimicking an email preview. The body is rendered as pre-formatted text since it already contains line breaks from the `buildNotificationBody` functions.

- **Notification type labeling:** Maps notification `type` strings to human-readable labels and icons (e.g., `reviewer_invitation` → "Reviewer Invitation" with mail icon, `decision_accepted` → "Decision: Accepted" with check icon).

- **No new notification creation:** This story only renders existing notifications that are already created by `sendInvitations` and `makeDecision`. No new notification types are added.

**Key architectural references:**
- FR52: System renders in-app notification previews for all email touchpoints (reviewer invitation, status updates, decision notifications)
- FR53: Notification previews show recipient, subject, and body content
- Epic 5 retrospective item #4: Notification previews should reuse the self-contained component pattern
- Epic 5 retrospective item #5: Follow the article feature folder pattern for `app/features/notifications/`

## Acceptance Criteria

### AC1: Notification preview list renders in editor submission detail

**Given** the submission detail page (editor view)
**When** the submission has at least one notification record
**Then:**
- A "Notification Previews" section renders below the Pipeline Progress section and above the Audit Trail
- It shows a list of notification preview cards in reverse chronological order (newest first)
- Each card shows: notification type badge, recipient name, subject line, and body content
- If no notifications exist, the section is hidden

### AC2: Notification preview card shows recipient, subject, and body (FR53)

**Given** a notification preview card
**When** it renders
**Then:**
- A type badge displays a human-readable label with an icon (e.g., "Reviewer Invitation" with MailIcon, "Decision: Accepted" with CheckCircleIcon)
- The recipient name shows as "To: [name]"
- The subject line shows as "Subject: [subject]" in semibold text
- The body content renders as pre-formatted text preserving line breaks
- The card shows the notification creation timestamp in relative format

### AC3: Reviewer invitation preview includes all required content

**Given** a reviewer invitation notification preview
**When** it renders
**Then:**
- The body includes: paper title, match rationale explaining why this reviewer was selected, compensation range ($500-$1,500), 4-week deadline, and the invitation link
- This content comes from the existing `buildNotificationBody` in `convex/invitations.ts` — no duplication needed

### AC4: Decision notification preview includes appropriate context

**Given** a decision notification (accepted, rejected, or revision requested)
**When** it renders
**Then:**
- The body includes appropriate context for the author recipient (acceptance congratulations with next steps, rejection with feedback, or revision request with required changes)
- This content comes from the existing `buildNotificationBody` in `convex/decisions.ts` — no duplication needed

### AC5: Notification previews are contextual and inline

**Given** the submission detail page
**When** notification previews render
**Then:**
- They are displayed inline on the submission detail page, not in a separate notification center
- They are positioned between the Pipeline Progress section and the Audit Trail
- They load their own data via `useQuery` (self-contained component pattern)

### AC6: Editor-only access to notification previews

**Given** the notification preview query
**When** a non-editor user attempts to access it
**Then:**
- The `listBySubmission` query in `convex/notifications.ts` uses `withUser` + `EDITOR_ROLES` check
- Non-editor users receive an unauthorized error
- Only editors can view notification previews for a submission

## Technical Notes

### New `convex/notifications.ts` module

Create a new file (default runtime, no `"use node"`):

**`listBySubmission` query** (uses `withUser` + `EDITOR_ROLES` check):

- Args: `{ submissionId: v.id('submissions') }`
- Returns: `v.array(v.object({ _id: v.id('notifications'), recipientName: v.string(), type: v.string(), subject: v.string(), body: v.string(), createdAt: v.number() }))`
- Implementation:
  1. Validate editor role via `EDITOR_ROLES.includes(ctx.user.role)`
  2. Query `notifications` table — filter by `submissionId` field (not indexed, but notification count per submission is small: 1 invitation per reviewer + 1 decision = typically 3-5 records)
  3. For each notification, look up recipient name from `users` table via `recipientId`
  4. Sort by `createdAt` descending (newest first)
  5. Return enriched notification objects

**Note on querying:** The `notifications` table has an index on `by_recipientId` but not on `submissionId`. Since `submissionId` is optional (some notifications may not have it), we query all notifications and filter by `submissionId` using `ctx.db.query('notifications').filter(q => q.eq(q.field('submissionId'), args.submissionId))`. This performs a full table scan of `notifications`, but the total notification volume across the entire prototype is tiny (a few dozen records at most), so this is acceptable. If the table grows, add a `by_submissionId` index to `convex/schema.ts` without changing the query logic.

### New `app/features/notifications/notification-constants.ts`

Maps notification types to display labels and lucide-react icon names:

```typescript
export const NOTIFICATION_TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  reviewer_invitation: { label: 'Reviewer Invitation', icon: 'Mail' },
  decision_accepted: { label: 'Decision: Accepted', icon: 'CheckCircle' },
  decision_rejected: { label: 'Decision: Rejected', icon: 'XCircle' },
  decision_revision_requested: { label: 'Decision: Revision Requested', icon: 'AlertCircle' },
}
```

### New `app/features/notifications/notification-preview-list.tsx`

**`NotificationPreviewList` component:**
- Props: `submissionId: Id<'submissions'>`
- Calls `useQuery(api.notifications.listBySubmission, { submissionId })` for reactive data
- If query returns `undefined` (loading), shows skeleton
- If query returns empty array, returns `null` (section hidden)

**Layout:**
- Section header: BellIcon + "Notification Previews" (same style as other section headers in `submission-detail-editor.tsx`)
- List of notification cards, each showing:
  - Type badge (colored based on notification type)
  - "To: [recipient name]" in muted text
  - "Subject: [subject line]" in semibold
  - Body content in a bordered, pre-formatted block with `whitespace-pre-line`
  - Relative timestamp (e.g., "2 hours ago")
- Cards use a subtle border and background to visually distinguish them as email previews

### Files to create

```
convex/notifications.ts                                   — NEW: listBySubmission query
app/features/notifications/notification-constants.ts      — NEW: type labels and icon mapping
app/features/notifications/notification-preview-list.tsx  — NEW: NotificationPreviewList component
app/features/notifications/index.ts                       — NEW: barrel exports
```

### Files to modify

```
app/features/editor/submission-detail-editor.tsx          — MODIFY: render NotificationPreviewList section
```

### Implementation sequence

1. **Create `convex/notifications.ts`** — `listBySubmission` query with editor auth, recipient name enrichment, descending sort.

2. **Create `app/features/notifications/notification-constants.ts`** — type config mapping.

3. **Create `app/features/notifications/notification-preview-list.tsx`** — self-contained component with `useQuery`, notification cards, type badges, relative timestamps.

4. **Create `app/features/notifications/index.ts`** — barrel export for `NotificationPreviewList`.

5. **Update `app/features/editor/submission-detail-editor.tsx`** — add `NotificationPreviewList` section between Pipeline Progress and Audit Trail.

6. **Verify typecheck, lint, and build** — `bun run typecheck`, `bun run lint`, `bun run build`, `bunx convex dev --once`.

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`
- Import from `~/components/ui/` for shadcn components
- Import from `~/features/notifications` for notification components (barrel export)
- Import from `convex/_generated/api` for API references
- Import from `convex/helpers/roles` for `EDITOR_ROLES`

### shadcn/ui components to use

- `Badge` — notification type badges (already installed)
- `Card`, `CardContent`, `CardHeader` — notification preview cards (already installed at `~/components/ui/card`)
- `Separator` — between notification cards (already installed)
- lucide-react icons: `BellIcon`, `MailIcon`, `CheckCircleIcon`, `XCircleIcon`, `AlertCircleIcon`

### Component data flow

```
$submissionId.tsx (route)
  └─ <EditorSubmissionDetail>
       ├─ ... (existing sections)
       ├─ <StatusTimeline /> (Pipeline Progress)
       ├─ <NotificationPreviewList submissionId={...} />  ← NEW
       │    └─ useQuery(api.notifications.listBySubmission, { submissionId })
       │         → Array<{ _id, recipientName, type, subject, body, createdAt }>
       └─ <AuditTimeline /> (Audit Trail)
```

### Relative time formatting

Use a simple inline helper for relative timestamps (no library dependency):

```typescript
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
```

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| No index on `notifications.submissionId` | Slow query for large tables | Notification count per submission is tiny (3-5); acceptable for MVP. Add index later if needed |
| Unknown notification types in future | Missing label/icon | `NOTIFICATION_TYPE_CONFIG` falls back to generic "Notification" label with BellIcon for unknown types |
| Long notification bodies | Card height | Use `whitespace-pre-line` with `max-h-48 overflow-y-auto` for scrollable body |
| `submissionId` is optional on notifications | Query may miss notifications without submissionId | All current notification creators set submissionId — this is safe |

### Dependencies on this story

- **Story 7.3 (Seed Data):** Seeds notifications records alongside invitations and decisions, will be visible in notification previews.

### What "done" looks like

- `convex/notifications.ts` exists with `listBySubmission` query
- `listBySubmission` query defines both `args` and `returns` validators
- `listBySubmission` uses `withUser` + `EDITOR_ROLES` check for authorization
- `listBySubmission` enriches notifications with recipient names from users table
- `app/features/notifications/` folder exists with `notification-constants.ts`, `notification-preview-list.tsx`, and `index.ts`
- `NotificationPreviewList` component loads its own data via `useQuery` (self-contained pattern)
- Notification preview cards show: type badge, recipient name, subject, body, relative timestamp
- Reviewer invitation previews include paper title, rationale, compensation range, deadline, link
- Decision notification previews include appropriate context (congratulations/feedback/revision request)
- Notification previews are inline on the submission detail page, between Pipeline Progress and Audit Trail
- Section hidden when no notifications exist for the submission
- `bunx convex dev --once` succeeds
- `bun run build` succeeds
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes
- `bun run test` passes (no regressions)

## Dev Notes

- The `notifications` table already exists in `convex/schema.ts`. No schema changes required.
- All notification body content is already generated by `buildNotificationBody` functions in `convex/invitations.ts` and `convex/decisions.ts`. This story only surfaces those records — it does not duplicate or regenerate the content.
- The `notifications` table does not have a `by_submissionId` index, but `submissionId` is stored as an optional field on each record. For the editor-facing query, we can filter on this field. The volume per submission is very small (1 notification per reviewer invitation + 1 per decision = typically 3-5), so performance is not a concern.
- The notification previews section should render for any submission that has notifications, regardless of submission status. This lets editors see invitation previews even before decisions are made.
- The `formatRelativeTime` helper should be defined locally in the component file — it's too simple to warrant a shared utility.
- Card styling should use muted backgrounds and borders to visually suggest "email preview" rather than interactive cards. No click handlers needed.
- The notification type badge colors should align with the design system modes: invitation (neutral), accepted (green/success), rejected (red/destructive), revision requested (amber/warning).

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 6 spec | Sprint Agent |
