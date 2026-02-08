import { useQuery } from 'convex/react'

import { api } from '../../../convex/_generated/api'
import { TriageProgressIndicator } from './triage-progress'
import { TriageReportCard } from './triage-report-card'

import type { Id } from '../../../convex/_generated/dataModel'
import type { SubmissionStatus } from '../../../convex/helpers/transitions'

const PASS_DISPLAY_NAMES: Record<string, string> = {
  scope: 'Scope Fit',
  formatting: 'Formatting',
  citations: 'Citations',
  claims: 'Claims Analysis',
}

interface TriageDisplayProps {
  submissionId: Id<'submissions'>
  submissionStatus: SubmissionStatus
}

export function TriageDisplay({
  submissionId,
  submissionStatus,
}: TriageDisplayProps) {
  const shouldFetchTriage =
    submissionStatus !== 'DRAFT' && submissionStatus !== 'SUBMITTED'

  const reports = useQuery(
    api.triage.getBySubmission,
    shouldFetchTriage ? { submissionId } : 'skip',
  )
  const progress = useQuery(
    api.triage.getProgress,
    shouldFetchTriage ? { submissionId } : 'skip',
  )

  // Don't render the section for statuses that don't have triage data
  if (!shouldFetchTriage) {
    return null
  }

  // Loading state — Suspense boundary handles this
  if (reports === undefined || progress === undefined) {
    return null
  }

  // Determine if triage is still in progress
  const isInProgress =
    submissionStatus === 'TRIAGING' ||
    (reports.length > 0 &&
      reports.some((r) => r.status === 'pending' || r.status === 'running'))

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Triage Analysis
      </h2>
      {isInProgress ? (
        <TriageProgressIndicator
          reports={reports}
          progress={progress}
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report, index) => (
            <TriageReportCard
              key={report._id}
              displayName={
                PASS_DISPLAY_NAMES[report.passName] ?? report.passName
              }
              status={report.status === 'failed' ? 'failed' : 'complete'}
              result={report.result}
              lastError={report.lastError}
              index={index}
            />
          ))}
        </div>
      )}
    </section>
  )
}
