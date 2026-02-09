import { InfoIcon } from 'lucide-react'

import type { SubmissionStatus } from '../../../convex/helpers/transitions'

interface NextStepBannerProps {
  status: SubmissionStatus
  reviewsSubmitted?: number
  reviewsTotal?: number
}

function getMessage(
  status: SubmissionStatus,
  reviewsSubmitted?: number,
  reviewsTotal?: number,
): string | null {
  switch (status) {
    case 'SUBMITTED':
    case 'TRIAGING':
      return 'Triage is running. Results will appear below when complete.'
    case 'TRIAGE_COMPLETE':
      return 'Triage complete. Assign an action editor, then advance to Under Review.'
    case 'UNDER_REVIEW': {
      if (
        reviewsSubmitted !== undefined &&
        reviewsTotal !== undefined &&
        reviewsTotal > 0
      ) {
        if (reviewsSubmitted >= reviewsTotal) {
          return 'All reviews submitted. Advance to Decision Pending when ready.'
        }
        return `Waiting for reviews (${reviewsSubmitted} of ${reviewsTotal} submitted).`
      }
      return 'Waiting for reviewer assignments and reviews.'
    }
    case 'DECISION_PENDING':
      return 'All reviews are in. Make your editorial decision below.'
    case 'ACCEPTED':
      return 'Paper accepted. Advance to Published when ready.'
    default:
      return null
  }
}

export function NextStepBanner({
  status,
  reviewsSubmitted,
  reviewsTotal,
}: NextStepBannerProps) {
  const message = getMessage(status, reviewsSubmitted, reviewsTotal)
  if (!message) return null

  return (
    <div className="mt-4 flex items-start gap-3 rounded-lg border bg-muted/50 px-4 py-3">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
