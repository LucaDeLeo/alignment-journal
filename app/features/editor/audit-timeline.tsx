import { usePaginatedQuery } from 'convex/react'
import { HistoryIcon, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { api } from '../../../convex/_generated/api'
import { formatDate } from '../submissions/status-utils'

import type { Id } from '../../../convex/_generated/dataModel'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'

const ACTION_LABELS: Record<string, string> = {
  status_transition: 'Status transition',
  action_editor_assigned: 'Assignment',
  action_editor_reassigned: 'Reassignment',
  reviewer_invited: 'Reviewer invited',
  reviewer_invite_revoked: 'Invitation revoked',
  invitation_accepted: 'Invitation accepted',
  decision_accepted: 'Accepted',
  decision_rejected: 'Rejected',
  decision_revision_requested: 'Revision requested',
  decision_undone: 'Decision undone',
}

function formatActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

interface AuditTimelineProps {
  submissionId: Id<'submissions'>
}

export function AuditTimeline({ submissionId }: AuditTimelineProps) {
  const [actionFilter, setActionFilter] = useState<string | undefined>(
    undefined,
  )

  const { results, status, loadMore } = usePaginatedQuery(
    api.audit.listBySubmission,
    { submissionId, actionFilter },
    { initialNumItems: 20 },
  )

  const actionTypes = useMemo(() => {
    const types = new Set<string>()
    for (const entry of results) {
      types.add(entry.action)
    }
    return Array.from(types)
  }, [results])

  if (results.length === 0 && status === 'Exhausted') {
    return (
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <HistoryIcon className="size-3.5" />
          Audit Trail
        </h2>
        <p className="text-sm text-muted-foreground">
          No audit trail entries yet
        </p>
      </section>
    )
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        <HistoryIcon className="size-3.5" />
        Audit Trail
      </h2>

      {/* Filter chips */}
      {actionTypes.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge
            variant={actionFilter === undefined ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setActionFilter(undefined)}
          >
            All
          </Badge>
          {actionTypes.map((type) => (
            <Badge
              key={type}
              variant={actionFilter === type ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() =>
                setActionFilter(actionFilter === type ? undefined : type)
              }
            >
              {formatActionLabel(type)}
            </Badge>
          ))}
        </div>
      )}

      {/* Timeline entries */}
      <div className="space-y-0">
        {results.map((entry, index) => (
          <div key={entry._id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="mt-1.5 size-2.5 rounded-full bg-primary" />
              {index < results.length - 1 && (
                <div className="w-px flex-1 bg-border" />
              )}
            </div>
            <div className="pb-6">
              <p className="text-sm">
                <span className="font-medium">{entry.actorName}</span>{' '}
                {formatActionLabel(entry.action)}
              </p>
              {entry.details && (
                <p className="text-sm text-muted-foreground">
                  {entry.details}
                </p>
              )}
              <time className="text-xs text-muted-foreground">
                {formatDate(entry.createdAt)}
              </time>
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      {status === 'CanLoadMore' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadMore(20)}
          className="mt-2"
        >
          Load more
        </Button>
      )}
      {status === 'LoadingMore' && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading...
        </div>
      )}
    </section>
  )
}
