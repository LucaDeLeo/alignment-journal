import { describe, expect, it } from 'vitest'

import {
  ABSTRACT_BONUS,
  BASE_FLAT,
  BYTES_PER_PAGE,
  DEADLINE_WEEKS,
  DEFAULT_PAGE_COUNT,
  PER_PAGE,
  QUALITY_MULTIPLIERS,
  SPEED_BONUS_PER_WEEK,
  computePaymentBreakdown,
} from '../payments'

import type { PaymentInput } from '../payments'

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

function makeInput(overrides: Partial<PaymentInput> = {}): PaymentInput {
  const now = Date.now()
  return {
    pageCount: undefined,
    pdfFileSize: undefined,
    qualityLevel: undefined,
    qualityAssessed: false,
    reviewCreatedAt: now - 7 * 24 * 60 * 60 * 1000, // 1 week ago
    reviewStatus: 'in_progress',
    reviewSubmittedAt: undefined,
    reviewUpdatedAt: now,
    hasAbstractAssignment: false,
    now,
    ...overrides,
  }
}

describe('Payment formula constants', () => {
  it('has correct base flat amount', () => {
    expect(BASE_FLAT).toBe(100)
  })

  it('has correct per-page rate', () => {
    expect(PER_PAGE).toBe(20)
  })

  it('has correct speed bonus per week', () => {
    expect(SPEED_BONUS_PER_WEEK).toBe(100)
  })

  it('has correct deadline weeks', () => {
    expect(DEADLINE_WEEKS).toBe(4)
  })

  it('has correct abstract bonus', () => {
    expect(ABSTRACT_BONUS).toBe(300)
  })

  it('has correct quality multipliers', () => {
    expect(QUALITY_MULTIPLIERS.standard).toBe(1)
    expect(QUALITY_MULTIPLIERS.excellent).toBe(2)
  })
})

describe('computePaymentBreakdown', () => {
  describe('base pay', () => {
    it('computes base pay from explicit page count', () => {
      const result = computePaymentBreakdown(
        makeInput({ pageCount: 10 }),
      )
      expect(result.basePay).toBe(100 + 20 * 10)
      expect(result.pageCount).toBe(10)
    })

    it('estimates page count from PDF file size', () => {
      const fileSize = 500000 // 10 pages at 50000 bytes/page
      const result = computePaymentBreakdown(
        makeInput({ pdfFileSize: fileSize }),
      )
      expect(result.pageCount).toBe(Math.ceil(fileSize / BYTES_PER_PAGE))
      expect(result.basePay).toBe(100 + 20 * 10)
    })

    it('ensures at least 1 page from PDF estimation', () => {
      const result = computePaymentBreakdown(
        makeInput({ pdfFileSize: 100 }),
      )
      expect(result.pageCount).toBe(1)
    })

    it('defaults to 15 pages when no data available', () => {
      const result = computePaymentBreakdown(makeInput())
      expect(result.pageCount).toBe(DEFAULT_PAGE_COUNT)
      expect(result.basePay).toBe(100 + 20 * 15)
    })

    it('prefers explicit page count over PDF estimation', () => {
      const result = computePaymentBreakdown(
        makeInput({ pageCount: 5, pdfFileSize: 30000 }),
      )
      expect(result.pageCount).toBe(5)
    })
  })

  describe('quality multiplier', () => {
    it('defaults to 1x standard when not assessed', () => {
      const result = computePaymentBreakdown(makeInput())
      expect(result.qualityMultiplier).toBe(1)
      expect(result.qualityLevel).toBe('standard')
      expect(result.qualityAssessed).toBe(false)
    })

    it('applies 1x for standard quality', () => {
      const result = computePaymentBreakdown(
        makeInput({
          qualityLevel: 'standard',
          qualityAssessed: true,
          pageCount: 10,
        }),
      )
      expect(result.qualityMultiplier).toBe(1)
      expect(result.total).toBe(
        (100 + 20 * 10) * 1 + result.speedBonus + result.abstractBonus,
      )
    })

    it('applies 2x for excellent quality to base pay only', () => {
      const now = Date.now()
      const result = computePaymentBreakdown(
        makeInput({
          qualityLevel: 'excellent',
          qualityAssessed: true,
          pageCount: 10,
          hasAbstractAssignment: true,
          // Submitted 3 weeks early
          reviewCreatedAt: now - MS_PER_WEEK,
          reviewStatus: 'submitted',
          reviewSubmittedAt: now,
        }),
      )
      const basePay = 100 + 20 * 10
      expect(result.qualityMultiplier).toBe(2)
      // Total = basePay * 2 + speedBonus + abstractBonus
      expect(result.total).toBe(
        basePay * 2 + result.speedBonus + ABSTRACT_BONUS,
      )
    })
  })

  describe('speed bonus', () => {
    it('computes weeks early for submitted review', () => {
      const now = Date.now()
      // Review created 1 week ago, submitted now => deadline is 3 weeks from now
      // weeksEarly = floor((deadline - submittedAt) / MS_PER_WEEK) = floor(3) = 3
      const reviewCreatedAt = now - MS_PER_WEEK
      const result = computePaymentBreakdown(
        makeInput({
          reviewCreatedAt,
          reviewStatus: 'submitted',
          reviewSubmittedAt: now,
          now,
        }),
      )
      expect(result.weeksEarly).toBe(3)
      expect(result.speedBonus).toBe(300)
    })

    it('computes weeks early for in-progress review', () => {
      const now = Date.now()
      // Review created now => deadline 4 weeks from now
      // weeksEarly = floor((deadline - now) / MS_PER_WEEK) = 4
      const result = computePaymentBreakdown(
        makeInput({
          reviewCreatedAt: now,
          reviewStatus: 'in_progress',
          now,
        }),
      )
      expect(result.weeksEarly).toBe(4)
      expect(result.speedBonus).toBe(400)
    })

    it('returns zero when deadline has passed', () => {
      const now = Date.now()
      // Review created 5 weeks ago => deadline was 1 week ago
      const result = computePaymentBreakdown(
        makeInput({
          reviewCreatedAt: now - 5 * MS_PER_WEEK,
          reviewStatus: 'in_progress',
          now,
        }),
      )
      expect(result.weeksEarly).toBe(0)
      expect(result.speedBonus).toBe(0)
    })

    it('locks speed bonus to submission time for locked reviews', () => {
      const now = Date.now()
      const submittedAt = now - 2 * MS_PER_WEEK
      const reviewCreatedAt = now - 3 * MS_PER_WEEK
      // deadline = reviewCreatedAt + 4 weeks = now + 1 week
      // weeksEarly = floor((deadline - submittedAt) / MS_PER_WEEK) = floor(3) = 3
      const result = computePaymentBreakdown(
        makeInput({
          reviewCreatedAt,
          reviewStatus: 'locked',
          reviewSubmittedAt: submittedAt,
          now,
        }),
      )
      expect(result.weeksEarly).toBe(3)
    })
  })

  describe('abstract bonus', () => {
    it('includes $300 when abstract is assigned', () => {
      const result = computePaymentBreakdown(
        makeInput({ hasAbstractAssignment: true }),
      )
      expect(result.abstractBonus).toBe(300)
      expect(result.hasAbstractAssignment).toBe(true)
    })

    it('returns $0 when no abstract assignment', () => {
      const result = computePaymentBreakdown(
        makeInput({ hasAbstractAssignment: false }),
      )
      expect(result.abstractBonus).toBe(0)
      expect(result.hasAbstractAssignment).toBe(false)
    })
  })

  describe('total', () => {
    it('computes total = (basePay * qualityMultiplier) + speedBonus + abstractBonus', () => {
      const now = Date.now()
      const result = computePaymentBreakdown(
        makeInput({
          pageCount: 20,
          qualityLevel: 'excellent',
          qualityAssessed: true,
          hasAbstractAssignment: true,
          reviewCreatedAt: now,
          reviewStatus: 'in_progress',
          now,
        }),
      )
      const basePay = 100 + 20 * 20 // 500
      const qualityMultiplier = 2
      const speedBonus = 100 * 4 // 4 weeks early
      const abstractBonus = 300
      expect(result.total).toBe(
        basePay * qualityMultiplier + speedBonus + abstractBonus,
      )
      expect(result.total).toBe(1700)
    })

    it('computes minimal total with defaults', () => {
      const now = Date.now()
      // Review created 5 weeks ago, deadline passed, no abstract
      const result = computePaymentBreakdown(
        makeInput({
          reviewCreatedAt: now - 5 * MS_PER_WEEK,
          reviewStatus: 'in_progress',
          now,
        }),
      )
      const basePay = 100 + 20 * 15 // 400 (default pages)
      expect(result.total).toBe(basePay) // no speed bonus, no abstract, standard quality
    })
  })

  describe('deadline', () => {
    it('computes deadline as review creation + 4 weeks', () => {
      const reviewCreatedAt = 1700000000000
      const result = computePaymentBreakdown(
        makeInput({ reviewCreatedAt }),
      )
      expect(result.deadlineMs).toBe(
        reviewCreatedAt + 4 * 7 * 24 * 60 * 60 * 1000,
      )
    })
  })
})
