# Story 3.2: Submission Detail View with Triage Results

## Story

**As an** editor,
**I want** to view the full detail of any submission including its triage report and make status transition decisions,
**So that** I can make informed editorial decisions directly from the detail view.

## Status

**Epic:** 3 - Editor Dashboard & Reviewer Assignment
**Status:** ready
**Priority:** High (second story of Epic 3, delivers FR21, FR26 partially)
**Depends on:** Story 3.1 (editor pipeline dashboard with sidebar, `listForEditor` query, editor feature folder), Story 2.4 (triage display components: `TriageDisplay`, `TriageReportCard`, `TriageProgressIndicator`), Story 2.2 (`StatusTimeline`, `status-utils` with `STATUS_COLORS`, `STATUS_LABELS`, `formatDate`), Story 1.2 (schema, `VALID_TRANSITIONS`, `assertTransition`)

## Context

This story builds the editor-specific submission detail view at `/editor/$submissionId`. The existing route file is a placeholder showing only the submission ID. This story replaces it with a rich detail view that shows full paper metadata, PDF access, the complete triage report (reusing components from Epic 2), and an interactive StatusChip that allows editors to transition submission status.

**What exists today:**
- `/editor/$submissionId.tsx` — placeholder component showing just the submission ID with a "coming soon" message
- `convex/submissions.ts` — `getById` query (author-scoped, ownership-enforced); `listForEditor` query (editor-scoped with pagination)
- `app/features/submissions/triage-display.tsx` — `TriageDisplay` component (uses `useQuery` for triage data, handles progress vs report display)
- `app/features/submissions/triage-report-card.tsx` — `TriageReportCard` (collapsible card with severity indicators)
- `app/features/submissions/triage-progress.tsx` — `TriageProgressIndicator` (real-time progress steps)
- `app/features/submissions/status-timeline.tsx` — `StatusTimeline` (pipeline progress steps)
- `app/features/submissions/status-utils.ts` — `STATUS_COLORS`, `STATUS_LABELS`, `formatDate`, `getTimelineSteps`
- `convex/helpers/transitions.ts` — `VALID_TRANSITIONS`, `assertTransition`, `submissionStatusValidator`
- `convex/helpers/auth.ts` — `withUser` wrapper (supports multi-role manual checks)
- `convex/helpers/errors.ts` — `unauthorizedError`, `notFoundError`, `invalidTransitionError`
- `convex/triage.ts` — `getBySubmission` and `getProgress` queries (already support editor access via `assertTriageAccess`)
- No `transitionStatus` mutation exists yet — this story creates one

**What this story builds:**
1. A new Convex query (`getByIdForEditor`) that returns full submission data for editor roles, without author ownership enforcement
2. A new Convex mutation (`transitionStatus`) that validates and applies status transitions with editor role enforcement and audit trail logging
3. A new file `convex/audit.ts` with `logAction` internalMutation for audit trail logging (this file does not exist yet)
4. An `EditorSubmissionDetail` feature component in `app/features/editor/` with full metadata display, PDF link, triage report integration, and interactive status controls
5. A `StatusTransitionChip` component that shows the current status and drops down valid transitions
6. A confirmation dialog for destructive actions (desk reject) — Tier 3 pattern
7. Back navigation to the dashboard

**Key architectural decisions:**

- **Auth for detail view:** The query uses `withUser` + manual role check for `editor_in_chief`, `action_editor`, `admin` — same pattern as `listForEditor`. No ownership check (editors can see any submission).
- **Status transitions:** A new `transitionStatus` mutation uses `withUser` + editor role check + `assertTransition()` from the state machine. Desk reject uses a Tier 3 confirmation dialog (prototype simplification — avoids reverse transitions in the state machine).
- **Triage display reuse:** Directly imports `TriageDisplay` from `~/features/submissions` — this component already handles auth via its internal queries (`triage.getBySubmission` uses `assertTriageAccess` which allows editors).
- **PDF access:** Generates a serving URL via `ctx.storage.getUrl(pdfStorageId)` in the editor query. Convex storage URLs are short-lived and secure.
- **Audit trail:** Status transitions are logged to `auditLogs` table via an `internalMutation` in `convex/audit.ts`. This file does not exist yet — this story creates it with the `logAction` internal mutation.
- **Interactive StatusChip:** A dropdown appears when the editor clicks the status badge, showing valid transitions. Selecting a transition triggers the mutation. For `DESK_REJECTED`, a Tier 3 confirmation dialog is shown before executing.
- **Back navigation:** A back link returns to `/editor/` (the dashboard). The UX spec calls for a pull-back animation, but for prototype scope a simple link suffices.

**Key architectural references:**
- Architecture: role-gated queries (line 207-213), state machine transitions (line 178-187), audit trail (line 192), file storage serving URLs (line 482)
- Epic 3 story 3.2 AC: FR21 (triage results display for editors), FR26 partially (desk reject transition)
- UX spec: zoom-in/pull-back navigation (deferred for prototype — simple link navigation), StatusChip with interactive transitions, Tier 3 confirmation dialog for destructive actions

## Acceptance Criteria

### AC1: Full submission metadata display
**Given** an editor on the submission detail page at `/editor/$submissionId`
**When** the page loads
**Then:**
- The page shows: paper title, abstract (in serif font), authors with affiliations, keywords as badges, submission date, current status as a color-coded badge, and the PDF file name with a download link
- The Convex query `getByIdForEditor` uses `withUser` + manual role check allowing `editor_in_chief`, `action_editor`, `admin`
- The query returns the full submission record including `pdfUrl` (generated via `ctx.storage.getUrl`)
- The query defines both `args` and `returns` validators
- An empty/loading state is handled by the Suspense boundary in the editor layout

### AC2: Triage report section
**Given** the submission detail page
**When** the triage report section renders
**Then:**
- It shows `TriageReportCard` components for each dimension (scope fit, formatting, citations, claims) with severity indicators and expandable detail
- If triage is in progress (`TRIAGING` status), the `TriageProgressIndicator` is shown instead
- If triage has not started (status before `TRIAGING`), the section shows "Triage not yet started"
- The triage components are imported from `~/features/submissions` (reuse, not duplication)

### AC3: Interactive status transitions via StatusChip
**Given** a submission in a status that has valid transitions (e.g., `TRIAGE_COMPLETE`)
**When** the editor clicks the StatusChip
**Then:**
- A dropdown menu appears showing valid next statuses derived from `VALID_TRANSITIONS[currentStatus]`
- Each option uses the appropriate `STATUS_COLORS` and `STATUS_LABELS`
- Selecting a transition calls the `transitionStatus` mutation
- The chip animates to the new state on successful transition
- When no valid transitions exist (terminal states), the chip is non-interactive (no dropdown)

### AC4: Desk reject with confirmation dialog
**Given** a submission in `TRIAGE_COMPLETE` status
**When** the editor selects `DESK_REJECTED` from the StatusChip dropdown
**Then:**
- A confirmation dialog (AlertDialog) appears: title "Desk reject this submission?", description explaining the action cannot be undone
- Clicking "Cancel" closes the dialog with no action
- Clicking "Confirm Desk Reject" executes the `transitionStatus` mutation to move to `DESK_REJECTED`
- No state machine modifications are needed — `DESK_REJECTED` remains a terminal state
- This is a Tier 3 destructive action pattern (confirmation dialog before irreversible action)

### AC5: Status transition mutation
**Given** a valid status transition request from an editor
**When** `transitionStatus` is called
**Then:**
- The mutation validates the caller has an editor role (`editor_in_chief`, `action_editor`, `admin`)
- The mutation calls `assertTransition(currentStatus, nextStatus)` to validate the transition
- On valid transition: updates `status` and `updatedAt` on the submission
- On invalid transition: throws `INVALID_TRANSITION` ConvexError
- The mutation logs the transition to `auditLogs` via an internal mutation with: `submissionId`, `actorId`, `actorRole`, `action: 'status_transition'`, `details: 'from → to'`
- The mutation defines both `args` and `returns` validators

### AC6: Back navigation to dashboard
**Given** the submission detail page
**When** the editor clicks the back link
**Then:**
- Navigation returns to `/editor/` (the pipeline dashboard)
- The back link is positioned at the top of the page with an arrow icon
- The link text is "Back to dashboard"

### AC7: Real-time updates
**Given** the submission detail page is open
**When** the submission's status changes (from another user or from triage completion)
**Then:**
- The status badge, triage section, and timeline update automatically via Convex reactive queries
- No page refresh, polling, or manual action is required

### AC8: PDF download link
**Given** a submission with a PDF attached
**When** the editor views the detail page
**Then:**
- A PDF file section shows: file name, file size (formatted, e.g., "2.3 MB"), and a download link
- The download link opens the PDF in a new tab (via the Convex storage URL from the query)
- When no PDF is attached (edge case for older submissions), a "No PDF uploaded" message appears

## Technical Notes

### New files to create

```
app/features/editor/
  submission-detail-editor.tsx   — main editor detail view component
  status-transition-chip.tsx     — interactive status badge with dropdown
```

### New backend file to create

```
convex/audit.ts                   — NEW FILE: logAction internalMutation for audit trail logging
```

### Files to modify

```
convex/submissions.ts             — add getByIdForEditor query, transitionStatus mutation
app/features/editor/index.ts      — export new components
app/routes/editor/$submissionId.tsx — replace placeholder with real detail view
```

### Implementation sequence

1. **Create `convex/audit.ts`** (new file — does not exist in codebase):
   - Exports `logAction` as `internalMutation` (not public — called from other mutations via `ctx.scheduler.runAfter`)
   - Args: `submissionId: v.id('submissions')`, `actorId: v.id('users')`, `actorRole: v.string()`, `action: v.string()`, `details: v.optional(v.string())`
   - Returns: `v.null()`
   - Inserts into `auditLogs` table with `createdAt: Date.now()`
   - Imports `internalMutation` from `./_generated/server` and `v` from `convex/values`
   - The `auditLogs` table already exists in `convex/schema.ts` with `by_submissionId` and `by_actorId` indexes

2. **Add `getByIdForEditor` query to `convex/submissions.ts`**:
   - Uses `withUser` + manual role check for `editor_in_chief`, `action_editor`, `admin`
   - Returns full submission fields: `_id`, `_creationTime`, `title`, `authors`, `abstract`, `keywords`, `status`, `pdfStorageId`, `pdfFileName`, `pdfFileSize`, `pdfUrl` (nullable, generated via `ctx.storage.getUrl`), `actionEditorId`, `createdAt`, `updatedAt`
   - Throws `NOT_FOUND` if submission doesn't exist
   - Defines both `args` and `returns` validators

3. **Add `transitionStatus` mutation to `convex/submissions.ts`**:
   - Uses `withUser` + manual role check for `editor_in_chief`, `action_editor`, `admin`
   - Args: `submissionId: v.id('submissions')`, `newStatus: submissionStatusValidator`
   - Fetches submission, calls `assertTransition(submission.status, newStatus)`
   - Patches submission with `{ status: newStatus, updatedAt: Date.now() }`
   - Calls `ctx.runMutation(internal.audit.logAction, { ... })` to create audit trail entry
   - Returns `v.null()`
   - Defines both `args` and `returns` validators

4. **Create `app/features/editor/status-transition-chip.tsx`**:
   - Props: `submissionId: Id<'submissions'>`, `currentStatus: SubmissionStatus`
   - Reads `VALID_TRANSITIONS[currentStatus]` to determine dropdown options
   - If no valid transitions (terminal state like `DESK_REJECTED`, `REJECTED`, `PUBLISHED`), renders a static `Badge`
   - If valid transitions exist, wraps badge in `DropdownMenu` with transition options
   - Each option shows the target status label with appropriate color from `STATUS_COLORS`
   - For `DESK_REJECTED` target: wraps the dropdown item in `AlertDialog` for Tier 3 confirmation
   - For all other transitions: clicking the option calls `transitionStatus` mutation directly
   - Uses `useMutation` from `convex/react`
   - Handles `ConvexError` with `INVALID_TRANSITION` code: shows toast message "Status already changed — please refresh"
   - Install `alert-dialog` and `dropdown-menu` via `bunx shadcn@latest add alert-dialog dropdown-menu` if not present

5. **Create `app/features/editor/submission-detail-editor.tsx`**:
   - Props: `submissionId: Id<'submissions'>`
   - Uses `useQuery(api.submissions.getByIdForEditor, { submissionId })`
   - Handles `undefined` (loading) by returning `null` — Suspense boundary in editor layout covers initial load
   - Layout sections:
     - **Header:** Back link (`Link` to `/editor/`) + title + `StatusTransitionChip`
     - **Metadata grid:** Submission date (using `formatDate` from status-utils), PDF access (link opening in new tab + formatted file size), action editor info (if assigned)
     - **Abstract:** Serif font (`font-serif`), full text
     - **Authors:** Name + affiliation list
     - **Keywords:** Badge row (using shadcn `Badge variant="secondary"`)
     - **Triage:** `TriageDisplay` component (imported from `~/features/submissions` — fully functional and auth-aware, use directly without modification)
     - **Pipeline Progress:** `StatusTimeline` component (imported from `~/features/submissions`)
   - PDF URL null handling: when `pdfUrl` is `null` but `pdfFileName` exists, show "PDF unavailable" message; when no PDF at all, show "No PDF uploaded"
   - Follows existing `SubmissionDetail` component structure (see `app/features/submissions/submission-detail.tsx`) but adapted for editor context (no author ownership, includes StatusTransitionChip)

6. **Update `app/features/editor/index.ts`** — add exports:
   - `EditorSubmissionDetail` from `./submission-detail-editor`
   - `StatusTransitionChip` from `./status-transition-chip`

7. **Replace `app/routes/editor/$submissionId.tsx`** placeholder:
   - Import `EditorSubmissionDetail` from `~/features/editor`
   - Pass `submissionId` from route params (via `Route.useParams()`)
   - Remove the placeholder UI entirely

8. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Convex query pattern for `getByIdForEditor`

```typescript
const EDITOR_ROLES = ['editor_in_chief', 'action_editor', 'admin'] as const

export const getByIdForEditor = query({
  args: {
    submissionId: v.id('submissions'),
  },
  returns: v.object({
    _id: v.id('submissions'),
    _creationTime: v.number(),
    title: v.string(),
    authors: v.array(v.object({ name: v.string(), affiliation: v.string() })),
    abstract: v.string(),
    keywords: v.array(v.string()),
    status: submissionStatusValidator,
    pdfStorageId: v.optional(v.id('_storage')),
    pdfFileName: v.optional(v.string()),
    pdfFileSize: v.optional(v.number()),
    pdfUrl: v.union(v.null(), v.string()),
    actionEditorId: v.optional(v.id('users')),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      if (
        !EDITOR_ROLES.includes(
          ctx.user.role as (typeof EDITOR_ROLES)[number],
        )
      ) {
        throw unauthorizedError(
          'Requires editor, action editor, or admin role',
        )
      }

      const submission = await ctx.db.get('submissions', args.submissionId)
      if (!submission) {
        throw notFoundError('Submission', args.submissionId)
      }

      const pdfUrl = submission.pdfStorageId
        ? await ctx.storage.getUrl(submission.pdfStorageId)
        : null

      return {
        _id: submission._id,
        _creationTime: submission._creationTime,
        title: submission.title,
        authors: submission.authors,
        abstract: submission.abstract,
        keywords: submission.keywords,
        status: submission.status,
        pdfStorageId: submission.pdfStorageId,
        pdfFileName: submission.pdfFileName,
        pdfFileSize: submission.pdfFileSize,
        pdfUrl,
        actionEditorId: submission.actionEditorId,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
      }
    },
  ),
})
```

### Transition mutation pattern

```typescript
export const transitionStatus = mutation({
  args: {
    submissionId: v.id('submissions'),
    newStatus: submissionStatusValidator,
  },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'>; newStatus: SubmissionStatus },
    ) => {
      if (
        !EDITOR_ROLES.includes(
          ctx.user.role as (typeof EDITOR_ROLES)[number],
        )
      ) {
        throw unauthorizedError(
          'Requires editor, action editor, or admin role',
        )
      }

      const submission = await ctx.db.get('submissions', args.submissionId)
      if (!submission) {
        throw notFoundError('Submission', args.submissionId)
      }

      assertTransition(submission.status, args.newStatus)

      await ctx.db.patch('submissions', args.submissionId, {
        status: args.newStatus,
        updatedAt: Date.now(),
      })

      // Audit trail
      await ctx.scheduler.runAfter(0, internal.audit.logAction, {
        submissionId: args.submissionId,
        actorId: ctx.user._id,
        actorRole: ctx.user.role,
        action: 'status_transition',
        details: `${submission.status} → ${args.newStatus}`,
      })

      return null
    },
  ),
})
```

### Component data flow

```
EditorLayout (route.tsx)
  ├─ EditorSidebar (240px, persists)
  └─ <ErrorBoundary> + <Suspense>
       └─ <Outlet />
            └─ EditorSubmissionDetail ($submissionId.tsx)
                 ├─ useQuery(api.submissions.getByIdForEditor, { submissionId })
                 ├─ Header: Back link + Title + StatusTransitionChip
                 │    └─ StatusTransitionChip
                 │         ├─ reads: VALID_TRANSITIONS[currentStatus]
                 │         ├─ renders: DropdownMenu with valid transitions
                 │         └─ calls: useMutation(api.submissions.transitionStatus)
                 ├─ Metadata: date, PDF link, action editor
                 ├─ Abstract (serif)
                 ├─ Authors + Keywords
                 ├─ TriageDisplay (from ~/features/submissions)
                 │    ├─ useQuery(api.triage.getBySubmission)
                 │    └─ useQuery(api.triage.getProgress)
                 └─ StatusTimeline (from ~/features/submissions)
```

### File size formatting

```typescript
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
```

### Desk reject confirmation pattern

For prototype simplicity, use a Tier 3 confirmation dialog (AlertDialog from shadcn/ui) instead of the undo toast pattern. This avoids needing to add reverse transitions to the state machine:

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
      Desk Reject
    </DropdownMenuItem>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Desk reject this submission?</AlertDialogTitle>
      <AlertDialogDescription>
        This will move the submission to Desk Rejected status. This action
        cannot be undone from this interface.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => handleTransition('DESK_REJECTED')}>
        Confirm Desk Reject
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`, `useMutation`
- Import from `~/components/ui/` for shadcn components
- Import from `~/features/submissions` for triage/status components (reuse)

### shadcn/ui components to use

- `Badge` — status display (already installed)
- `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` — status transition menu (already installed)
- `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger` — desk reject confirmation (may need to install)
- `Separator` — section dividers (already installed)
- lucide-react icons: `ArrowLeft`, `FileTextIcon`, `CalendarIcon`, `UsersIcon`, `TagIcon`, `DownloadIcon`, `ChevronDownIcon`

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `TriageDisplay` uses `useQuery` (not `useSuspenseQuery`) | May cause undefined state flicker | `TriageDisplay` already handles `undefined` by returning `null`; Suspense boundary in layout covers initial load |
| `AlertDialog` not installed in shadcn | Import error | Check if `alert-dialog` is available; if not, install via `bunx shadcn@latest add alert-dialog` |
| `DropdownMenu` not installed in shadcn | Import error | Check if `dropdown-menu` is available; if not, install via `bunx shadcn@latest add dropdown-menu` |
| `ctx.storage.getUrl` returns `null` for deleted files | Broken PDF link | Handle null case: show "PDF unavailable" message |
| Editor attempts transition on stale status | `INVALID_TRANSITION` error | Convex reactive query keeps status fresh; catch ConvexError and show toast on conflict |
| Audit trail `logAction` doesn't exist yet | Runtime error | Create `logAction` as first step; verify it's accessible via `internal.audit.logAction` |
| `pdfUrl` type is `string | null` but validator uses `v.union(v.null(), v.string())` | Validator mismatch | Convex `v.union(v.null(), v.string())` correctly validates `null` and strings |

### Dependencies on this story

- **Story 3.3 (Action Editor Assignment and Audit Trail):** Extends the detail view with assignment interface and audit timeline; uses `transitionStatus` mutation and `logAction` internal mutation from this story
- **Story 3.5 (Intelligent Reviewer Matching):** Adds reviewer matching section to the detail view
- **Story 3.6 (Reviewer Invitation):** Adds invitation controls to the detail view
- **Story 3.7 (Editorial Decisions):** Extends the status transition chip with full accept/reject/revision workflow

### What "done" looks like

- The editor detail view at `/editor/$submissionId` shows full submission metadata: title, abstract (serif font), authors, keywords, PDF download link, submission date, and current status
- The triage report section reuses `TriageDisplay` from `~/features/submissions` — showing collapsible `TriageReportCard` components with severity indicators, or `TriageProgressIndicator` if triage is in progress
- The `StatusTransitionChip` shows a dropdown with valid transitions when clicked; clicking a transition updates the submission status via `transitionStatus` mutation
- Desk reject requires a confirmation dialog before executing (Tier 3 destructive action pattern)
- Status transitions are logged to the `auditLogs` table via `logAction` internal mutation
- The page updates in real-time via Convex reactive queries when status or triage data changes
- Back navigation returns to `/editor/` (the dashboard)
- The Convex query `getByIdForEditor` enforces editor role access server-side
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The existing `getById` query enforces author ownership and returns a narrower set of fields. The new `getByIdForEditor` returns the full record plus a generated `pdfUrl` — do not modify `getById` to avoid breaking the author view.
- `TriageDisplay` internally uses `useQuery` (not `useSuspenseQuery`) with the `"skip"` pattern for conditional fetching. This means it handles its own loading state gracefully within a Suspense boundary.
- The `assertTriageAccess` helper in `convex/triage.ts` already allows editor roles (`editor_in_chief`, `action_editor`, `admin`) to access triage data for any submission. No changes needed to triage queries.
- The `transitionStatus` mutation is intentionally general — it doesn't hardcode which transitions are allowed beyond what `VALID_TRANSITIONS` defines. Story 3.7 (Editorial Decisions) will add more nuanced decision logic.
- For the audit trail, the `transitionStatus` mutation calls `ctx.scheduler.runAfter(0, internal.audit.logAction, { ... })` to avoid blocking the status transition on the audit write. This is fine for eventual consistency — the audit entry appears within milliseconds.
- If `alert-dialog` or `dropdown-menu` are not installed, install them with `bunx shadcn@latest add alert-dialog dropdown-menu` before starting implementation.
- The `TriageDisplay` component from story 2.4 is fully functional and auth-aware (uses `assertTriageAccess` internally which allows editor roles). Import and use directly without modification.
- `DESK_REJECTED` is a terminal state in `VALID_TRANSITIONS` (no outgoing transitions). No state machine modifications are needed. The confirmation dialog prevents accidental desk reject.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 3 spec | Sprint Agent |
| 2026-02-08 | Validation fixes: resolved AC4 undo toast/confirmation dialog contradiction, clarified audit.ts is new file, removed state machine modification references, added explicit null handling for PDF URLs, added TriageDisplay reuse note | Sprint Agent |
