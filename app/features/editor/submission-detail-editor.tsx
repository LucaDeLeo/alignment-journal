import { useQuery } from 'convex/react'
import {
  ArrowLeft,
  CalendarIcon,
  ClipboardListIcon,
  DownloadIcon,
  FileTextIcon,
  TagIcon,
  UsersIcon,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { api } from '../../../convex/_generated/api'
import { formatDate } from '../submissions/status-utils'
import { StatusTimeline } from '../submissions/status-timeline'
import { TriageDisplay } from '../submissions/triage-display'
import { ActionEditorSelector } from './action-editor-selector'
import { AuditTimeline } from './audit-timeline'
import { DecisionPanel } from './decision-panel'
import { ReviewProgressIndicator } from './review-progress-indicator'
import { ReviewerMatchPanel } from './reviewer-match-panel'
import { StatusTransitionChip } from './status-transition-chip'

import type { Id } from '../../../convex/_generated/dataModel'

import { Badge } from '~/components/ui/badge'
import { Separator } from '~/components/ui/separator'

interface EditorSubmissionDetailProps {
  submissionId: Id<'submissions'>
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function EditorSubmissionDetail({
  submissionId,
}: EditorSubmissionDetailProps) {
  const submission = useQuery(api.submissions.getByIdForEditor, {
    submissionId,
  })
  const currentUser = useQuery(api.users.me, {})
  const reviewProgress = useQuery(api.invitations.getReviewProgress, {
    submissionId,
  })

  if (submission === undefined) {
    return null
  }

  const isEditorInChief = currentUser?.role === 'editor_in_chief'

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Back link */}
      <Link
        to="/editor"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      {/* Header: title + status chip */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {submission.title}
        </h1>
        <StatusTransitionChip
          submissionId={submission._id}
          currentStatus={submission.status}
          isDecisionPanelActive={submission.status === 'DECISION_PENDING'}
        />
      </div>

      {/* Metadata row */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarIcon className="size-3.5" />
          Submitted {formatDate(submission.createdAt)}
        </span>

        {/* PDF section */}
        {submission.pdfFileName ? (
          submission.pdfUrl ? (
            <a
              href={submission.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary transition-colors hover:underline"
            >
              <DownloadIcon className="size-3.5" />
              {submission.pdfFileName}
              {submission.pdfFileSize != null && (
                <span className="text-muted-foreground">
                  ({formatFileSize(submission.pdfFileSize)})
                </span>
              )}
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <FileTextIcon className="size-3.5" />
              PDF unavailable
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <FileTextIcon className="size-3.5" />
            No PDF uploaded
          </span>
        )}

        {/* Action Editor Assignment */}
        <ActionEditorSelector
          submissionId={submission._id}
          currentActionEditorId={submission.actionEditorId}
          isEditorInChief={isEditorInChief}
        />
      </div>

      <Separator className="my-6" />

      {/* Abstract */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Abstract
        </h2>
        <p className="mt-3 font-serif text-base leading-relaxed text-foreground">
          {submission.abstract}
        </p>
      </section>

      {/* Authors */}
      <section className="mt-8">
        <h2 className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <UsersIcon className="size-3.5" />
          Authors
        </h2>
        <ul className="mt-3 space-y-2">
          {submission.authors.map((author, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium">{author.name}</span>
              <span className="text-muted-foreground">
                {' '}
                &mdash; {author.affiliation}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Keywords */}
      <section className="mt-8">
        <h2 className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <TagIcon className="size-3.5" />
          Keywords
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {submission.keywords.map((keyword) => (
            <Badge key={keyword} variant="secondary">
              {keyword}
            </Badge>
          ))}
        </div>
      </section>

      {/* Triage Analysis */}
      <TriageDisplay
        submissionId={submissionId}
        submissionStatus={submission.status}
      />

      {/* Reviewer Matching — only for matchable statuses */}
      {(submission.status === 'TRIAGE_COMPLETE' ||
        submission.status === 'UNDER_REVIEW') && (
        <ReviewerMatchPanel submissionId={submissionId} />
      )}

      {/* Review Progress — only when reviews exist */}
      {reviewProgress != null && reviewProgress.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            <ClipboardListIcon className="size-3.5" />
            Review Progress
          </h2>
          <div className="mt-3 space-y-2">
            {reviewProgress.map((entry) => (
              <div
                key={entry.reviewerId}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <ReviewProgressIndicator
                    indicator={entry.indicator}
                    label={entry.indicatorLabel}
                  />
                  <span className="text-sm font-medium">
                    {entry.reviewerName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {entry.daysSinceAssignment === 0
                      ? 'today'
                      : `${entry.daysSinceAssignment}d ago`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Decision Panel — only for DECISION_PENDING status */}
      {submission.status === 'DECISION_PENDING' && (
        <DecisionPanel
          submissionId={submissionId}
          submissionTitle={submission.title}
        />
      )}

      {/* Pipeline Progress */}
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Pipeline Progress
        </h2>
        <StatusTimeline currentStatus={submission.status} />
      </section>

      {/* Audit Trail */}
      <AuditTimeline submissionId={submissionId} />
    </div>
  )
}
