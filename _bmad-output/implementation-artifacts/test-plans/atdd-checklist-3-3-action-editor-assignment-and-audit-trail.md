# ATDD Checklist: Story 3.3 — Action Editor Assignment and Audit Trail

## AC1: Editor-in-Chief can assign action editor

- [ ] `listEditors` query returns users with `editor_in_chief` or `action_editor` role
- [ ] `listEditors` query requires editor role (rejects author/reviewer)
- [ ] `listEditors` returns only public fields: `_id`, `name`, `affiliation`, `role`
- [ ] `ActionEditorSelector` renders dropdown for `editor_in_chief` user
- [ ] `ActionEditorSelector` renders read-only display for non-EiC editors
- [ ] Read-only mode shows assigned editor name or "Unassigned"
- [ ] Selecting an editor calls `assignActionEditor` mutation

## AC2: Audit log entry created for assignment

- [ ] `assignActionEditor` mutation sets `actionEditorId` and `assignedAt` on submission
- [ ] `assignActionEditor` rejects non-`editor_in_chief` users
- [ ] `assignActionEditor` validates target user exists and has editor role
- [ ] Audit log entry created with `action: 'action_editor_assigned'`
- [ ] Audit log contains correct `submissionId`, `actorId`, `actorRole`, `details`
- [ ] Mutation defines both `args` and `returns` validators

## AC3: AuditTimeline displays chronological entries

- [ ] `listBySubmission` query returns audit entries for a submission ordered asc
- [ ] Each entry includes resolved `actorName` from user lookup
- [ ] `AuditTimeline` component renders connected dots with vertical line
- [ ] Each entry shows actor name, action description, details, and timestamp

## AC4: Cursor-based pagination for audit trail

- [ ] `listBySubmission` uses `paginationOptsValidator`
- [ ] `AuditTimeline` uses `usePaginatedQuery` with `initialNumItems: 20`
- [ ] "Load more" button appears when `status === "CanLoadMore"`
- [ ] Button disappears when `status === "Exhausted"`

## AC5: Audit logs are append-only

- [ ] No update or delete mutations exist on `auditLogs` table
- [ ] Only `logAction` internalMutation inserts into `auditLogs`

## AC6: AuditTimeline filterable by action type

- [ ] Filter chips rendered above timeline for available action types
- [ ] Clicking a chip filters entries by action type
- [ ] Filter is passed as arg to paginated query (server-side)
- [ ] No filter active shows all entries

## AC7: Re-assignment of action editor

- [ ] Reassignment updates `actionEditorId` and `assignedAt`
- [ ] Audit entry created with `action: 'action_editor_reassigned'`
- [ ] Details show `'Reassigned from {oldName} to {newName}'`
