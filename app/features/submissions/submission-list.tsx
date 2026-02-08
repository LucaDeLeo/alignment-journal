import { useQuery } from 'convex/react'
import { PenToolIcon, PlusIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { api } from '../../../convex/_generated/api'

import type { SubmissionStatus } from '../../../convex/helpers/transitions'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  DRAFT: 'bg-[var(--color-status-gray)] text-white',
  SUBMITTED: 'bg-[var(--color-status-blue)] text-white',
  TRIAGING: 'bg-[var(--color-status-amber)] text-white',
  TRIAGE_COMPLETE: 'bg-[var(--color-status-green)] text-white',
  DESK_REJECTED: 'bg-[var(--color-status-red)] text-white',
  UNDER_REVIEW: 'bg-[var(--color-status-blue)] text-white',
  DECISION_PENDING: 'bg-[var(--color-status-amber)] text-white',
  ACCEPTED: 'bg-[var(--color-status-green)] text-white',
  REJECTED: 'bg-[var(--color-status-red)] text-white',
  REVISION_REQUESTED: 'bg-[var(--color-status-amber)] text-white',
  PUBLISHED: 'bg-[var(--color-status-green)] text-white',
}

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  TRIAGING: 'Triaging',
  TRIAGE_COMPLETE: 'Triage Complete',
  DESK_REJECTED: 'Desk Rejected',
  UNDER_REVIEW: 'Under Review',
  DECISION_PENDING: 'Decision Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  REVISION_REQUESTED: 'Revision Requested',
  PUBLISHED: 'Published',
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface SubmissionListProps {
  onNewSubmission: () => void
  showNewButton: boolean
}

export function SubmissionList({
  onNewSubmission,
  showNewButton,
}: SubmissionListProps) {
  const submissions = useQuery(api.submissions.listByAuthor, {})

  if (submissions === undefined) {
    return null // Suspense boundary handles loading
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My Submissions
          </h1>
          <p className="mt-2 text-muted-foreground">
            Submit new papers and track the status of your existing submissions.
          </p>
        </div>
        {showNewButton && (
          <Button onClick={onNewSubmission}>
            <PlusIcon className="size-4" />
            New Submission
          </Button>
        )}
      </div>

      {submissions.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-muted p-4">
            <PenToolIcon className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium">No submissions yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Create your first submission to begin the peer review process.
          </p>
          {showNewButton && (
            <Button onClick={onNewSubmission}>
              <PlusIcon className="size-4" />
              New Submission
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {submissions.map((submission) => (
            <Link
              key={submission._id}
              to="/submit/$submissionId"
              params={{ submissionId: submission._id }}
              className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">{submission.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Submitted {formatDate(submission.createdAt)}
                  </p>
                </div>
                <Badge
                  className={STATUS_COLORS[submission.status]}
                >
                  {STATUS_LABELS[submission.status]}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
