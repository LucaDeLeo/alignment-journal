# ATDD Checklist: Story 3.2 - Submission Detail View with Triage Results

## AC1: Full submission metadata display
- [ ] `getByIdForEditor` query exists with `args` and `returns` validators
- [ ] Query uses `withUser` + manual role check for `editor_in_chief`, `action_editor`, `admin`
- [ ] Query returns full submission fields including `pdfUrl` via `ctx.storage.getUrl`
- [ ] Query throws `NOT_FOUND` for missing submissions
- [ ] Query throws `UNAUTHORIZED` for non-editor roles
- [ ] Page displays title, abstract (serif font), authors, keywords, date, status badge, PDF link

## AC2: Triage report section
- [ ] `TriageDisplay` imported from `~/features/submissions` (reuse, not duplication)
- [ ] Shows `TriageReportCard` components when triage is complete
- [ ] Shows `TriageProgressIndicator` when triage is in progress
- [ ] Shows nothing when triage has not started (status before TRIAGING)

## AC3: Interactive status transitions via StatusChip
- [ ] `StatusTransitionChip` reads `VALID_TRANSITIONS[currentStatus]` for dropdown options
- [ ] Dropdown shows valid transitions with appropriate colors and labels
- [ ] Selecting a transition calls `transitionStatus` mutation
- [ ] Terminal states render non-interactive badge (no dropdown)

## AC4: Desk reject with confirmation dialog
- [ ] `AlertDialog` appears when selecting `DESK_REJECTED`
- [ ] Dialog shows title and description explaining irreversibility
- [ ] Cancel closes dialog with no action
- [ ] Confirm executes `transitionStatus` mutation

## AC5: Status transition mutation
- [ ] `transitionStatus` mutation exists with `args` and `returns` validators
- [ ] Validates editor role (`editor_in_chief`, `action_editor`, `admin`)
- [ ] Calls `assertTransition` for state machine validation
- [ ] Updates `status` and `updatedAt` on submission
- [ ] Logs transition to `auditLogs` via `ctx.scheduler.runAfter(0, internal.audit.logAction, ...)`

## AC6: Back navigation to dashboard
- [ ] Back link positioned at top of page with arrow icon
- [ ] Links to `/editor/` (pipeline dashboard)
- [ ] Text reads "Back to dashboard"

## AC7: Real-time updates
- [ ] Uses `useQuery` (Convex reactive) for automatic updates
- [ ] No polling or manual refresh needed

## AC8: PDF download link
- [ ] Shows file name, formatted file size, and download link
- [ ] Download link opens in new tab via Convex storage URL
- [ ] Shows "No PDF uploaded" when no PDF exists
- [ ] Shows "PDF unavailable" when pdfUrl is null but pdfFileName exists

## Verification
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes
