import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import type { SubmissionStatus } from '~/features/editor'

import { PipelineFilters, PipelineTable, SUBMISSION_STATUSES } from '~/features/editor'

/**
 * Parses and sanitizes a comma-separated status string, filtering out
 * any values not in the canonical SUBMISSION_STATUSES list.
 */
function parseStatusParam(raw: string | undefined): Array<SubmissionStatus> {
  if (!raw || typeof raw !== 'string') return []
  return raw
    .split(',')
    .filter((s): s is SubmissionStatus =>
      (SUBMISSION_STATUSES as ReadonlyArray<string>).includes(s),
    )
}

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

  const selectedStatuses = parseStatusParam(status)
  const searchQuery = q ?? ''

  function handleStatusToggle(toggledStatus: SubmissionStatus) {
    const next = selectedStatuses.includes(toggledStatus)
      ? selectedStatuses.filter((s) => s !== toggledStatus)
      : [...selectedStatuses, toggledStatus]
    void navigate({
      search: (prev) => ({
        ...prev,
        status: next.length > 0 ? next.join(',') : undefined,
      }),
      replace: true,
    })
  }

  function handleSearchChange(query: string) {
    void navigate({
      search: (prev) => ({
        ...prev,
        q: query || undefined,
      }),
      replace: true,
    })
  }

  function handleClearFilters() {
    void navigate({
      search: {},
      replace: true,
    })
  }

  // For the Convex query: only pass a single status filter when exactly one is selected
  // When multiple statuses are selected, fetch all and filter client-side
  const singleStatusFilter =
    selectedStatuses.length === 1 ? selectedStatuses[0] : undefined

  const hasActiveFilters =
    selectedStatuses.length > 0 || searchQuery.length > 0

  // Client-side multi-status filtering when multiple statuses selected
  const multiStatusFilter =
    selectedStatuses.length > 1 ? selectedStatuses : undefined

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Editor Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage submissions, assign reviewers, and track the editorial
          pipeline.
        </p>
      </div>

      <div className="mb-6">
        <PipelineFilters
          selectedStatuses={selectedStatuses}
          onStatusToggle={handleStatusToggle}
          onClearAll={handleClearFilters}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />
      </div>

      <PipelineTable
        statusFilter={singleStatusFilter}
        searchQuery={searchQuery}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        multiStatusFilter={multiStatusFilter}
      />
    </div>
  )
}
