# Story 3.1: Editor Pipeline Dashboard

## Story

**As an** editor,
**I want** to see all submissions in a pipeline view organized by status with filtering and sorting,
**So that** I can instantly see what needs my attention.

## Status

**Epic:** 3 - Editor Dashboard & Reviewer Assignment
**Status:** ready
**Priority:** High (first story of Epic 3, delivers FR20)
**Depends on:** Story 2.2 (status-utils, StatusChip pattern, `SubmissionStatus` type), Story 2.4 (triage display components for reuse in later story 3.2), Story 1.4 (editor route layout at `/editor/` with role guard, `RouteSkeleton`, `ErrorBoundary`), Story 1.2 (schema with `submissions` table indexes: `by_status`, `by_authorId`, `by_actionEditorId`)

## Context

This story transforms the placeholder editor dashboard into a functional pipeline view. The existing `/editor/` route (story 1.4) has a layout with role guard (`editor_in_chief`, `action_editor`, `admin`) and an `index.tsx` placeholder showing "No submissions in the pipeline." This story replaces that placeholder with a real paginated data table of all submissions, with filter controls and a sidebar navigation.

**What exists today:**
- `/editor/route.tsx` — layout with `data-mode="editor"`, role guard for `editor_in_chief`, `action_editor`, `admin`
- `/editor/index.tsx` — placeholder component with empty state
- `convex/submissions.ts` — `listByAuthor` (author-scoped), `getById` (author-scoped), `create` (author-only)
- `app/features/submissions/status-utils.ts` — `STATUS_COLORS`, `STATUS_LABELS`, `formatDate`, `getTimelineSteps`
- `convex/schema.ts` — `submissions` table with `by_status`, `by_authorId`, `by_actionEditorId` indexes

**What this story builds:**
1. A new Convex query (`listForEditor`) that returns all submissions with pagination, accessible to editor roles
2. A new `app/features/editor/` feature folder with pipeline dashboard components
3. A sidebar navigation component for the editor layout
4. Filter controls with URL param persistence for status filtering and title search
5. A paginated data table with real-time Convex updates

**Key architectural decisions:**

- **Auth wrapper:** The backend query uses `withUser` with a manual role check allowing `editor_in_chief`, `action_editor`, and `admin` — matching the route-level guard in `route.tsx`. The existing `withEditor` wrapper only allows `editor_in_chief`, which is too restrictive for the dashboard.
- **Pagination:** Uses Convex `paginationOptsValidator` and `usePaginatedQuery` with `initialNumItems: 25` per architecture spec. The query uses `.paginate(paginationOpts)` on the server.
- **Filtering:** Status filters and title search persist in URL search params via TanStack Router's `validateSearch`. Filter application happens server-side where possible (status filter via `.withIndex('by_status')`), and client-side for title search (Convex doesn't support text search on table queries).
- **Sorting:** Default sort is by `updatedAt` descending (most recently changed first). The table supports sorting by title, status, and days-in-stage. Since Convex queries return ordered by index, client-side sort is used for non-index columns.
- **Real-time:** `usePaginatedQuery` from `convex/react` is inherently reactive — new submissions and status changes reflect automatically.
- **Feature folder:** Creates `app/features/editor/` with co-located components and barrel export, following the pattern established by `app/features/submissions/`.
- **Sidebar:** A 240px fixed sidebar integrated into the editor layout (`route.tsx`), containing navigation links and pipeline filter shortcuts. The sidebar is part of the layout, not the dashboard page — so it persists when navigating to submission detail.
- **Days in current stage:** Computed client-side from `submission.updatedAt` (which tracks the last status change timestamp).

**Key architectural references:**
- Architecture: pagination pattern (line 466-469), cursor-based via `paginationOptsValidator` + `usePaginatedQuery`
- UX spec: editor dashboard layout — sidebar (240px fixed) + main content area (fluid)
- Schema: `submissions` table indexes — `by_status`, `by_actionEditorId`
- Auth wrappers: `convex/helpers/auth.ts` — `withUser` for multi-role access
- Status utils: `app/features/submissions/status-utils.ts` — `STATUS_COLORS`, `STATUS_LABELS`

## Acceptance Criteria

### AC1: Paginated data table with all submissions
**Given** an authenticated editor (editor_in_chief, action_editor, or admin)
**When** they navigate to `/editor/`
**Then:**
- A data table displays all submissions regardless of author
- Columns: title, status (color-coded badge using `STATUS_COLORS`), reviewer response indicators (e.g., "2/3 accepted" with color-coded dots: green for accepted+submitted, amber for accepted+overdue, red for not responded — empty/dash when no reviewers assigned), triage severity indicator (highest severity from triage report: "Critical" red / "Minor" amber / "Pass" green — empty/dash when triage not complete), days in current stage (computed from `updatedAt`), and creation date
- The table uses `usePaginatedQuery` with `initialNumItems: 25`
- Submissions are ordered by `updatedAt` descending (most recently changed first)
- The Convex query uses `withUser` + manual role check allowing `editor_in_chief`, `action_editor`, `admin`
- The query defines both `args` and `returns` validators

### AC2: Cursor-based pagination with "Load more"
**Given** the submissions table contains more than 25 items
**When** the editor scrolls to the bottom
**Then:**
- A "Load more" button appears when `status === "CanLoadMore"`
- Clicking "Load more" fetches the next page of 25 items via `loadMore(25)`
- A loading state shows while fetching (`status === "LoadingMore"`)
- When all items are loaded (`status === "Exhausted"`), the button disappears

### AC3: Status filter with multi-select chips
**Given** the dashboard filter bar
**When** the editor clicks status filter chips
**Then:**
- Status chips for each `SubmissionStatus` are displayed as toggleable pills
- Multiple statuses can be selected simultaneously (multi-select)
- Selected chips use the corresponding `STATUS_COLORS` styling; unselected chips are muted
- The selected statuses persist in URL search params (e.g., `?status=SUBMITTED,TRIAGING`)
- The table filters to show only submissions matching selected statuses
- When no status is selected, all submissions are shown (no filter)

### AC4: Title search
**Given** the dashboard filter bar
**When** the editor types in the search input
**Then:**
- A debounced search input (300ms) filters submissions by title (case-insensitive partial match)
- The search term persists in URL search params (e.g., `?q=alignment`)
- The filter is applied client-side on the loaded page data (Convex doesn't support text search)
- Clearing the search shows all submissions again

### AC5: Row click navigation to submission detail
**Given** any submission row in the table
**When** the editor clicks it
**Then:**
- Navigation occurs to `/editor/$submissionId` (the existing route placeholder)
- The row has `cursor-pointer` and a hover highlight state
- The transition uses TanStack Router's `useNavigate` with the submission ID

### AC6: Editor sidebar navigation
**Given** the editor layout
**When** it renders
**Then:**
- A 240px fixed sidebar appears on the left side of the editor layout
- The sidebar contains: "Dashboard" link (to `/editor/`), and a "Pipeline" section with status group links as shortcuts
- The active link is highlighted with accent-muted background
- The main content area is fluid, filling the remaining width
- The sidebar is part of the editor `route.tsx` layout, not the dashboard page — it persists across editor sub-routes

### AC7: Real-time updates
**Given** the dashboard is displayed
**When** a new submission is created or a submission's status changes
**Then:**
- The table updates automatically via Convex reactive queries
- No page refresh, polling, or manual action is required
- New or updated submissions appear in their correct position based on sort order

### AC8: Empty state
**Given** no submissions exist (or no submissions match active filters)
**When** the dashboard renders
**Then:**
- A centered empty state displays with an icon, heading, and description
- When filters are active, the message indicates "No submissions match your filters" with a "Clear filters" action
- When no submissions exist at all, the message is "No submissions in the pipeline" (preserving the current placeholder text)

## Technical Notes

### New files to create

```
app/features/editor/
  pipeline-table.tsx         — main data table component with pagination
  pipeline-filters.tsx       — filter bar (status chips + search input)
  editor-sidebar.tsx         — 240px sidebar navigation
  editor-constants.ts        — editor-specific constants (status groups, etc.)
  index.ts                   — barrel export
```

### Files to modify

```
convex/submissions.ts                — add listForEditor paginated query
app/routes/editor/route.tsx          — integrate sidebar into layout
app/routes/editor/index.tsx          — replace placeholder with pipeline dashboard
```

### Implementation sequence

1. **Add `editor-constants.ts`** — Editor-specific constants:
   - `EDITOR_ROLES` array: `['editor_in_chief', 'action_editor', 'admin']`
   - `STATUS_GROUPS` for sidebar shortcuts: "Needs Attention" (SUBMITTED, TRIAGE_COMPLETE, DECISION_PENDING), "In Progress" (TRIAGING, UNDER_REVIEW), "Resolved" (ACCEPTED, REJECTED, DESK_REJECTED, PUBLISHED, REVISION_REQUESTED)
   - Re-export commonly used status utils

2. **Add `listForEditor` query to `convex/submissions.ts`**:
   - Uses `paginationOptsValidator` from `convex/server`
   - Uses `withUser` wrapper with manual role check: `if (!['editor_in_chief', 'action_editor', 'admin'].includes(ctx.user.role)) throw unauthorizedError(...)`
   - Accepts optional `status` filter arg (to leverage `by_status` index)
   - When status filter provided: `.withIndex('by_status', q => q.eq('status', statusFilter)).order('desc').paginate(paginationOpts)`
   - When no status filter: `.order('desc').paginate(paginationOpts)`
   - After paginating, for each submission in the page, fetch denormalized summary data:
     - **Reviewer indicators:** Query `reviews` table via `by_submissionId` index for the submission. Count by review status: `assigned` (not responded), `in_progress`/`submitted`/`locked` (accepted). Check if any accepted review's `updatedAt` is > 28 days old (overdue heuristic). Return counts: `{ total: number, accepted: number, submitted: number, overdue: number }`
     - **Triage severity:** Query `triageReports` table via `by_submissionId` index. Find the highest severity across all complete reports: `high` > `medium` > `low`. Return `highestSeverity: 'low' | 'medium' | 'high' | null` (null if triage not complete)
   - Returns paginated results with fields: `_id`, `title`, `status`, `authorId`, `updatedAt`, `createdAt`, `reviewerSummary` (nullable object with counts), `highestTriageSeverity` (nullable)
   - Defines both `args` and `returns` validators

3. **Create `app/features/editor/pipeline-filters.tsx`** — Filter bar:
   - Status chip buttons using `STATUS_LABELS` and `STATUS_COLORS`
   - Each chip is a toggleable button; selected chips are filled, unselected are outline
   - A search `Input` component with debounce (300ms) for title search
   - Props: `selectedStatuses: Array<SubmissionStatus>`, `onStatusToggle: (status) => void`, `searchQuery: string`, `onSearchChange: (query) => void`

4. **Create `app/features/editor/pipeline-table.tsx`** — Data table:
   - Uses `usePaginatedQuery(api.submissions.listForEditor, filterArgs, { initialNumItems: 25 })`
   - Renders a table with columns: Title, Status (badge), Reviewers (response indicator dots), Triage (severity badge), Days in Stage, Created
   - **Reviewers column:** Shows "N/M accepted" with colored dot indicators. Green dot = submitted, amber = accepted but overdue, red = not responded. Shows dash when no reviewers assigned (early pipeline stages)
   - **Triage column:** Shows highest severity badge from triage report using severity colors (red "Critical", amber "Minor", green "Pass"). Shows dash when triage not complete
   - "Days in stage" computed as `Math.floor((Date.now() - submission.updatedAt) / (1000 * 60 * 60 * 24))`
   - Rows are clickable with `cursor-pointer` and hover highlight
   - "Load more" button at bottom when `status === "CanLoadMore"`
   - Loading state for `"LoadingMore"`
   - Empty state when no results
   - Client-side title search filter applied on top of paginated results

5. **Create `app/features/editor/editor-sidebar.tsx`** — Sidebar navigation:
   - 240px fixed width, full height
   - "Dashboard" link using `Link` from TanStack Router
   - "Pipeline" section with status group shortcuts from `STATUS_GROUPS`
   - Active link detection via `useMatchRoute` or `useRouterState`
   - Muted styling with accent highlight for active item

6. **Create `app/features/editor/index.ts`** — Barrel exports

7. **Modify `app/routes/editor/route.tsx`** — Integrate sidebar:
   - Import `EditorSidebar`
   - Wrap `<Outlet />` in a flex layout: sidebar on left, main content area on right
   - Sidebar is outside the `<ErrorBoundary>` + `<Suspense>` boundary so it persists during page transitions

8. **Modify `app/routes/editor/index.tsx`** — Replace placeholder:
   - Import `PipelineTable`, `PipelineFilters` from `~/features/editor`
   - Use TanStack Router's `Route.useSearch()` to read URL search params
   - Define `validateSearch` on the route for typed URL params: `status?: string`, `q?: string`
   - Wire filter state to URL params via `useNavigate({ search: ... })`
   - Pass parsed status filters and search query to components

9. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Convex query pattern

```typescript
import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'

import { query } from './_generated/server'
import { withUser } from './helpers/auth'
import { unauthorizedError } from './helpers/errors'
import { submissionStatusValidator } from './helpers/transitions'

import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'

const EDITOR_ROLES = ['editor_in_chief', 'action_editor', 'admin'] as const

export const listForEditor = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(submissionStatusValidator),
  },
  returns: v.object({
    page: v.array(v.object({
      _id: v.id('submissions'),
      _creationTime: v.number(),
      title: v.string(),
      status: submissionStatusValidator,
      authorId: v.id('users'),
      actionEditorId: v.optional(v.id('users')),
      updatedAt: v.number(),
      createdAt: v.number(),
      reviewerSummary: v.union(
        v.null(),
        v.object({
          total: v.number(),
          accepted: v.number(),
          submitted: v.number(),
          overdue: v.number(),
        }),
      ),
      highestTriageSeverity: v.union(
        v.null(),
        v.literal('low'),
        v.literal('medium'),
        v.literal('high'),
      ),
    })),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: withUser(async (
    ctx: QueryCtx & { user: Doc<'users'> },
    args: { paginationOpts: { numItems: number; cursor: string | null }; status?: string },
  ) => {
    if (!EDITOR_ROLES.includes(ctx.user.role as typeof EDITOR_ROLES[number])) {
      throw unauthorizedError('Requires editor, action editor, or admin role')
    }

    let q = ctx.db.query('submissions')
    if (args.status) {
      q = q.withIndex('by_status', (idx) => idx.eq('status', args.status as string))
    }

    const results = await q.order('desc').paginate(args.paginationOpts)

    // Denormalize reviewer and triage summary for each submission in the page
    const enrichedPage = await Promise.all(
      results.page.map(async (s) => {
        // Reviewer summary
        const reviews = await ctx.db
          .query('reviews')
          .withIndex('by_submissionId', (idx) => idx.eq('submissionId', s._id))
          .collect()
        const reviewerSummary = reviews.length > 0
          ? {
              total: reviews.length,
              accepted: reviews.filter((r) => r.status !== 'assigned').length,
              submitted: reviews.filter((r) => r.status === 'submitted' || r.status === 'locked').length,
              overdue: reviews.filter((r) =>
                r.status === 'in_progress' && (Date.now() - r.createdAt) > 28 * 24 * 60 * 60 * 1000
              ).length,
            }
          : null

        // Triage severity (highest across complete reports)
        const triageReports = await ctx.db
          .query('triageReports')
          .withIndex('by_submissionId', (idx) => idx.eq('submissionId', s._id))
          .collect()
        const completedReports = triageReports.filter((r) => r.status === 'complete' && r.result)
        const SEVERITY_ORDER = { high: 3, medium: 2, low: 1 } as const
        let highestTriageSeverity: 'low' | 'medium' | 'high' | null = null
        for (const report of completedReports) {
          const sev = report.result!.severity
          if (!highestTriageSeverity || SEVERITY_ORDER[sev] > SEVERITY_ORDER[highestTriageSeverity]) {
            highestTriageSeverity = sev
          }
        }

        return {
          _id: s._id,
          _creationTime: s._creationTime,
          title: s.title,
          status: s.status,
          authorId: s.authorId,
          actionEditorId: s.actionEditorId,
          updatedAt: s.updatedAt,
          createdAt: s.createdAt,
          reviewerSummary,
          highestTriageSeverity,
        }
      }),
    )

    return {
      ...results,
      page: enrichedPage,
    }
  }),
})
```

### URL search params pattern

```typescript
// In /editor/index.tsx route definition
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  status: z.string().optional(),
  q: z.string().optional(),
})

export const Route = createFileRoute('/editor/')({
  validateSearch: searchSchema,
  component: EditorDashboard,
})

function EditorDashboard() {
  const { status, q } = Route.useSearch()
  const navigate = Route.useNavigate()
  // Parse status string to array: "SUBMITTED,TRIAGING" → ['SUBMITTED', 'TRIAGING']
  const selectedStatuses = status ? status.split(',') : []
  // ...
}
```

### Component data flow

```
EditorLayout (route.tsx)
  ├─ EditorSidebar (240px fixed, persists across sub-routes)
  └─ <ErrorBoundary> + <Suspense>
       └─ <Outlet />
            └─ EditorDashboard (index.tsx)
                 ├─ PipelineFilters (status chips + search input)
                 │    ├─ reads: selectedStatuses, searchQuery from URL params
                 │    └─ writes: URL params via navigate({ search: ... })
                 └─ PipelineTable
                      ├─ usePaginatedQuery(api.submissions.listForEditor, ...)
                      ├─ client-side title filter on loaded page data
                      └─ rows: title | status badge | reviewers (indicator dots) | triage severity | days in stage | created date
                           └─ onClick → navigate to /editor/$submissionId
```

### Sidebar layout in route.tsx

```tsx
// Updated EditorLayout
return (
  <div data-mode="editor" className="flex min-h-[calc(100vh-3.5rem)] bg-background">
    <EditorSidebar />
    <main className="flex-1 overflow-y-auto">
      <ErrorBoundary>
        <React.Suspense fallback={<RouteSkeleton variant="default" />}>
          <Outlet />
        </React.Suspense>
      </ErrorBoundary>
    </main>
  </div>
)
```

### Days in stage calculation

```typescript
function getDaysInStage(updatedAt: number): number {
  return Math.floor((Date.now() - updatedAt) / (1000 * 60 * 60 * 24))
}

function formatDaysInStage(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}
```

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `usePaginatedQuery`
- Import from `~/components/ui/` for shadcn components
- Import from relative paths for sibling feature components

### shadcn/ui components to use

- `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` — data table (may need to install)
- `Badge` — status indicators (already installed)
- `Input` — search field (already installed)
- `Button` — "Load more", filter chips (already installed)
- lucide-react icons: `LayoutDashboardIcon`, `SearchIcon`, `FilterIcon`, `ChevronRightIcon`, `Loader2`

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `usePaginatedQuery` returns `undefined` initially | Flash of empty state | Return loading skeleton while `results === undefined`; Suspense boundary handles initial load |
| Status filter with index only supports single status | Multi-select filters need client-side filtering | When multiple statuses selected, don't pass status to query (fetch all), filter client-side on loaded pages |
| Title search on large datasets is client-side only | May not find results in unloaded pages | Clear messaging: "Searching loaded submissions" or fetch more pages; acceptable for prototype scope |
| Table component not installed in shadcn | Import error | Check if `table` is available; if not, install via `bunx shadcn@latest add table` |
| Sidebar changes editor layout structure | May affect existing `/editor/$submissionId` placeholder | The placeholder is minimal and flex layout is additive; verify both routes render correctly |
| Role check mismatch between route guard and query | Users see empty dashboard or errors | Use same role list (`editor_in_chief`, `action_editor`, `admin`) in both route guard and Convex query |
| Denormalized reviewer/triage queries per page item | N+1 query pattern on each page load | Acceptable for prototype scale (25 items × 2 extra queries = 50 additional reads per page); Convex handles this efficiently within a single query function |

### Dependencies on this story

- **Story 3.2 (Submission Detail View with Triage Results):** Uses the sidebar from this story; navigates from dashboard rows to detail view
- **Story 3.3 (Action Editor Assignment):** Uses the sidebar; adds audit trail to submission detail
- **All Epic 3 stories:** Depend on the editor feature folder and sidebar established here

### What "done" looks like

- The editor dashboard at `/editor/` shows a paginated data table of all submissions with title, status badge, reviewer response indicators (colored dots showing accepted/overdue/not responded counts), triage severity indicator (highest severity from triage report), days in stage, and creation date
- The table uses `usePaginatedQuery` with cursor-based pagination (25 items per page, "Load more" button)
- Status filter chips allow multi-select filtering; search input allows title filtering; both persist in URL params
- A 240px sidebar with navigation persists across all editor sub-routes
- Clicking a submission row navigates to `/editor/$submissionId`
- The table updates in real-time via Convex reactive queries when submissions are created or statuses change
- Empty states are handled for both "no submissions" and "no matches for filters"
- The Convex query `listForEditor` enforces editor role access server-side
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The `by_status` index on `submissions` enables efficient single-status queries. For multi-status filtering, fetch all and filter client-side — this is acceptable for prototype scale (< 100 submissions).
- The existing `getById` query enforces author ownership. Story 3.2 will add an editor-accessible `getByIdForEditor` query. For now, row clicks navigate to the placeholder detail page.
- The `updatedAt` field on submissions is set on every status transition (in `create` mutation and future `transitionStatus` mutations). This makes "days in stage" a reasonable approximation of time-since-last-status-change.
- The sidebar should use TanStack Router's `Link` component for active link detection, not manual path comparison.
- For the search debounce, use a simple `useEffect` + `setTimeout` pattern or a small `useDebouncedValue` hook — no external debounce library needed.
- Status filter chips can reuse the `STATUS_COLORS` and `STATUS_LABELS` from `app/features/submissions/status-utils.ts`.
- The Convex `paginationOptsValidator` expects `{ numItems: number, cursor: string | null }`. On the client, `usePaginatedQuery` handles this automatically.
- Import `usePaginatedQuery` from `convex/react`, not from `convex`.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 3 spec | Sprint Agent |
