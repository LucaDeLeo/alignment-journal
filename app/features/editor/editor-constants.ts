import { EDITOR_ROLES } from '../../../convex/helpers/roles'
import { SUBMISSION_STATUSES } from '../../../convex/helpers/transitions'
import { STATUS_COLORS, STATUS_LABELS } from '../submissions/status-utils'

import type { SubmissionStatus } from '../../../convex/helpers/transitions'

export { EDITOR_ROLES }

export const STATUS_GROUPS: ReadonlyArray<{
  label: string
  statuses: ReadonlyArray<SubmissionStatus>
}> = [
  {
    label: 'Needs Attention',
    statuses: ['SUBMITTED', 'TRIAGE_COMPLETE', 'DECISION_PENDING'],
  },
  {
    label: 'In Progress',
    statuses: ['TRIAGING', 'UNDER_REVIEW'],
  },
  {
    label: 'Resolved',
    statuses: [
      'ACCEPTED',
      'REJECTED',
      'DESK_REJECTED',
      'PUBLISHED',
      'REVISION_REQUESTED',
    ],
  },
]

export { STATUS_COLORS, STATUS_LABELS, SUBMISSION_STATUSES }
export type { SubmissionStatus }
