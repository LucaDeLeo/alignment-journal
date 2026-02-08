import { usePaginatedQuery } from 'convex/react'
import { FilterXIcon, LayoutDashboardIcon, Loader2Icon } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

import { api } from '../../../convex/_generated/api'
import { formatDate } from '../submissions/status-utils'
import { STATUS_COLORS, STATUS_LABELS } from './editor-constants'
import type { SubmissionStatus } from './editor-constants'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'


interface PipelineTableProps {
  statusFilter?: SubmissionStatus
  searchQuery: string
  hasActiveFilters: boolean
  onClearFilters: () => void
  multiStatusFilter?: Array<SubmissionStatus>
}

function getDaysInStage(updatedAt: number): number {
  return Math.floor((Date.now() - updatedAt) / (1000 * 60 * 60 * 24))
}

function formatDaysInStage(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

const SEVERITY_DISPLAY: Record<
  string,
  { label: string; className: string }
> = {
  high: {
    label: 'Critical',
    className: 'bg-[var(--color-status-red)] text-white',
  },
  medium: {
    label: 'Minor',
    className: 'bg-[var(--color-status-amber)] text-white',
  },
  low: {
    label: 'Pass',
    className: 'bg-[var(--color-status-green)] text-white',
  },
}

export function PipelineTable({
  statusFilter,
  searchQuery,
  hasActiveFilters,
  onClearFilters,
  multiStatusFilter,
}: PipelineTableProps) {
  const navigate = useNavigate()
  const queryArgs = statusFilter ? { status: statusFilter } : {}
  const { results, status, loadMore } = usePaginatedQuery(
    api.submissions.listForEditor,
    queryArgs,
    { initialNumItems: 25 },
  )

  // Client-side filtering: multi-status and title search
  let filteredResults = results
  if (multiStatusFilter) {
    filteredResults = filteredResults.filter((s) =>
      multiStatusFilter.includes(s.status),
    )
  }
  if (searchQuery) {
    filteredResults = filteredResults.filter((s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }

  if (status === 'LoadingFirstPage') {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full skeleton-shimmer" />
        <Skeleton className="h-10 w-full skeleton-shimmer" />
        <Skeleton className="h-10 w-full skeleton-shimmer" />
        <Skeleton className="h-10 w-full skeleton-shimmer" />
        <Skeleton className="h-10 w-full skeleton-shimmer" />
      </div>
    )
  }

  const showEmptyState =
    filteredResults.length === 0 && status !== 'CanLoadMore'

  return (
    <div>
      {filteredResults.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="rounded-full bg-muted p-4">
            {hasActiveFilters ? (
              <FilterXIcon className="size-8 text-muted-foreground" />
            ) : (
              <LayoutDashboardIcon className="size-8 text-muted-foreground" />
            )}
          </div>
          <h2 className="text-lg font-medium">
            {showEmptyState
              ? hasActiveFilters
                ? 'No submissions match your filters'
                : 'No submissions in the pipeline'
              : 'No matches in loaded results'}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {showEmptyState
              ? hasActiveFilters
                ? 'Try adjusting your filters or search terms.'
                : 'When authors submit papers, they will appear here for triage and editorial processing.'
              : 'Try loading more results to find matches.'}
          </p>
          {hasActiveFilters && showEmptyState && (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reviewers</TableHead>
                <TableHead>Triage</TableHead>
                <TableHead>Days in Stage</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((submission) => (
                <TableRow
                  key={submission._id}
                  className="cursor-pointer"
                  onClick={() =>
                    void navigate({
                      to: '/editor/$submissionId',
                      params: { submissionId: submission._id },
                    })
                  }
                >
                  <TableCell className="max-w-xs truncate font-medium">
                    {submission.title}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${STATUS_COLORS[submission.status]} border-transparent`}
                    >
                      {STATUS_LABELS[submission.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ReviewerIndicator summary={submission.reviewerSummary} />
                  </TableCell>
                  <TableCell>
                    <TriageSeverityBadge
                      severity={submission.highestTriageSeverity}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDaysInStage(getDaysInStage(submission.updatedAt))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(submission.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {searchQuery && (
            <p className="mt-2 text-xs text-muted-foreground">
              Searching {filteredResults.length} of {results.length} loaded
              submissions
            </p>
          )}
        </>
      )}

      <div className="mt-4 flex justify-center">
        {status === 'CanLoadMore' && (
          <Button
            variant="outline"
            onClick={() => loadMore(25)}
          >
            Load more
          </Button>
        )}
        {status === 'LoadingMore' && (
          <Button variant="outline" disabled>
            <Loader2Icon className="size-4 animate-spin" />
            Loading...
          </Button>
        )}
      </div>
    </div>
  )
}

function ReviewerIndicator({
  summary,
}: {
  summary: {
    total: number
    accepted: number
    submitted: number
    overdue: number
  } | null
}) {
  if (!summary) {
    return <span className="text-muted-foreground">&mdash;</span>
  }

  const notResponded = summary.total - summary.accepted

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">
        {summary.accepted}/{summary.total}
      </span>
      <div className="flex gap-0.5">
        {summary.submitted > 0 &&
          Array.from({ length: summary.submitted }).map((_, i) => (
            <span
              key={`sub-${String(i)}`}
              className="inline-block size-2 rounded-full bg-[var(--color-status-green)]"
              title="Submitted"
            />
          ))}
        {summary.overdue > 0 &&
          Array.from({ length: summary.overdue }).map((_, i) => (
            <span
              key={`over-${String(i)}`}
              className="inline-block size-2 rounded-full bg-[var(--color-status-amber)]"
              title="Overdue"
            />
          ))}
        {notResponded > 0 &&
          Array.from({ length: notResponded }).map((_, i) => (
            <span
              key={`nr-${String(i)}`}
              className="inline-block size-2 rounded-full bg-[var(--color-status-red)]"
              title="Not responded"
            />
          ))}
      </div>
    </div>
  )
}

function TriageSeverityBadge({
  severity,
}: {
  severity: 'low' | 'medium' | 'high' | null
}) {
  if (!severity) {
    return <span className="text-muted-foreground">&mdash;</span>
  }

  const display = SEVERITY_DISPLAY[severity]
  return (
    <Badge className={`${display.className} border-transparent`}>
      {display.label}
    </Badge>
  )
}
