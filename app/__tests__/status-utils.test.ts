import { describe, expect, it } from 'vitest'

import { SUBMISSION_STATUSES } from '../../convex/helpers/transitions'
import {
  HAPPY_PATH,
  STATUS_COLORS,
  STATUS_LABELS,
  formatDate,
  getTimelineSteps,
} from '../features/submissions/status-utils'

import type { SubmissionStatus } from '../../convex/helpers/transitions'

describe('STATUS_COLORS', () => {
  it('has an entry for every submission status', () => {
    for (const status of SUBMISSION_STATUSES) {
      expect(STATUS_COLORS[status]).toBeDefined()
      expect(typeof STATUS_COLORS[status]).toBe('string')
    }
  })
})

describe('STATUS_LABELS', () => {
  it('has an entry for every submission status', () => {
    for (const status of SUBMISSION_STATUSES) {
      expect(STATUS_LABELS[status]).toBeDefined()
      expect(typeof STATUS_LABELS[status]).toBe('string')
    }
  })

  it('returns human-readable labels', () => {
    expect(STATUS_LABELS.SUBMITTED).toBe('Submitted')
    expect(STATUS_LABELS.TRIAGE_COMPLETE).toBe('Triage Complete')
    expect(STATUS_LABELS.DESK_REJECTED).toBe('Desk Rejected')
    expect(STATUS_LABELS.REVISION_REQUESTED).toBe('Revision Requested')
  })
})

describe('formatDate', () => {
  it('formats a timestamp to a readable date string', () => {
    // Jan 15, 2026 — use midday to avoid timezone boundary issues
    const timestamp = new Date('2026-01-15T12:00:00Z').getTime()
    const result = formatDate(timestamp)
    expect(result).toContain('2026')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
  })
})

describe('getTimelineSteps', () => {
  describe('happy path statuses', () => {
    it('returns all happy path steps for SUBMITTED', () => {
      const steps = getTimelineSteps('SUBMITTED')
      expect(steps).toHaveLength(HAPPY_PATH.length)
      expect(steps[0].status).toBe('SUBMITTED')
      expect(steps[0].state).toBe('current')
      // All remaining steps should be future
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i].state).toBe('future')
      }
    })

    it('marks steps correctly for UNDER_REVIEW', () => {
      const steps = getTimelineSteps('UNDER_REVIEW')
      const currentIndex = HAPPY_PATH.indexOf('UNDER_REVIEW')

      for (let i = 0; i < steps.length; i++) {
        if (i < currentIndex) {
          expect(steps[i].state).toBe('completed')
        } else if (i === currentIndex) {
          expect(steps[i].state).toBe('current')
        } else {
          expect(steps[i].state).toBe('future')
        }
      }
    })

    it('marks all prior steps as completed for PUBLISHED', () => {
      const steps = getTimelineSteps('PUBLISHED')
      for (let i = 0; i < steps.length - 1; i++) {
        expect(steps[i].state).toBe('completed')
      }
      expect(steps[steps.length - 1].state).toBe('current')
      expect(steps[steps.length - 1].status).toBe('PUBLISHED')
    })

    it('uses correct labels from STATUS_LABELS', () => {
      const steps = getTimelineSteps('TRIAGING')
      for (const step of steps) {
        expect(step.label).toBe(STATUS_LABELS[step.status])
      }
    })
  })

  describe('branch states', () => {
    it('shows DESK_REJECTED branching from TRIAGE_COMPLETE', () => {
      const steps = getTimelineSteps('DESK_REJECTED')
      // Should show: SUBMITTED, TRIAGING, TRIAGE_COMPLETE (completed), then DESK_REJECTED (current)
      const triageCompleteIdx = HAPPY_PATH.indexOf('TRIAGE_COMPLETE')
      expect(steps).toHaveLength(triageCompleteIdx + 2)

      for (let i = 0; i <= triageCompleteIdx; i++) {
        expect(steps[i].state).toBe('completed')
        expect(steps[i].status).toBe(HAPPY_PATH[i])
      }

      const lastStep = steps[steps.length - 1]
      expect(lastStep.status).toBe('DESK_REJECTED')
      expect(lastStep.state).toBe('current')
    })

    it('shows REJECTED branching from DECISION_PENDING', () => {
      const steps = getTimelineSteps('REJECTED')
      const decisionIdx = HAPPY_PATH.indexOf('DECISION_PENDING')
      expect(steps).toHaveLength(decisionIdx + 2)

      for (let i = 0; i <= decisionIdx; i++) {
        expect(steps[i].state).toBe('completed')
      }

      const lastStep = steps[steps.length - 1]
      expect(lastStep.status).toBe('REJECTED')
      expect(lastStep.state).toBe('current')
    })

    it('shows REVISION_REQUESTED branching from DECISION_PENDING', () => {
      const steps = getTimelineSteps('REVISION_REQUESTED')
      const decisionIdx = HAPPY_PATH.indexOf('DECISION_PENDING')
      expect(steps).toHaveLength(decisionIdx + 2)

      const lastStep = steps[steps.length - 1]
      expect(lastStep.status).toBe('REVISION_REQUESTED')
      expect(lastStep.state).toBe('current')
    })
  })

  describe('DRAFT status', () => {
    it('shows only DRAFT as current', () => {
      const steps = getTimelineSteps('DRAFT')
      expect(steps).toHaveLength(1)
      expect(steps[0].status).toBe('DRAFT')
      expect(steps[0].state).toBe('current')
    })
  })

  describe('all statuses produce valid steps', () => {
    const allStatuses: Array<SubmissionStatus> = [...SUBMISSION_STATUSES]

    for (const status of allStatuses) {
      it(`produces steps for ${status}`, () => {
        const steps = getTimelineSteps(status)
        expect(steps.length).toBeGreaterThan(0)

        // Exactly one step should be 'current'
        const currentSteps = steps.filter((s) => s.state === 'current')
        expect(currentSteps).toHaveLength(1)

        // The current step should match the input status
        expect(currentSteps[0].status).toBe(status)

        // Every step should have a label
        for (const step of steps) {
          expect(step.label).toBeTruthy()
        }
      })
    }
  })
})
