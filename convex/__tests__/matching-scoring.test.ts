import { describe, expect, it } from 'vitest'

import { computeFallbackMatch } from '../matchingActions'

// ---------------------------------------------------------------------------
// Batch splitting edge cases (tested via computeFallbackMatch count behavior)
// ---------------------------------------------------------------------------

describe('batch splitting edge cases', () => {
  it('handles 0 candidates (no keywords)', () => {
    const result = computeFallbackMatch([], { researchAreas: [] })
    expect(result.tier).toBe('exploring')
    expect(result.score).toBe(0)
  })

  it('handles single candidate with perfect overlap', () => {
    const result = computeFallbackMatch(
      ['alignment'],
      { researchAreas: ['alignment'] },
    )
    expect(result.tier).toBe('great')
    expect(result.score).toBe(100)
  })

  it('handles single keyword with many areas', () => {
    const result = computeFallbackMatch(
      ['alignment'],
      {
        researchAreas: [
          'alignment',
          'safety',
          'corrigibility',
          'oversight',
          'robustness',
        ],
      },
    )
    // 1 overlap / 1 keyword = 100% -> great
    expect(result.tier).toBe('great')
  })

  it('handles many keywords with single area', () => {
    const keywords = Array.from(
      { length: 15 },
      (_, i) => `keyword_${i}`,
    )
    const result = computeFallbackMatch(keywords, {
      researchAreas: ['keyword_0'],
    })
    // 1 overlap / 15 keywords < 30% -> exploring
    expect(result.tier).toBe('exploring')
  })
})

// ---------------------------------------------------------------------------
// Sort order verification
// ---------------------------------------------------------------------------

describe('sort order tier priority', () => {
  it('tier order: great < good < exploring (numerically)', () => {
    // Simulate the sort logic from matchingActions.ts
    const tierOrder = { great: 0, good: 1, exploring: 2 }

    const evaluations = [
      { tier: 'exploring' as const, score: 90 },
      { tier: 'great' as const, score: 80 },
      { tier: 'good' as const, score: 70 },
      { tier: 'great' as const, score: 95 },
      { tier: 'exploring' as const, score: 30 },
      { tier: 'good' as const, score: 55 },
    ]

    const sorted = [...evaluations].sort((a, b) => {
      const tierDiff = tierOrder[a.tier] - tierOrder[b.tier]
      if (tierDiff !== 0) return tierDiff
      return b.score - a.score
    })

    // First two should be great (95 then 80)
    expect(sorted[0]).toEqual({ tier: 'great', score: 95 })
    expect(sorted[1]).toEqual({ tier: 'great', score: 80 })
    // Next two should be good (70 then 55)
    expect(sorted[2]).toEqual({ tier: 'good', score: 70 })
    expect(sorted[3]).toEqual({ tier: 'good', score: 55 })
    // Last two should be exploring (90 then 30)
    expect(sorted[4]).toEqual({ tier: 'exploring', score: 90 })
    expect(sorted[5]).toEqual({ tier: 'exploring', score: 30 })
  })

  it('same tier sorts by score descending', () => {
    const tierOrder = { great: 0, good: 1, exploring: 2 }

    const evaluations = [
      { tier: 'good' as const, score: 45 },
      { tier: 'good' as const, score: 65 },
      { tier: 'good' as const, score: 55 },
    ]

    const sorted = [...evaluations].sort((a, b) => {
      const tierDiff = tierOrder[a.tier] - tierOrder[b.tier]
      if (tierDiff !== 0) return tierDiff
      return b.score - a.score
    })

    expect(sorted[0].score).toBe(65)
    expect(sorted[1].score).toBe(55)
    expect(sorted[2].score).toBe(45)
  })
})

// ---------------------------------------------------------------------------
// Fallback scoring tier assignment
// ---------------------------------------------------------------------------

describe('computeFallbackMatch tier assignment', () => {
  it('100% overlap -> great tier, score 100', () => {
    const result = computeFallbackMatch(
      ['alignment', 'safety'],
      { researchAreas: ['alignment', 'safety'] },
    )
    expect(result.tier).toBe('great')
    expect(result.score).toBe(100)
  })

  it('50% overlap -> good tier', () => {
    const result = computeFallbackMatch(
      ['alignment', 'safety', 'corrigibility', 'oversight'],
      { researchAreas: ['alignment', 'safety'] },
    )
    expect(result.tier).toBe('good')
    expect(result.score).toBe(50)
  })

  it('20% overlap -> exploring tier', () => {
    const result = computeFallbackMatch(
      ['a', 'b', 'c', 'd', 'e'],
      { researchAreas: ['a'] },
    )
    expect(result.tier).toBe('exploring')
    expect(result.score).toBe(20)
  })

  it('0% overlap -> exploring tier, score 0', () => {
    const result = computeFallbackMatch(
      ['quantum', 'physics'],
      { researchAreas: ['biology', 'chemistry'] },
    )
    expect(result.tier).toBe('exploring')
    expect(result.score).toBe(0)
  })

  it('exactly 60% overlap -> great tier boundary', () => {
    const result = computeFallbackMatch(
      ['a', 'b', 'c', 'd', 'e'],
      { researchAreas: ['a', 'b', 'c'] },
    )
    expect(result.tier).toBe('great')
    expect(result.score).toBe(60)
  })

  it('exactly 30% overlap -> good tier boundary', () => {
    const result = computeFallbackMatch(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
      { researchAreas: ['a', 'b', 'c'] },
    )
    expect(result.tier).toBe('good')
    expect(result.score).toBe(30)
  })

  it('gap analysis message differs for overlap vs no overlap', () => {
    const withOverlap = computeFallbackMatch(
      ['alignment'],
      { researchAreas: ['alignment'] },
    )
    const noOverlap = computeFallbackMatch(
      ['quantum'],
      { researchAreas: ['biology'] },
    )
    expect(withOverlap.gapAnalysis).not.toBe(noOverlap.gapAnalysis)
  })
})
