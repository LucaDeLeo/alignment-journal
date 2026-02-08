import { useQuery } from 'convex/react'
import { ArrowLeft, CalendarIcon, TagIcon, UsersIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { api } from '../../../convex/_generated/api'
import { STATUS_COLORS, STATUS_LABELS, formatDate } from './status-utils'
import { StatusTimeline } from './status-timeline'
import { TriageDisplay } from './triage-display'

import type { Id } from '../../../convex/_generated/dataModel'

import { Badge } from '~/components/ui/badge'

interface SubmissionDetailProps {
  submissionId: Id<'submissions'>
}

export function SubmissionDetail({ submissionId }: SubmissionDetailProps) {
  const submission = useQuery(api.submissions.getById, { submissionId })

  if (submission === undefined) {
    return null // Suspense boundary handles loading
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {/* Back link */}
      <Link
        to="/submit"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to submissions
      </Link>

      {/* Header: title + status */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {submission.title}
        </h1>
        <Badge className={STATUS_COLORS[submission.status]}>
          {STATUS_LABELS[submission.status]}
        </Badge>
      </div>

      {/* Submission date */}
      <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <CalendarIcon className="size-3.5" />
        Submitted {formatDate(submission.createdAt)}
      </div>

      {/* Abstract */}
      <section className="mt-8">
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

      {/* Status Timeline */}
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Pipeline Progress
        </h2>
        <StatusTimeline currentStatus={submission.status} />
      </section>
    </main>
  )
}
