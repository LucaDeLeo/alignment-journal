import { useQuery } from 'convex/react'
import {
  AwardIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  DollarSignIcon,
  FileTextIcon,
  StarIcon,
} from 'lucide-react'
import * as React from 'react'

import { api } from 'convex/_generated/api'

import type { Id } from 'convex/_generated/dataModel'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible'
import { Separator } from '~/components/ui/separator'
import { formatCurrency } from '~/lib/format-utils'
import { cn } from '~/lib/utils'

// ---------- useCountUp hook ----------

function useCountUp(target: number, duration = 600, active = true): number {
  const [value, setValue] = React.useState(0)

  React.useEffect(() => {
    if (!active) {
      setValue(target)
      return
    }

    setValue(0)
    let start: number | undefined
    let rafId: number

    function step(timestamp: number) {
      if (start === undefined) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setValue(Math.round(target * eased))
      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      }
    }

    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration, active])

  return value
}

// ---------- useDeadlineCountdown hook ----------

function useDeadlineCountdown(deadlineMs: number): number {
  const [daysRemaining, setDaysRemaining] = React.useState(() =>
    Math.max(0, Math.ceil((deadlineMs - Date.now()) / (24 * 60 * 60 * 1000))),
  )

  React.useEffect(() => {
    function update() {
      const remaining = Math.max(
        0,
        Math.ceil((deadlineMs - Date.now()) / (24 * 60 * 60 * 1000)),
      )
      setDaysRemaining(remaining)
    }

    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [deadlineMs])

  return daysRemaining
}

// ---------- LineItem ----------

function LineItem({
  icon,
  label,
  formula,
  value,
  muted,
  animate,
}: {
  icon: React.ReactNode
  label: string
  formula: string
  value: number | null
  muted?: boolean
  animate: boolean
}) {
  const animatedValue = useCountUp(value ?? 0, 600, animate)

  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div className="flex items-start gap-2 min-w-0">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p
            className={cn(
              'text-xs',
              muted ? 'text-muted-foreground italic' : 'text-muted-foreground',
            )}
          >
            {formula}
          </p>
        </div>
      </div>
      <span
        className={cn(
          'shrink-0 text-sm font-medium tabular-nums',
          muted && 'text-muted-foreground',
        )}
      >
        {value === null ? '—' : formatCurrency(animate ? animatedValue : value)}
      </span>
    </div>
  )
}

// ---------- PaymentCalculator ----------

export function PaymentCalculator({
  submissionId,
}: {
  submissionId: Id<'submissions'>
}) {
  const breakdown = useQuery(api.payments.getPaymentBreakdown, {
    submissionId,
  })
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [animationKey, setAnimationKey] = React.useState(0)

  const handleToggle = React.useCallback((open: boolean) => {
    setIsExpanded(open)
    if (open) {
      setAnimationKey((k) => k + 1)
    }
  }, [])

  if (breakdown === undefined) {
    return (
      <div className="border-t bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  const daysRemaining = breakdown.deadlineMs
    ? Math.max(
        0,
        Math.ceil(
          (breakdown.deadlineMs - Date.now()) / (24 * 60 * 60 * 1000),
        ),
      )
    : 0
  const deadlinePassed =
    !breakdown.reviewSubmittedAt && Date.now() > breakdown.deadlineMs

  return (
    <Collapsible open={isExpanded} onOpenChange={handleToggle}>
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center justify-between border-t bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50"
          type="button"
        >
          <div className="flex items-center gap-2">
            <DollarSignIcon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Estimated Compensation</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(breakdown.total)}
            </span>
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t bg-muted/20 px-4 pb-3 pt-2" key={animationKey}>
          <PaymentBreakdownContent
            breakdown={breakdown}
            daysRemaining={daysRemaining}
            deadlinePassed={deadlinePassed}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// Extracted to a separate component to re-mount on animation key change
function PaymentBreakdownContent({
  breakdown,
  daysRemaining,
  deadlinePassed,
}: {
  breakdown: {
    basePay: number
    pageCount: number
    qualityMultiplier: number
    qualityLevel: 'standard' | 'excellent'
    qualityAssessed: boolean
    speedBonus: number
    weeksEarly: number
    deadlineMs: number
    reviewSubmittedAt?: number
    abstractBonus: number
    hasAbstractAssignment: boolean
    total: number
  }
  daysRemaining: number
  deadlinePassed: boolean
}) {
  const liveDaysRemaining = useDeadlineCountdown(breakdown.deadlineMs)
  const displayDays = breakdown.reviewSubmittedAt
    ? daysRemaining
    : liveDaysRemaining

  const qualityAmount = breakdown.basePay * breakdown.qualityMultiplier - breakdown.basePay

  const speedFormula = breakdown.reviewSubmittedAt
    ? `$100 \u00d7 ${breakdown.weeksEarly} weeks early`
    : deadlinePassed
      ? '$0 \u2014 deadline passed'
      : `$100 \u00d7 ${breakdown.weeksEarly} weeks early`

  const deadlineText = breakdown.reviewSubmittedAt
    ? 'Submitted'
    : deadlinePassed
      ? 'Deadline passed'
      : `${displayDays} day${displayDays !== 1 ? 's' : ''} until deadline`

  return (
    <>
      <LineItem
        icon={<FileTextIcon className="h-3.5 w-3.5" />}
        label="Base Pay"
        formula={`$100 + $20 \u00d7 ${breakdown.pageCount} pages = ${formatCurrency(breakdown.basePay)}`}
        value={breakdown.basePay}
        animate
      />
      <LineItem
        icon={<StarIcon className="h-3.5 w-3.5" />}
        label="Quality Multiplier"
        formula={
          breakdown.qualityAssessed
            ? `${breakdown.qualityMultiplier}x ${breakdown.qualityLevel} = +${formatCurrency(qualityAmount)}`
            : 'Pending editor assessment'
        }
        value={breakdown.qualityAssessed ? qualityAmount : null}
        muted={!breakdown.qualityAssessed}
        animate
      />
      <LineItem
        icon={<ClockIcon className="h-3.5 w-3.5" />}
        label="Speed Bonus"
        formula={`${speedFormula} \u00b7 ${deadlineText}`}
        value={breakdown.speedBonus}
        muted={deadlinePassed && !breakdown.reviewSubmittedAt}
        animate
      />
      <LineItem
        icon={<AwardIcon className="h-3.5 w-3.5" />}
        label="Abstract Bonus"
        formula={
          breakdown.hasAbstractAssignment ? '$300' : 'Not applicable'
        }
        value={breakdown.hasAbstractAssignment ? breakdown.abstractBonus : null}
        muted={!breakdown.hasAbstractAssignment}
        animate
      />
      <Separator className="my-2" />
      <TotalLine total={breakdown.total} />
    </>
  )
}

function TotalLine({ total }: { total: number }) {
  const animatedTotal = useCountUp(total, 600, true)

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold">Total</span>
      <span className="text-base font-bold tabular-nums">
        {formatCurrency(animatedTotal)}
      </span>
    </div>
  )
}
