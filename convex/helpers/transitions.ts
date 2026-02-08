import { ConvexError, v } from 'convex/values'

/**
 * All valid submission statuses in the editorial pipeline.
 */
export const SUBMISSION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'TRIAGING',
  'TRIAGE_COMPLETE',
  'DESK_REJECTED',
  'UNDER_REVIEW',
  'DECISION_PENDING',
  'ACCEPTED',
  'REJECTED',
  'REVISION_REQUESTED',
  'PUBLISHED',
] as const

/** TypeScript type for a submission status. */
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

/** Convex validator for submission status fields. */
export const submissionStatusValidator = v.union(
  v.literal('DRAFT'),
  v.literal('SUBMITTED'),
  v.literal('TRIAGING'),
  v.literal('TRIAGE_COMPLETE'),
  v.literal('DESK_REJECTED'),
  v.literal('UNDER_REVIEW'),
  v.literal('DECISION_PENDING'),
  v.literal('ACCEPTED'),
  v.literal('REJECTED'),
  v.literal('REVISION_REQUESTED'),
  v.literal('PUBLISHED'),
)

/**
 * Defines which transitions are allowed from each status.
 * Terminal states map to empty arrays.
 */
export const VALID_TRANSITIONS: Record<
  SubmissionStatus,
  ReadonlyArray<SubmissionStatus>
> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['TRIAGING'],
  TRIAGING: ['TRIAGE_COMPLETE'],
  TRIAGE_COMPLETE: ['DESK_REJECTED', 'UNDER_REVIEW', 'TRIAGING'],
  UNDER_REVIEW: ['DECISION_PENDING'],
  DECISION_PENDING: ['ACCEPTED', 'REJECTED', 'REVISION_REQUESTED'],
  ACCEPTED: ['PUBLISHED'],
  REVISION_REQUESTED: ['SUBMITTED'],
  DESK_REJECTED: [],
  REJECTED: [],
  PUBLISHED: [],
} as const

/**
 * Decision statuses that can only be reached via decisions.makeDecision.
 * transitionStatus must not allow these directly.
 */
export const DECISION_ONLY_STATUSES: ReadonlyArray<SubmissionStatus> = [
  'ACCEPTED',
  'REJECTED',
  'REVISION_REQUESTED',
] as const

/**
 * Validates that a status transition is allowed.
 * Throws `ConvexError({ code: "INVALID_TRANSITION" })` if the transition is not valid.
 */
export function assertTransition(
  currentStatus: SubmissionStatus,
  nextStatus: SubmissionStatus,
): void {
  const allowed = VALID_TRANSITIONS[currentStatus]
  if (!allowed.includes(nextStatus)) {
    throw new ConvexError({
      code: 'INVALID_TRANSITION' as const,
      message: `Cannot transition from ${currentStatus} to ${nextStatus}. Valid transitions from ${currentStatus}: ${allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'}`,
    })
  }
}
