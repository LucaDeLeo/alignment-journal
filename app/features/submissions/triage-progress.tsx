import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'

const PASS_DISPLAY_NAMES: Record<string, string> = {
  scope: 'Scope Fit',
  formatting: 'Formatting',
  citations: 'Citations',
  claims: 'Claims Analysis',
}

const PASS_ORDER = ['scope', 'formatting', 'citations', 'claims'] as const

interface TriageReport {
  passName: string
  status: 'pending' | 'running' | 'complete' | 'failed'
  result?: {
    finding: string
    severity: 'low' | 'medium' | 'high'
    recommendation: string
  }
  lastError?: string
}

interface TriageProgress {
  total: number
  complete: number
  running: number
  failed: number
  pending: number
}

interface TriageProgressIndicatorProps {
  reports: Array<TriageReport>
  progress: TriageProgress
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}

function StepIcon({ status }: { status: TriageReport['status'] }) {
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

export function TriageProgressIndicator({
  reports,
  progress,
}: TriageProgressIndicatorProps) {
  // Build a map for quick lookup
  const reportMap = new Map(reports.map((r) => [r.passName, r]))

  return (
    <div
      role="progressbar"
      aria-valuenow={progress.complete}
      aria-valuemax={progress.total}
      aria-label="Triage analysis progress"
      className="space-y-1"
    >
      {PASS_ORDER.map((passName) => {
        const report = reportMap.get(passName)
        const status = report?.status ?? 'pending'
        const displayName = PASS_DISPLAY_NAMES[passName] ?? passName

        return (
          <div
            key={passName}
            className="flex items-start gap-3 rounded-md px-2 py-2"
            {...(status === 'running' ? { 'aria-current': 'step' as const } : {})}
          >
            <div className="mt-0.5 shrink-0">
              <StepIcon status={status} />
            </div>
            <div className="min-w-0 flex-1">
              <span
                className={`text-sm ${
                  status === 'pending'
                    ? 'text-muted-foreground'
                    : status === 'running'
                      ? 'font-semibold text-foreground'
                      : status === 'failed'
                        ? 'text-destructive'
                        : 'text-foreground'
                }`}
              >
                {displayName}
              </span>
              {status === 'complete' && report?.result?.finding && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {truncate(report.result.finding, 100)}
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
  )
}
