import { useQuery } from 'convex/react'
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'

import { api } from '../../../convex/_generated/api'
import {
  PRE_CHECK_DISPLAY_NAMES,
  PRE_CHECK_PASS_ORDER,
} from './pre-check-constants'
import { PreCheckCard } from './pre-check-card'

interface PreCheckDisplayProps {
  checkRunId: string | null
}

interface PreCheckReport {
  passName: string
  status: 'pending' | 'running' | 'complete' | 'failed'
  result?: {
    feedback: string
    status: 'good' | 'needs_attention' | 'concern'
    suggestion: string
  }
  lastError?: string
}

function StepIcon({ status }: { status: PreCheckReport['status'] }) {
  switch (status) {
    case 'pending':
      return <Circle className="size-5 text-muted-foreground/50" />
    case 'running':
      return <Loader2 className="size-5 animate-spin text-primary" />
    case 'complete':
      return (
        <CheckCircle2 className="size-5 text-[var(--color-status-green)]" />
      )
    case 'failed':
      return <XCircle className="size-5 text-destructive" />
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '\u2026'
}

function stepStatusClass(status: PreCheckReport['status']): string {
  switch (status) {
    case 'pending':
      return 'text-muted-foreground'
    case 'running':
      return 'font-semibold text-foreground'
    case 'failed':
      return 'text-destructive'
    case 'complete':
      return 'text-foreground'
  }
}

export function PreCheckDisplay({ checkRunId }: PreCheckDisplayProps) {
  const reports = useQuery(
    api.preCheck.getResults,
    checkRunId ? { checkRunId } : 'skip',
  )
  const progress = useQuery(
    api.preCheck.getProgress,
    checkRunId ? { checkRunId } : 'skip',
  )

  const isWaiting = !checkRunId
  const isLoading =
    checkRunId && (reports === undefined || progress === undefined)

  const isInProgress =
    !isWaiting &&
    !isLoading &&
    reports !== undefined &&
    reports.length > 0 &&
    reports.some((r) => r.status === 'pending' || r.status === 'running')

  return (
    <section className="mt-6 rounded-lg border bg-muted/30 p-5">
      <div className={isWaiting ? undefined : 'mb-4'}>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Pre-Submission Check
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {isWaiting
            ? 'When you upload a PDF, we\u2019ll run an automated check covering scope fit, paper structure, references, and technical strength. Results are advisory only and do not affect the editorial decision.'
            : 'This helps you identify potential issues before submitting. It does not affect the editorial decision.'}
        </p>
      </div>

      {reports && progress && isInProgress && (
        <div
          role="progressbar"
          aria-valuenow={progress.complete}
          aria-valuemax={progress.total}
          aria-label="Pre-submission check progress"
          className="space-y-1"
        >
          {PRE_CHECK_PASS_ORDER.map((passName) => {
            const report = reports.find((r) => r.passName === passName)
            const status = report?.status ?? 'pending'
            const displayName =
              PRE_CHECK_DISPLAY_NAMES[passName] ?? passName

            return (
              <div
                key={passName}
                className="flex items-start gap-3 rounded-md px-2 py-2"
                {...(status === 'running'
                  ? { 'aria-current': 'step' as const }
                  : {})}
              >
                <div className="mt-0.5 shrink-0">
                  <StepIcon status={status} />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={`text-sm ${stepStatusClass(status)}`}
                  >
                    {displayName}
                  </span>
                  {status === 'complete' && report?.result?.feedback && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {truncate(report.result.feedback, 100)}
                    </p>
                  )}
                  {status === 'failed' && report?.lastError && (
                    <p className="mt-0.5 text-sm text-destructive/80">
                      {report.lastError}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {reports && progress && !isInProgress && (
        <div className="space-y-3">
          {reports.map((report, index) => (
            <PreCheckCard
              key={report._id}
              displayName={
                PRE_CHECK_DISPLAY_NAMES[report.passName] ?? report.passName
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
