import { describe, expect, it } from 'vitest'

import {
  ABSTRACT_BONUS,
  EXCELLENT_PAY,
  USEFUL_PAY,
  computePaymentBreakdown,
} from '../payments'

import type { PaymentInput } from '../payments'

function makeInput(overrides: Partial<PaymentInput> = {}): PaymentInput {
  return {
    qualityLevel: undefined,
    hasAbstractAssignment: false,
    ...overrides,
  }
}

describe('Payment formula constants', () => {
  it('has correct useful pay', () => {
    expect(USEFUL_PAY).toBe(200)
  })

  it('has correct excellent pay', () => {
    expect(EXCELLENT_PAY).toBe(400)
  })

  it('has correct abstract bonus', () => {
    expect(ABSTRACT_BONUS).toBe(100)
  })
})

describe('computePaymentBreakdown', () => {
  describe('quality pay', () => {
    it('defaults to useful ($200) when not assessed', () => {
      const result = computePaymentBreakdown(makeInput())
      expect(result.qualityPay).toBe(200)
      expect(result.qualityLevel).toBe('useful')
      expect(result.qualityAssessed).toBe(false)
    })

    it('returns $200 for useful quality', () => {
      const result = computePaymentBreakdown(
        makeInput({ qualityLevel: 'useful' }),
      )
      expect(result.qualityPay).toBe(200)
      expect(result.qualityLevel).toBe('useful')
      expect(result.qualityAssessed).toBe(true)
    })

    it('returns $400 for excellent quality', () => {
      const result = computePaymentBreakdown(
        makeInput({ qualityLevel: 'excellent' }),
      )
      expect(result.qualityPay).toBe(400)
      expect(result.qualityLevel).toBe('excellent')
      expect(result.qualityAssessed).toBe(true)
    })
  })

  describe('abstract bonus', () => {
    it('includes $100 when abstract is assigned', () => {
      const result = computePaymentBreakdown(
        makeInput({ hasAbstractAssignment: true }),
      )
      expect(result.abstractBonus).toBe(100)
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
    it('computes useful with no abstract = $200', () => {
      const result = computePaymentBreakdown(
        makeInput({ qualityLevel: 'useful' }),
      )
      expect(result.total).toBe(200)
    })

    it('computes excellent with no abstract = $400', () => {
      const result = computePaymentBreakdown(
        makeInput({ qualityLevel: 'excellent' }),
      )
      expect(result.total).toBe(400)
    })

    it('computes useful with abstract = $300', () => {
      const result = computePaymentBreakdown(
        makeInput({ qualityLevel: 'useful', hasAbstractAssignment: true }),
      )
      expect(result.total).toBe(300)
    })

    it('computes excellent with abstract = $500 (max)', () => {
      const result = computePaymentBreakdown(
        makeInput({ qualityLevel: 'excellent', hasAbstractAssignment: true }),
      )
      expect(result.total).toBe(500)
    })

    it('computes default (unassessed) with no abstract = $200', () => {
      const result = computePaymentBreakdown(makeInput())
      expect(result.total).toBe(200)
    })

    it('computes default (unassessed) with abstract = $300', () => {
      const result = computePaymentBreakdown(
        makeInput({ hasAbstractAssignment: true }),
      )
      expect(result.total).toBe(300)
    })
  })
})
