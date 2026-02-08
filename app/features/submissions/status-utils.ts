import { VALID_TRANSITIONS } from '../../../convex/helpers/transitions'

import type { SubmissionStatus } from '../../../convex/helpers/transitions'

/** CSS variable name for each status's color. */
export const STATUS_COLOR_VAR: Record<SubmissionStatus, string> = {
  DRAFT: '--color-status-gray',
  SUBMITTED: '--color-status-blue',
  TRIAGING: '--color-status-amber',
  TRIAGE_COMPLETE: '--color-status-green',
  DESK_REJECTED: '--color-status-red',
  UNDER_REVIEW: '--color-status-blue',
  DECISION_PENDING: '--color-status-amber',
  ACCEPTED: '--color-status-green',
  REJECTED: '--color-status-red',
  REVISION_REQUESTED: '--color-status-amber',
  PUBLISHED: '--color-status-green',
}

export const STATUS_COLORS: Record<SubmissionStatus, string> = {
  DRAFT: 'bg-[var(--color-status-gray)] text-white',
  SUBMITTED: 'bg-[var(--color-status-blue)] text-white',
  TRIAGING: 'bg-[var(--color-status-amber)] text-white',
  TRIAGE_COMPLETE: 'bg-[var(--color-status-green)] text-white',
  DESK_REJECTED: 'bg-[var(--color-status-red)] text-white',
  UNDER_REVIEW: 'bg-[var(--color-status-blue)] text-white',
  DECISION_PENDING: 'bg-[var(--color-status-amber)] text-white',
  ACCEPTED: 'bg-[var(--color-status-green)] text-white',
  REJECTED: 'bg-[var(--color-status-red)] text-white',
  REVISION_REQUESTED: 'bg-[var(--color-status-amber)] text-white',
  PUBLISHED: 'bg-[var(--color-status-green)] text-white',
}

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  TRIAGING: 'Triaging',
  TRIAGE_COMPLETE: 'Triage Complete',
  DESK_REJECTED: 'Desk Rejected',
  UNDER_REVIEW: 'Under Review',
  DECISION_PENDING: 'Decision Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  REVISION_REQUESTED: 'Revision Requested',
  PUBLISHED: 'Published',
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Derives the happy path by walking VALID_TRANSITIONS from SUBMITTED,
 * always choosing the first (non-terminal-branch) successor.
 * This stays in sync with the backend state machine automatically.
 */
function deriveHappyPath(): ReadonlyArray<SubmissionStatus> {
  const path: Array<SubmissionStatus> = ['SUBMITTED']
  let current: SubmissionStatus = 'SUBMITTED'
  let next: ReadonlyArray<SubmissionStatus> = VALID_TRANSITIONS[current]

  while (next.length > 0) {
    // When there are multiple successors (branch point), pick the
    // successor that itself has further transitions (non-terminal),
    // i.e. the one that continues the happy-path pipeline forward.
    const happyNext: SubmissionStatus = next.length === 1
      ? next[0]
      : next.find((s: SubmissionStatus) => VALID_TRANSITIONS[s].length > 0) ?? next[0]
    path.push(happyNext)
    current = happyNext
    next = VALID_TRANSITIONS[current]
  }

  return path
}

export const HAPPY_PATH: ReadonlyArray<SubmissionStatus> = deriveHappyPath()

/**
 * Derives the branch point for a non-happy-path status by finding
 * which happy-path status can transition to it via VALID_TRANSITIONS.
 */
function findBranchParent(status: SubmissionStatus): SubmissionStatus | undefined {
  for (const happyStatus of HAPPY_PATH) {
    if (VALID_TRANSITIONS[happyStatus].includes(status)) {
      return happyStatus
    }
  }
  return undefined
}

export type TimelineStepState = 'completed' | 'current' | 'future'

export interface TimelineStep {
  status: SubmissionStatus
  label: string
  state: TimelineStepState
}

/**
 * Computes the timeline steps for a given submission status.
 * Derived from VALID_TRANSITIONS — shows the happy path with
 * completed/current/future markers, or a branch path for
 * terminal/off-ramp states.
 */
export function getTimelineSteps(currentStatus: SubmissionStatus): Array<TimelineStep> {
  const happyIndex = HAPPY_PATH.indexOf(currentStatus)

  // Status is on the happy path
  if (happyIndex >= 0) {
    return HAPPY_PATH.map((status, i) => ({
      status,
      label: STATUS_LABELS[status],
      state: i < happyIndex ? 'completed' as const : i === happyIndex ? 'current' as const : 'future' as const,
    }))
  }

  // Status branches off the happy path — find where it diverges
  const branchParent = findBranchParent(currentStatus)
  if (branchParent) {
    const parentIndex = HAPPY_PATH.indexOf(branchParent)
    return [
      ...HAPPY_PATH.slice(0, parentIndex + 1).map((status) => ({
        status,
        label: STATUS_LABELS[status],
        state: 'completed' as const,
      })),
      { status: currentStatus, label: STATUS_LABELS[currentStatus], state: 'current' as const },
    ]
  }

  // DRAFT or any status with no happy-path ancestor — show alone
  return [{ status: currentStatus, label: STATUS_LABELS[currentStatus], state: 'current' as const }]
}
