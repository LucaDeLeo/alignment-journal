# ATDD Checklist: Story 3.1 - Editor Pipeline Dashboard

## AC1: Paginated data table with all submissions

### Unit Tests (convex/__tests__/submissions-listForEditor.test.ts)
- [ ] `listForEditor` returns paginated results with correct shape (page, isDone, continueCursor)
- [ ] `listForEditor` throws UNAUTHORIZED for non-editor roles (author, reviewer)
- [ ] `listForEditor` allows access for editor_in_chief role
- [ ] `listForEditor` allows access for action_editor role
- [ ] `listForEditor` allows access for admin role
- [ ] `listForEditor` returns enriched fields: reviewerSummary, highestTriageSeverity
- [ ] `listForEditor` returns null reviewerSummary when no reviews exist
- [ ] `listForEditor` returns null highestTriageSeverity when no triage reports complete

### Component Tests (app/features/editor/__tests__/pipeline-table.test.tsx)
- [ ] PipelineTable renders table headers: Title, Status, Reviewers, Triage, Days, Created
- [ ] PipelineTable renders submission rows with correct data
- [ ] PipelineTable renders status badge with STATUS_COLORS styling
- [ ] PipelineTable renders dash when reviewerSummary is null
- [ ] PipelineTable renders dash when highestTriageSeverity is null
- [ ] PipelineTable computes days in stage from updatedAt

## AC2: Cursor-based pagination with "Load more"

### Component Tests
- [ ] PipelineTable shows "Load more" button when status is "CanLoadMore"
- [ ] PipelineTable shows loading spinner when status is "LoadingMore"
- [ ] PipelineTable hides "Load more" button when status is "Exhausted"

## AC3: Status filter with multi-select chips

### Component Tests (app/features/editor/__tests__/pipeline-filters.test.tsx)
- [ ] PipelineFilters renders status chips for each SubmissionStatus
- [ ] PipelineFilters calls onStatusToggle when chip clicked
- [ ] PipelineFilters shows selected chips with filled style and unselected with outline
- [ ] PipelineFilters shows search input

## AC4: Title search

### Component Tests
- [ ] PipelineFilters renders search input with placeholder
- [ ] PipelineFilters calls onSearchChange with debounced value

## AC5: Row click navigation to submission detail

### Component Tests
- [ ] PipelineTable rows have cursor-pointer class
- [ ] PipelineTable row click calls navigate with correct submissionId

## AC6: Editor sidebar navigation

### Component Tests (app/features/editor/__tests__/editor-sidebar.test.tsx)
- [ ] EditorSidebar renders Dashboard link
- [ ] EditorSidebar renders Pipeline section with status group shortcuts
- [ ] EditorSidebar has 240px width class

## AC7: Real-time updates
- [ ] Verified by Convex's reactive query architecture (usePaginatedQuery is inherently reactive)
- [ ] No manual polling or refresh logic exists in the codebase

## AC8: Empty state

### Component Tests
- [ ] PipelineTable shows "No submissions in the pipeline" when no data and no filters
- [ ] PipelineTable shows "No submissions match your filters" when no data and filters active
- [ ] PipelineTable shows "Clear filters" action when filters active and no results

## Implementation Notes

Tests use Vitest. Unit tests for Convex functions test the query logic. Component tests use happy-dom environment with mocked Convex hooks (`usePaginatedQuery`, `useNavigate`).

Skipped tests (prototype scope):
- E2E pagination with real Convex backend
- Real-time subscription verification (inherent to Convex)
- URL param persistence (TanStack Router integration, covered by framework)
