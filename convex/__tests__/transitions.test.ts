import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'

import {
  SUBMISSION_STATUSES,
  VALID_TRANSITIONS,
  assertTransition,
} from '../helpers/transitions'

import type { SubmissionStatus } from '../helpers/transitions'

describe('SUBMISSION_STATUSES', () => {
  it('contains all 11 statuses', () => {
    expect(SUBMISSION_STATUSES).toHaveLength(11)
  })

  it('includes all expected statuses', () => {
    const expected: Array<SubmissionStatus> = [
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
    ]
    expect([...SUBMISSION_STATUSES]).toEqual(expect.arrayContaining(expected))
  })
})

describe('VALID_TRANSITIONS', () => {
  it('maps every status to an array of valid next statuses', () => {
    for (const status of SUBMISSION_STATUSES) {
      expect(VALID_TRANSITIONS[status]).toBeDefined()
      expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true)
    }
  })

  it('defines correct transitions for each status', () => {
    expect([...VALID_TRANSITIONS.DRAFT]).toEqual(['SUBMITTED'])
    expect([...VALID_TRANSITIONS.SUBMITTED]).toEqual(['TRIAGING'])
    expect([...VALID_TRANSITIONS.TRIAGING]).toEqual(['TRIAGE_COMPLETE'])
    expect([...VALID_TRANSITIONS.TRIAGE_COMPLETE]).toEqual([
      'DESK_REJECTED',
      'UNDER_REVIEW',
    ])
    expect([...VALID_TRANSITIONS.UNDER_REVIEW]).toEqual(['DECISION_PENDING'])
    expect([...VALID_TRANSITIONS.DECISION_PENDING]).toEqual([
      'ACCEPTED',
      'REJECTED',
      'REVISION_REQUESTED',
    ])
    expect([...VALID_TRANSITIONS.ACCEPTED]).toEqual(['PUBLISHED'])
    expect([...VALID_TRANSITIONS.REVISION_REQUESTED]).toEqual(['SUBMITTED'])
  })

  it('terminal states have no valid next states', () => {
    expect(VALID_TRANSITIONS.DESK_REJECTED).toHaveLength(0)
    expect(VALID_TRANSITIONS.REJECTED).toHaveLength(0)
    expect(VALID_TRANSITIONS.PUBLISHED).toHaveLength(0)
  })
})

describe('assertTransition', () => {
  it('allows valid transitions for each status', () => {
    for (const status of SUBMISSION_STATUSES) {
      for (const nextStatus of VALID_TRANSITIONS[status]) {
        expect(() => assertTransition(status, nextStatus)).not.toThrow()
      }
    }
  })

  it('throws INVALID_TRANSITION for invalid transitions', () => {
    expect(() => assertTransition('DRAFT', 'PUBLISHED')).toThrow(ConvexError)
    try {
      assertTransition('DRAFT', 'PUBLISHED')
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError)
      const error = e as ConvexError<{ code: string; message: string }>
      expect(error.data.code).toBe('INVALID_TRANSITION')
      expect(error.data.message).toContain('DRAFT')
      expect(error.data.message).toContain('PUBLISHED')
    }
  })

  it('throws for transitions from terminal states', () => {
    const terminalStatuses: Array<SubmissionStatus> = [
      'DESK_REJECTED',
      'REJECTED',
      'PUBLISHED',
    ]
    for (const terminal of terminalStatuses) {
      for (const target of SUBMISSION_STATUSES) {
        if (target === terminal) continue
        expect(() => assertTransition(terminal, target)).toThrow(ConvexError)
      }
    }
  })

  it('supports the full pipeline path: DRAFT → PUBLISHED', () => {
    const pipeline: Array<SubmissionStatus> = [
      'DRAFT',
      'SUBMITTED',
      'TRIAGING',
      'TRIAGE_COMPLETE',
      'UNDER_REVIEW',
      'DECISION_PENDING',
      'ACCEPTED',
      'PUBLISHED',
    ]
    for (let i = 0; i < pipeline.length - 1; i++) {
      expect(() => assertTransition(pipeline[i], pipeline[i + 1])).not.toThrow()
    }
  })

  it('supports the revision loop: REVISION_REQUESTED → SUBMITTED', () => {
    expect(() =>
      assertTransition('REVISION_REQUESTED', 'SUBMITTED'),
    ).not.toThrow()
  })

  it('error message mentions both statuses', () => {
    try {
      assertTransition('SUBMITTED', 'PUBLISHED')
    } catch (e) {
      const error = e as ConvexError<{ code: string; message: string }>
      expect(error.data.message).toContain('SUBMITTED')
      expect(error.data.message).toContain('PUBLISHED')
    }
  })

  it('error message indicates terminal state when applicable', () => {
    try {
      assertTransition('PUBLISHED', 'DRAFT')
    } catch (e) {
      const error = e as ConvexError<{ code: string; message: string }>
      expect(error.data.message).toContain('terminal state')
    }
  })
})
