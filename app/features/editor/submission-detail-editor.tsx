import { useQuery } from 'convex/react'
import {
  ArrowLeft,
  CalendarIcon,
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

  if (submission === undefined) {
    return null
  }

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

      {/* Pipeline Progress */}
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Pipeline Progress
        </h2>
        <StatusTimeline currentStatus={submission.status} />
      </section>
    </div>
  )
}
