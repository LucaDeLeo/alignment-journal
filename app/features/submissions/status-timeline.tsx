import { CheckCircle2, Circle, CircleDot } from 'lucide-react'

import { STATUS_COLOR_VAR, getTimelineSteps } from './status-utils'

import type { SubmissionStatus } from '../../../convex/helpers/transitions'
import type { TimelineStepState } from './status-utils'

import { cn } from '~/lib/utils'

interface StatusTimelineProps {
  currentStatus: SubmissionStatus
}

const STEP_ICON: Record<TimelineStepState, typeof CheckCircle2> = {
  completed: CheckCircle2,
  current: CircleDot,
  future: Circle,
}

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const steps = getTimelineSteps(currentStatus)

  return (
    <div className="relative space-y-0">
      {steps.map((step, i) => {
        const Icon = STEP_ICON[step.state]
        const isLast = i === steps.length - 1

        return (
          <div key={step.status} className="relative flex gap-3 pb-6 last:pb-0">
            {/* Vertical connector line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[11px] top-[24px] w-0.5 h-[calc(100%-12px)]',
                  step.state === 'completed'
                    ? 'bg-muted-foreground/30'
                    : 'border-l-2 border-dashed border-muted-foreground/20',
                )}
              />
            )}

            {/* Icon */}
            <div className="relative z-10 flex shrink-0 items-center justify-center">
              {step.state === 'completed' ? (
                <Icon className="size-[22px] text-muted-foreground/60" />
              ) : step.state === 'current' ? (
                <Icon
                  className="size-[22px]"
                  style={{ color: `var(${STATUS_COLOR_VAR[step.status]})` }}
                />
              ) : (
                <Icon className="size-[22px] text-muted-foreground/30" />
              )}
            </div>

            {/* Label */}
            <div className="flex min-h-[22px] items-center">
              <span
                className={cn(
                  'text-sm',
                  step.state === 'completed' && 'text-muted-foreground',
                  step.state === 'current' && 'font-medium text-foreground',
                  step.state === 'future' && 'text-muted-foreground/50',
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
