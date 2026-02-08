# Story 3.3: Action Editor Assignment and Audit Trail

## Story

**As an** Editor-in-Chief,
**I want** to assign action editors to submissions and see a full audit trail,
**So that** I can delegate editorial responsibility and maintain accountability.

## Status

**Epic:** 3 - Editor Dashboard & Reviewer Assignment
**Status:** ready
**Priority:** High (third story of Epic 3, delivers FR22, FR25)
**Depends on:** Story 3.2 (submission detail view with `getByIdForEditor` query, `transitionStatus` mutation, `convex/audit.ts` with `logAction` internalMutation, `StatusTransitionChip`, `EditorSubmissionDetail` component), Story 3.1 (editor sidebar, pipeline dashboard, editor feature folder, `EDITOR_ROLES`), Story 1.2 (schema with `submissions.actionEditorId`, `submissions.assignedAt`, `auditLogs` table with `by_submissionId` index)

## Context

This story adds two capabilities to the editor submission detail view: (1) an action editor assignment interface that lets the Editor-in-Chief assign an action editor to a submission, and (2) an audit trail timeline that displays a chronological log of all editorial actions on a submission.

**What exists today:**
- `app/features/editor/submission-detail-editor.tsx` — full editor detail view with metadata, triage display, status transitions
- `convex/submissions.ts` — `getByIdForEditor` query (returns `actionEditorId`), `transitionStatus` mutation (logs to audit trail)
- `convex/audit.ts` — `logAction` internalMutation (appends to `auditLogs` table)
- `convex/schema.ts` — `auditLogs` table with `by_submissionId` and `by_actorId` indexes; `submissions` table with `actionEditorId: v.optional(v.id('users'))` and `assignedAt: v.optional(v.number())`
- `convex/users.ts` — `getUserById` query (public profile: name, affiliation, role), `listUsers` query (admin-only, full user docs)
- `convex/helpers/auth.ts` — `withUser`, `withEditor`, `withActionEditor` wrappers
- `app/features/editor/index.ts` — barrel exports for editor feature components

**What this story builds:**
1. A new Convex mutation (`assignActionEditor`) that assigns an action editor to a submission, restricted to `editor_in_chief` role, with audit trail logging
2. A new Convex query (`listEditors`) that returns users with editor-eligible roles (for the assignment dropdown)
3. A new Convex query (`listBySubmission`) in `convex/audit.ts` that returns paginated audit log entries for a submission with actor name resolution
4. An `ActionEditorSelector` component — a dropdown showing available editors, with one-click assignment
5. An `AuditTimeline` component — chronological timeline with connected dots, timestamps, actor names, action descriptions, and action type filtering
6. Integration of both components into the existing `EditorSubmissionDetail`

**Key architectural decisions:**

- **Assignment restriction:** Only `editor_in_chief` can assign action editors (per FR22). The `assignActionEditor` mutation uses `withUser` + manual role check for `editor_in_chief` specifically (not all `EDITOR_ROLES`). The UI conditionally renders the assignment selector only for `editor_in_chief` users.
- **Editors list query:** A new query in `convex/users.ts` returns users with `editor_in_chief` or `action_editor` roles. This is a lightweight query used by the dropdown — not admin-only.
- **Audit trail query:** A paginated query in `convex/audit.ts` using `paginationOptsValidator`. It resolves `actorId` to actor names server-side for display. Supports optional action type filtering.
- **Audit trail append-only:** No update or delete mutations exist on `auditLogs` — the `logAction` internalMutation is the only write path (AC5).
- **Deferred audit write:** Assignment logs use the same `ctx.scheduler.runAfter(0, internal.audit.logAction, {...})` pattern established in story 3.2.
- **Component integration:** Both `ActionEditorSelector` and `AuditTimeline` are added as new sections in `EditorSubmissionDetail`. The selector appears in the metadata area; the timeline appears as a new section at the bottom.
- **User context for role check:** The component uses the existing `useQuery(api.users.me)` to check if the current user is `editor_in_chief` to conditionally show the assignment selector.

**Key architectural references:**
- Architecture: role-gated mutations, audit trail (FR25), action editor assignment (FR22)
- Schema: `submissions.actionEditorId`, `submissions.assignedAt`, `auditLogs` table indexes
- UX: AuditTimeline with connected dots, filterable by action type
- Pattern: deferred audit write via `ctx.scheduler.runAfter(0, ...)`

## Acceptance Criteria

### AC1: Editor-in-Chief can assign action editor
**Given** a submission without an action editor
**When** the Editor-in-Chief views the submission detail page
**Then:**
- An `ActionEditorSelector` dropdown appears in the metadata section showing "Assign action editor"
- The dropdown lists all users with `editor_in_chief` or `action_editor` role (including self)
- Selecting an editor calls the `assignActionEditor` mutation
- On success, the selector updates to show the assigned editor's name
- The selector is only visible to users with `editor_in_chief` role
- Action editors and admins see a read-only display of the current assignment (or "Unassigned")

### AC2: Audit log entry created for assignment
**Given** an action editor is assigned to a submission
**When** the `assignActionEditor` mutation executes
**Then:**
- The mutation sets `actionEditorId` and `assignedAt` on the submission
- An audit log entry is created via `ctx.scheduler.runAfter(0, internal.audit.logAction, {...})` with:
  - `submissionId`: the submission ID
  - `actorId`: the Editor-in-Chief's user ID
  - `actorRole`: `'editor_in_chief'`
  - `action`: `'action_editor_assigned'`
  - `details`: `'Assigned {editorName} as action editor'`
- The mutation defines both `args` and `returns` validators

### AC3: AuditTimeline displays chronological entries
**Given** the submission detail page
**When** the editor views the audit trail section
**Then:**
- An `AuditTimeline` component displays all audit log entries for the submission in chronological order (oldest first)
- Each entry shows: a connected dot, timestamp (formatted), actor name, and action description
- The timeline uses a vertical line connecting dots for visual continuity
- Entries from `status_transition` show the transition details (e.g., "SUBMITTED → TRIAGING")
- Entries from `action_editor_assigned` show the assignment details

### AC4: Cursor-based pagination for audit trail
**Given** the audit trail contains many entries
**When** the editor scrolls through the timeline
**Then:**
- The `AuditTimeline` uses `usePaginatedQuery` with `initialNumItems: 20`
- A "Load more" button appears when `status === "CanLoadMore"`
- Loading state shows while fetching more entries
- When all entries are loaded (`status === "Exhausted"`), the button disappears

### AC5: Audit logs are append-only
**Given** the `auditLogs` table
**When** any code attempts to modify it
**Then:**
- The only mutation on `auditLogs` is `logAction` (internalMutation) — which only inserts
- No update or delete mutations exist on the `auditLogs` table
- This is verified by inspection — no new mutations are added that patch or delete audit log documents

### AC6: AuditTimeline filterable by action type
**Given** the audit trail with multiple action types
**When** the editor clicks a filter chip
**Then:**
- Filter chips appear above the timeline for each action type present (e.g., "Status transition", "Assignment")
- Clicking a chip filters the timeline to show only entries of that action type
- The filter is passed as an arg to the paginated query for server-side filtering
- When no filter is active, all entries are shown

### AC7: Re-assignment of action editor
**Given** a submission that already has an action editor assigned
**When** the Editor-in-Chief selects a different editor from the dropdown
**Then:**
- The mutation updates `actionEditorId` and `assignedAt` to the new values
- A new audit log entry is created: `action: 'action_editor_reassigned'`, `details: 'Reassigned from {oldName} to {newName}'`
- The timeline shows both the original assignment and the reassignment entries

## Technical Notes

### New files to create

```
app/features/editor/
  action-editor-selector.tsx   — dropdown for assigning action editor
  audit-timeline.tsx           — chronological audit trail display
```

### Files to modify

```
convex/submissions.ts             — add assignActionEditor mutation
convex/audit.ts                   — add listBySubmission paginated query
convex/users.ts                   — add listEditors query
app/features/editor/submission-detail-editor.tsx — integrate selector + timeline
app/features/editor/index.ts      — export new components
```

### Implementation sequence

1. **Add `listEditors` query to `convex/users.ts`**:
   - Uses `withUser` + manual role check for `EDITOR_ROLES` (any editor can see the list)
   - Returns users where `role` is `editor_in_chief` or `action_editor`
   - Returns only public fields: `_id`, `name`, `affiliation`, `role`
   - Defines both `args` and `returns` validators
   - No pagination needed — editor pool is small (< 50 users)

   ```typescript
   export const listEditors = query({
     args: {},
     returns: v.array(
       v.object({
         _id: v.id('users'),
         name: v.string(),
         affiliation: v.string(),
         role: roleValidator,
       }),
     ),
     handler: withUser(async (ctx: QueryCtx & { user: Doc<'users'> }) => {
       const EDITOR_ROLES = ['editor_in_chief', 'action_editor', 'admin'] as const
       if (
         !EDITOR_ROLES.includes(
           ctx.user.role as (typeof EDITOR_ROLES)[number],
         )
       ) {
         throw unauthorizedError('Requires editor role')
       }
       const allUsers = await ctx.db.query('users').collect()
       return allUsers
         .filter((u) => u.role === 'editor_in_chief' || u.role === 'action_editor')
         .map((u) => ({
           _id: u._id,
           name: u.name,
           affiliation: u.affiliation,
           role: u.role,
         }))
     }),
   })
   ```

2. **Add `assignActionEditor` mutation to `convex/submissions.ts`**:
   - Uses `withUser` + manual role check for `editor_in_chief` only (not all editor roles)
   - Args: `submissionId: v.id('submissions')`, `actionEditorId: v.id('users')`
   - Validates the target user exists and has `editor_in_chief` or `action_editor` role
   - Patches submission with `{ actionEditorId, assignedAt: Date.now(), updatedAt: Date.now() }`
   - Resolves target user name for audit details
   - If reassignment, fetches previous editor name and logs `'action_editor_reassigned'`; if first assignment, logs `'action_editor_assigned'`
   - Uses `ctx.scheduler.runAfter(0, internal.audit.logAction, {...})` for audit write
   - Returns `v.null()`
   - Defines both `args` and `returns` validators

   ```typescript
   export const assignActionEditor = mutation({
     args: {
       submissionId: v.id('submissions'),
       actionEditorId: v.id('users'),
     },
     returns: v.null(),
     handler: withUser(
       async (
         ctx: MutationCtx & { user: Doc<'users'> },
         args: { submissionId: Id<'submissions'>; actionEditorId: Id<'users'> },
       ) => {
         if (ctx.user.role !== 'editor_in_chief') {
           throw unauthorizedError(
             'Only Editor-in-Chief can assign action editors',
           )
         }

         const submission = await ctx.db.get('submissions', args.submissionId)
         if (!submission) {
           throw notFoundError('Submission', args.submissionId)
         }

         const targetUser = await ctx.db.get('users', args.actionEditorId)
         if (!targetUser) {
           throw notFoundError('User', args.actionEditorId)
         }
         if (
           targetUser.role !== 'editor_in_chief' &&
           targetUser.role !== 'action_editor'
         ) {
           throw validationError(
             'Target user must have editor_in_chief or action_editor role',
           )
         }

         const previousEditorId = submission.actionEditorId
         const now = Date.now()

         await ctx.db.patch('submissions', submission._id, {
           actionEditorId: args.actionEditorId,
           assignedAt: now,
           updatedAt: now,
         })

         // Determine if this is assignment or reassignment
         let action: string
         let details: string
         if (previousEditorId) {
           const previousEditor = await ctx.db.get('users', previousEditorId)
           const previousName = previousEditor?.name ?? 'Unknown'
           action = 'action_editor_reassigned'
           details = `Reassigned from ${previousName} to ${targetUser.name}`
         } else {
           action = 'action_editor_assigned'
           details = `Assigned ${targetUser.name} as action editor`
         }

         await ctx.scheduler.runAfter(0, internal.audit.logAction, {
           submissionId: args.submissionId,
           actorId: ctx.user._id,
           actorRole: ctx.user.role,
           action,
           details,
         })

         return null
       },
     ),
   })
   ```

3. **Add `listBySubmission` query to `convex/audit.ts`**:
   - Uses `paginationOptsValidator` from `convex/server`
   - Uses `withUser` + manual role check for `EDITOR_ROLES`
   - Args: `submissionId: v.id('submissions')`, `paginationOpts: paginationOptsValidator`, `actionFilter: v.optional(v.string())`
   - Queries `auditLogs` via `by_submissionId` index, ordered ascending (oldest first for timeline)
   - For each entry, resolves `actorId` to actor name via `ctx.db.get`
   - If `actionFilter` provided, filters entries by `action` field server-side (filter after pagination on page results — Convex doesn't support compound index on submissionId + action)
   - Returns paginated results with resolved actor names
   - Defines both `args` and `returns` validators

   ```typescript
   import { paginationOptsValidator } from 'convex/server'

   const EDITOR_ROLES = ['editor_in_chief', 'action_editor', 'admin'] as const

   export const listBySubmission = query({
     args: {
       submissionId: v.id('submissions'),
       paginationOpts: paginationOptsValidator,
       actionFilter: v.optional(v.string()),
     },
     returns: v.object({
       page: v.array(
         v.object({
           _id: v.id('auditLogs'),
           action: v.string(),
           details: v.optional(v.string()),
           actorName: v.string(),
           actorRole: v.string(),
           createdAt: v.number(),
         }),
       ),
       isDone: v.boolean(),
       continueCursor: v.string(),
     }),
     handler: withUser(
       async (
         ctx: QueryCtx & { user: Doc<'users'> },
         args: {
           submissionId: Id<'submissions'>
           paginationOpts: { numItems: number; cursor: string | null }
           actionFilter?: string
         },
       ) => {
         if (
           !EDITOR_ROLES.includes(
             ctx.user.role as (typeof EDITOR_ROLES)[number],
           )
         ) {
           throw unauthorizedError('Requires editor role')
         }

         const results = await ctx.db
           .query('auditLogs')
           .withIndex('by_submissionId', (idx) =>
             idx.eq('submissionId', args.submissionId),
           )
           .order('asc')
           .paginate(args.paginationOpts)

         // Resolve actor names and apply optional action filter
         const resolvedPage = await Promise.all(
           results.page
             .filter((entry) =>
               args.actionFilter ? entry.action === args.actionFilter : true,
             )
             .map(async (entry) => {
               const actor = await ctx.db.get('users', entry.actorId)
               return {
                 _id: entry._id,
                 action: entry.action,
                 details: entry.details,
                 actorName: actor?.name ?? 'Unknown',
                 actorRole: entry.actorRole,
                 createdAt: entry.createdAt,
               }
             }),
         )

         return {
           ...results,
           page: resolvedPage,
         }
       },
     ),
   })
   ```

4. **Create `app/features/editor/action-editor-selector.tsx`**:
   - Props: `submissionId: Id<'submissions'>`, `currentActionEditorId?: Id<'users'>`, `isEditorInChief: boolean`
   - If not `isEditorInChief`: renders read-only display (assigned editor name or "Unassigned")
   - If `isEditorInChief`: renders a `Select` (shadcn) dropdown with editors from `useQuery(api.users.listEditors)`
   - Current assignment shown as default value; placeholder "Assign action editor"
   - On selection: calls `useMutation(api.submissions.assignActionEditor)`
   - Shows a brief loading indicator during mutation
   - Uses `useQuery(api.users.getUserById, { userId: currentActionEditorId })` to resolve current editor name (when in read-only mode and `currentActionEditorId` is set)

   ```tsx
   // Component structure:
   // <div className="inline-flex items-center gap-2">
   //   <UserCircle2 className="size-4 text-muted-foreground" />
   //   {isEditorInChief ? (
   //     <Select value={currentActionEditorId} onValueChange={handleAssign}>
   //       <SelectTrigger className="w-[220px] h-8">
   //         <SelectValue placeholder="Assign action editor" />
   //       </SelectTrigger>
   //       <SelectContent>
   //         {editors.map(editor => (
   //           <SelectItem key={editor._id} value={editor._id}>
   //             {editor.name} ({editor.role === 'editor_in_chief' ? 'EiC' : 'AE'})
   //           </SelectItem>
   //         ))}
   //       </SelectContent>
   //     </Select>
   //   ) : (
   //     <span>{editorName ?? 'Unassigned'}</span>
   //   )}
   // </div>
   ```

5. **Create `app/features/editor/audit-timeline.tsx`**:
   - Props: `submissionId: Id<'submissions'>`
   - Uses `usePaginatedQuery(api.audit.listBySubmission, filterArgs, { initialNumItems: 20 })`
   - Renders a vertical timeline with connected dots
   - Each entry: dot (connected by vertical line), actor name (bold), action description, timestamp
   - Action type filter chips above timeline — computed from unique action types in loaded entries
   - "Load more" button at bottom when `status === "CanLoadMore"`
   - Empty state: "No audit trail entries yet"
   - Action label mapping: `status_transition` → "Status transition", `action_editor_assigned` → "Assignment", `action_editor_reassigned` → "Reassignment"

   ```tsx
   // Timeline entry structure:
   // <div className="flex gap-3">
   //   <div className="flex flex-col items-center">
   //     <div className="size-2.5 rounded-full bg-primary" />
   //     <div className="w-px flex-1 bg-border" />  {/* connector line */}
   //   </div>
   //   <div className="pb-6">
   //     <p className="text-sm">
   //       <span className="font-medium">{entry.actorName}</span>
   //       {' '}{formatActionLabel(entry.action)}
   //     </p>
   //     {entry.details && (
   //       <p className="text-sm text-muted-foreground">{entry.details}</p>
   //     )}
   //     <time className="text-xs text-muted-foreground">
   //       {formatDate(entry.createdAt)}
   //     </time>
   //   </div>
   // </div>
   ```

6. **Update `app/features/editor/submission-detail-editor.tsx`**:
   - Import `ActionEditorSelector` and `AuditTimeline`
   - Add `useQuery(api.users.me)` to get current user's role
   - Add `ActionEditorSelector` in the metadata row (after PDF section)
   - Add `AuditTimeline` as a new section at the bottom (after Pipeline Progress)
   - Pass `isEditorInChief` prop based on current user's role check

7. **Update `app/features/editor/index.ts`** — add exports:
   - `ActionEditorSelector` from `./action-editor-selector`
   - `AuditTimeline` from `./audit-timeline`

8. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`, `useMutation`, `usePaginatedQuery`
- Import from `~/components/ui/` for shadcn components
- Import from relative paths for sibling feature components

### shadcn/ui components to use

- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` — editor assignment dropdown (already installed at `~/components/ui/select`)
- `Button` — "Load more" button, filter chips (already installed)
- `Badge` — action type filter chips (already installed)
- lucide-react icons: `UserCircle2`, `HistoryIcon`, `Loader2`

### Component data flow

```
EditorSubmissionDetail (submission-detail-editor.tsx)
  ├─ useQuery(api.submissions.getByIdForEditor, { submissionId })
  ├─ useQuery(api.users.me)  — for role check
  │
  ├─ Header: Back link + Title + StatusTransitionChip
  ├─ Metadata: date, PDF link, ActionEditorSelector
  │    └─ ActionEditorSelector
  │         ├─ useQuery(api.users.listEditors)  — editor list for dropdown
  │         ├─ useQuery(api.users.getUserById, { userId: currentActionEditorId })  — resolve name (read-only mode)
  │         └─ useMutation(api.submissions.assignActionEditor)
  ├─ Abstract, Authors, Keywords (existing)
  ├─ TriageDisplay (existing)
  ├─ StatusTimeline (existing)
  └─ AuditTimeline (NEW)
       ├─ usePaginatedQuery(api.audit.listBySubmission, filterArgs, { initialNumItems: 20 })
       ├─ Action type filter chips (computed from loaded entries)
       └─ "Load more" button when CanLoadMore
```

### Audit action types

| Action | Description | Logged by |
|--------|-------------|-----------|
| `status_transition` | Status change | `transitionStatus` mutation (story 3.2) |
| `action_editor_assigned` | First-time assignment | `assignActionEditor` mutation (this story) |
| `action_editor_reassigned` | Reassignment to different editor | `assignActionEditor` mutation (this story) |

Future stories will add more action types: `reviewer_invited` (story 3.6), `decision_made` (story 3.7), etc.

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `Select` component import issue | Import error | Already installed at `app/components/ui/select.tsx`; import from `~/components/ui/select` |
| Editor-in-Chief role check on frontend only | Unauthorized assignment | Server-side `editor_in_chief` check in `assignActionEditor` mutation; UI is defense-in-depth |
| Audit trail action filter with pagination | Filtered results may yield empty pages | Post-pagination filter on page results; acceptable for prototype scale since audit entries per submission are typically < 100 |
| `usePaginatedQuery` with `order('asc')` | Oldest entries first may confuse users | Natural timeline order is oldest-first (top to bottom); timestamps clarify ordering |
| Actor name resolution per entry (N+1) | Performance with many entries | 20 entries per page × 1 lookup = 20 reads; acceptable for prototype scale; Convex handles efficiently in single query |
| `getUserById` for current assignment display | Extra query when no assignment | Use "skip" pattern: `useQuery(api.users.getUserById, currentActionEditorId ? { userId: currentActionEditorId } : 'skip')` |

### Dependencies on this story

- **Story 3.5 (Intelligent Reviewer Matching):** May reference action editor assignment in audit trail
- **Story 3.6 (Reviewer Invitation):** Will add `reviewer_invited` audit log entries; `AuditTimeline` will display them automatically
- **Story 3.7 (Editorial Decisions):** Will add `decision_made` audit log entries; `AuditTimeline` will display them automatically

### What "done" looks like

- The Editor-in-Chief can assign an action editor to any submission via a dropdown selector on the submission detail page
- The dropdown shows all users with `editor_in_chief` or `action_editor` role
- Assignment creates an audit log entry via deferred write
- Reassignment is supported — changing the assigned editor creates a reassignment audit entry
- Action editors and admins see a read-only display of the current assignment
- The `AuditTimeline` section displays all audit log entries for the submission in chronological order
- Each entry shows: connected dot, actor name, action description, details, timestamp
- The timeline uses cursor-based pagination with "Load more" (20 entries per page)
- Filter chips allow filtering by action type
- Audit logs remain append-only — only `logAction` internalMutation inserts entries
- The `assignActionEditor` mutation enforces `editor_in_chief` role server-side
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The `getByIdForEditor` query already returns `actionEditorId`, so the selector component can read the current assignment from the parent query data — no additional query needed for the assignment state itself.
- The `getUserById` query returns public fields (name, affiliation, role) for any authenticated user. This is sufficient for the read-only assignment display.
- For the `listEditors` query, scanning all users is acceptable at prototype scale. If the user pool grows large, a `by_role` index on the `users` table could be added, but this is not needed now.
- The `Select` component from shadcn/ui supports controlled mode with `value` and `onValueChange`. The `value` should be the Convex `Id<'users'>` string.
- The audit trail filter is applied post-pagination. This means that when filtering, some pages may return fewer than `numItems` entries. This is acceptable for prototype scope since audit entries per submission are typically < 100.
- Future stories (3.6, 3.7) will log additional action types. The `AuditTimeline` component is designed to handle arbitrary action strings — the `formatActionLabel` helper maps known actions to human-readable labels, with a default fallback for unknown actions.
- The `assignedAt` field on submissions is set to `Date.now()` on each assignment. This field is currently not displayed in the UI but is available for future use (e.g., showing "assigned 3 days ago" in the dashboard).

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 3 spec | Sprint Agent |
