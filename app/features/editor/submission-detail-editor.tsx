import { useMutation, useQuery } from 'convex/react'
import {
  ArrowLeft,
  CalendarIcon,
  ClipboardListIcon,
  DownloadIcon,
  FileTextIcon,
  TagIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { formatDate } from '../submissions/status-utils'
import { StatusTimeline } from '../submissions/status-timeline'
import { TriageDisplay } from '../submissions/triage-display'
import { NotificationPreviewList } from '../notifications'
import { ActionEditorSelector } from './action-editor-selector'
import { AuditTimeline } from './audit-timeline'
import { DecisionPanel } from './decision-panel'
import { PaymentSummaryTable } from './payment-summary-table'
import { ReviewProgressIndicator } from './review-progress-indicator'
import { ReviewerMatchPanel } from './reviewer-match-panel'
import { NextStepBanner } from './next-step-banner'
import { StatusTransitionChip } from './status-transition-chip'

import type { Id } from '../../../convex/_generated/dataModel'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'

const showDemoFeatures =
  import.meta.env.DEV || !!import.meta.env.VITE_SHOW_ROLE_SWITCHER

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
    <div className="mx-auto max-w-3xl px-6 py-8 xl:max-w-none xl:grid xl:grid-cols-[minmax(0,48rem)_14rem] xl:justify-center xl:gap-8">
      <div className="min-w-0">
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

      <NextStepBanner
        status={submission.status}
        reviewsSubmitted={
          reviewProgress?.filter(
            (e) =>
              e.reviewStatus === 'submitted' || e.reviewStatus === 'locked',
          ).length
        }
        reviewsTotal={reviewProgress?.length}
      />

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
        <ReviewerMatchPanel submissionId={submissionId} submissionTitle={submission.title} />
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

      {/* Quick-assign self as reviewer (dev/demo only) */}
      {showDemoFeatures &&
        (submission.status === 'TRIAGE_COMPLETE' ||
          submission.status === 'UNDER_REVIEW') && (
          <QuickAssignButton submissionId={submission._id} />
        )}

      {/* Payment Summary — renders when reviews exist */}
      <PaymentSummaryTable submissionId={submissionId} />

      {/* Decision Panel — only for DECISION_PENDING status */}
      {submission.status === 'DECISION_PENDING' && (
        <DecisionPanel
          submissionId={submissionId}
          submissionTitle={submission.title}
        />
      )}

      {/* Pipeline Progress */}
      <section className="mt-10 xl:hidden">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Pipeline Progress
        </h2>
        <StatusTimeline currentStatus={submission.status} />
      </section>

      {/* Notification Previews */}
      <NotificationPreviewList submissionId={submissionId} />

      {/* Audit Trail */}
      <AuditTimeline submissionId={submissionId} />
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-8">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Pipeline
          </h3>
          <StatusTimeline currentStatus={submission.status} />
        </div>
      </aside>
    </div>
  )
}

function QuickAssignButton({
  submissionId,
}: {
  submissionId: Id<'submissions'>
}) {
  const assignSelf = useMutation(api.reviews.assignSelfAsReviewer)

  async function handleClick() {
    try {
      await assignSelf({ submissionId })
      toast.success(
        'Assigned yourself as reviewer. Switch to reviewer role to see it.',
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to assign'
      toast.error(message)
    }
  }

  return (
    <div className="mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="gap-1.5"
      >
        <UserPlusIcon className="size-3.5" />
        Assign Myself as Reviewer
      </Button>
      <p className="mt-1 text-xs text-muted-foreground">(dev only)</p>
    </div>
  )
}
