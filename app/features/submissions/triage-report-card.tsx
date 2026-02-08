import { useState } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible'

const SEVERITY_CONFIG = {
  low: {
    label: 'No issues',
    dotClass: 'bg-[var(--color-status-green)]',
  },
  medium: {
    label: 'Minor issues',
    dotClass: 'bg-[var(--color-status-amber)]',
  },
  high: {
    label: 'Critical issues',
    dotClass: 'bg-[var(--color-status-red)]',
  },
} as const

interface TriageReportCardProps {
  displayName: string
  status: 'complete' | 'failed'
  result?: {
    finding: string
    severity: 'low' | 'medium' | 'high'
    recommendation: string
  }
  lastError?: string
  index: number
}

export function TriageReportCard({
  displayName,
  status,
  result,
  lastError,
  index,
}: TriageReportCardProps) {
  const [open, setOpen] = useState(false)

  if (status === 'failed') {
    return (
      <div
        className="triage-card-enter rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">
            {displayName}
          </span>
        </div>
        {lastError && (
          <p className="mt-2 text-sm text-destructive/80">{lastError}</p>
        )}
      </div>
    )
  }

  const severity = result?.severity ?? 'low'
  const config = SEVERITY_CONFIG[severity]

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="triage-card-enter rounded-lg border bg-card"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <CollapsibleTrigger
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50"
        aria-expanded={open}
      >
        <span
          className={`size-2.5 shrink-0 rounded-full ${config.dotClass}`}
        />
        <span className="text-xs text-muted-foreground">{config.label}</span>
        <span className="flex-1 text-sm font-medium">{displayName}</span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden transition-all duration-200 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="border-t px-4 pb-4 pt-3">
          {result?.finding && (
            <p className="font-serif text-sm leading-relaxed text-foreground">
              {result.finding}
            </p>
          )}
          {result?.recommendation && (
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                Recommendation:{' '}
              </span>
              {result.recommendation}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
