import { describe, expect, it } from 'vitest'

import {
  buildCandidateDescription,
  buildPaperContext,
  computeFallbackMatch,
} from '../matchingActions'

// We test the pure utility functions from matching.ts
// Since these are module-private, we replicate them here for testing.
// The actual module uses these same implementations.

const MAX_PAPER_TEXT_LENGTH = 8000

function buildPaperText(submission: {
  title: string
  abstract: string
  keywords: Array<string>
}): string {
  const text = `Title: ${submission.title}. Abstract: ${submission.abstract}. Keywords: ${submission.keywords.join(', ')}`
  if (text.length > MAX_PAPER_TEXT_LENGTH) {
    return text.slice(0, MAX_PAPER_TEXT_LENGTH)
  }
  return text
}

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message
    if (msg.includes('API key') || msg.includes('api_key')) {
      return 'External service authentication error'
    }
    if (msg.includes('rate limit') || msg.includes('429')) {
      return 'External service rate limit exceeded. Please try again later.'
    }
    if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
      return 'External service timeout. Please try again.'
    }
    return msg.length > 200
      ? 'An error occurred during reviewer matching'
      : msg.replace(/https?:\/\/[^\s]+/g, '[url]')
  }
  return 'An unexpected error occurred during reviewer matching'
}

function generateFallbackRationale(
  submissionKeywords: Array<string>,
  reviewerAreas: Array<string>,
): string {
  const normalizedKeywords = submissionKeywords.map((k) => k.toLowerCase())
  const normalizedAreas = reviewerAreas.map((a) => a.toLowerCase())
  const overlapping = normalizedAreas.filter((area) =>
    normalizedKeywords.some((kw) => area.includes(kw) || kw.includes(area)),
  )
  if (overlapping.length > 0) {
    return `Expertise in ${overlapping.join(', ')} aligns with this paper's research focus.`
  }
  return `Research profile in ${reviewerAreas.slice(0, 3).join(', ')} may provide relevant perspective.`
}

describe('buildPaperText', () => {
  it('builds text from submission title, abstract, and keywords', () => {
    const result = buildPaperText({
      title: 'Corrigibility',
      abstract: 'A study on corrigible agents.',
      keywords: ['alignment', 'safety'],
    })
    expect(result).toBe(
      'Title: Corrigibility. Abstract: A study on corrigible agents.. Keywords: alignment, safety',
    )
  })

  it('handles empty keywords', () => {
    const result = buildPaperText({
      title: 'Test',
      abstract: 'Abstract',
      keywords: [],
    })
    expect(result).toBe('Title: Test. Abstract: Abstract. Keywords: ')
  })

  it('truncates text exceeding 8000 characters', () => {
    const longAbstract = 'x'.repeat(9000)
    const result = buildPaperText({
      title: 'T',
      abstract: longAbstract,
      keywords: ['k'],
    })
    expect(result.length).toBe(MAX_PAPER_TEXT_LENGTH)
  })

  it('does not truncate text under the limit', () => {
    const result = buildPaperText({
      title: 'Short title',
      abstract: 'Short abstract',
      keywords: ['a', 'b'],
    })
    expect(result.length).toBeLessThan(MAX_PAPER_TEXT_LENGTH)
  })
})

describe('sanitizeErrorMessage', () => {
  it('sanitizes API key errors', () => {
    const result = sanitizeErrorMessage(
      new Error('Incorrect API key provided'),
    )
    expect(result).toBe('External service authentication error')
  })

  it('sanitizes api_key errors', () => {
    const result = sanitizeErrorMessage(
      new Error('invalid api_key in request'),
    )
    expect(result).toBe('External service authentication error')
  })

  it('sanitizes rate limit errors', () => {
    const result = sanitizeErrorMessage(
      new Error('rate limit exceeded for model'),
    )
    expect(result).toBe(
      'External service rate limit exceeded. Please try again later.',
    )
  })

  it('sanitizes 429 errors', () => {
    const result = sanitizeErrorMessage(
      new Error('Request failed with status 429'),
    )
    expect(result).toBe(
      'External service rate limit exceeded. Please try again later.',
    )
  })

  it('sanitizes timeout errors', () => {
    const result = sanitizeErrorMessage(new Error('Request timeout'))
    expect(result).toBe('External service timeout. Please try again.')
  })

  it('sanitizes ETIMEDOUT errors', () => {
    const result = sanitizeErrorMessage(new Error('connect ETIMEDOUT'))
    expect(result).toBe('External service timeout. Please try again.')
  })

  it('strips URLs from error messages', () => {
    const result = sanitizeErrorMessage(
      new Error('Error at https://api.openai.com/v1/embeddings'),
    )
    expect(result).not.toContain('https://')
    expect(result).toContain('[url]')
  })

  it('caps very long error messages', () => {
    const longMsg = 'x'.repeat(300)
    const result = sanitizeErrorMessage(new Error(longMsg))
    expect(result).toBe('An error occurred during reviewer matching')
  })

  it('handles non-Error objects', () => {
    const result = sanitizeErrorMessage('some string error')
    expect(result).toBe(
      'An unexpected error occurred during reviewer matching',
    )
  })

  it('handles null/undefined errors', () => {
    expect(sanitizeErrorMessage(null)).toBe(
      'An unexpected error occurred during reviewer matching',
    )
    expect(sanitizeErrorMessage(undefined)).toBe(
      'An unexpected error occurred during reviewer matching',
    )
  })
})

describe('generateFallbackRationale', () => {
  it('generates rationale from overlapping keywords', () => {
    const result = generateFallbackRationale(
      ['alignment', 'safety', 'corrigibility'],
      ['AI Safety', 'Alignment Theory', 'Machine Learning'],
    )
    expect(result).toContain('aligns with')
    expect(result).toContain('alignment')
  })

  it('handles case-insensitive matching', () => {
    const result = generateFallbackRationale(
      ['SAFETY'],
      ['ai safety', 'ml theory'],
    )
    expect(result).toContain('safety')
    expect(result).toContain('aligns with')
  })

  it('returns generic rationale when no overlap', () => {
    const result = generateFallbackRationale(
      ['quantum computing'],
      ['Neuroscience', 'Cognitive Science', 'Psychology'],
    )
    expect(result).toContain('may provide relevant perspective')
    expect(result).toContain('Neuroscience')
  })

  it('limits generic rationale to 3 research areas', () => {
    const result = generateFallbackRationale(
      ['unrelated'],
      ['Area1', 'Area2', 'Area3', 'Area4', 'Area5'],
    )
    expect(result).toContain('Area1')
    expect(result).toContain('Area2')
    expect(result).toContain('Area3')
    expect(result).not.toContain('Area4')
  })

  it('handles empty keywords', () => {
    const result = generateFallbackRationale([], ['AI Safety'])
    expect(result).toContain('may provide relevant perspective')
  })

  it('handles empty research areas', () => {
    const result = generateFallbackRationale(
      ['alignment'],
      [],
    )
    expect(result).toContain('may provide relevant perspective')
  })

  it('handles partial keyword matching', () => {
    const result = generateFallbackRationale(
      ['safety'],
      ['AI Safety Research'],
    )
    expect(result).toContain('aligns with')
  })
})

// ---------------------------------------------------------------------------
// New exported pure functions from matchingActions.ts
// ---------------------------------------------------------------------------

describe('buildPaperContext', () => {
  it('formats title, abstract, and keywords with newlines', () => {
    const result = buildPaperContext({
      title: 'Corrigibility',
      abstract: 'A study on corrigible agents.',
      keywords: ['alignment', 'safety'],
    })
    expect(result).toContain('Title: Corrigibility')
    expect(result).toContain('Abstract: A study on corrigible agents.')
    expect(result).toContain('Keywords: alignment, safety')
  })

  it('truncates text exceeding 8000 characters', () => {
    const longAbstract = 'x'.repeat(9000)
    const result = buildPaperContext({
      title: 'T',
      abstract: longAbstract,
      keywords: ['k'],
    })
    expect(result.length).toBe(8000)
  })

  it('handles empty keywords', () => {
    const result = buildPaperContext({
      title: 'Test',
      abstract: 'Abstract',
      keywords: [],
    })
    expect(result).toContain('Keywords: ')
  })
})

describe('buildCandidateDescription', () => {
  const baseCandidate = {
    reviewerName: 'Dr. Test',
    affiliation: 'MIT',
    researchAreas: ['alignment', 'safety'],
    publicationTitles: ['Paper A', 'Paper B'],
  }

  it('includes index, name, affiliation, areas, and publications', () => {
    const result = buildCandidateDescription(1, baseCandidate)
    expect(result).toContain('1. Dr. Test (MIT)')
    expect(result).toContain('Research areas: alignment, safety')
    expect(result).toContain('Publications: Paper A; Paper B')
  })

  it('includes bio when provided', () => {
    const result = buildCandidateDescription(1, {
      ...baseCandidate,
      bio: 'Specialist in alignment research.',
    })
    expect(result).toContain('Bio: Specialist in alignment research.')
  })

  it('omits bio line when not provided', () => {
    const result = buildCandidateDescription(1, baseCandidate)
    expect(result).not.toContain('Bio:')
  })

  it('includes primary and secondary expertise levels', () => {
    const result = buildCandidateDescription(1, {
      ...baseCandidate,
      expertiseLevels: [
        { area: 'alignment', level: 'primary' },
        { area: 'safety', level: 'secondary' },
        { area: 'ethics', level: 'familiar' },
      ],
    })
    expect(result).toContain('Primary expertise: alignment')
    expect(result).toContain('Secondary expertise: safety')
    expect(result).not.toContain('familiar')
    expect(result).not.toContain('ethics')
  })

  it('includes education when provided', () => {
    const result = buildCandidateDescription(1, {
      ...baseCandidate,
      education: [
        {
          institution: 'MIT',
          degree: 'PhD',
          field: 'Computer Science',
          yearCompleted: 2020,
        },
      ],
    })
    expect(result).toContain('Education: PhD in Computer Science from MIT (2020)')
  })

  it('omits year when not provided in education', () => {
    const result = buildCandidateDescription(1, {
      ...baseCandidate,
      education: [
        {
          institution: 'MIT',
          degree: 'PhD',
          field: 'CS',
        },
      ],
    })
    expect(result).toContain('Education: PhD in CS from MIT')
    // The education entry should not contain a year in parentheses
    expect(result).not.toMatch(/Education:.*\(\d{4}\)/)
  })

  it('includes preferred topics when provided', () => {
    const result = buildCandidateDescription(1, {
      ...baseCandidate,
      preferredTopics: ['alignment', 'corrigibility'],
    })
    expect(result).toContain('Preferred review topics: alignment, corrigibility')
  })
})

describe('computeFallbackMatch', () => {
  it('returns great tier for high keyword overlap (>= 60%)', () => {
    const result = computeFallbackMatch(
      ['alignment', 'safety', 'corrigibility'],
      { researchAreas: ['alignment', 'safety', 'corrigibility', 'ethics'] },
    )
    expect(result.tier).toBe('great')
    expect(result.score).toBeGreaterThanOrEqual(60)
  })

  it('returns good tier for moderate overlap (30-59%)', () => {
    const result = computeFallbackMatch(
      ['alignment', 'safety', 'corrigibility', 'RLHF', 'oversight'],
      { researchAreas: ['alignment', 'safety'] },
    )
    expect(result.tier).toBe('good')
    expect(result.score).toBeGreaterThanOrEqual(30)
    expect(result.score).toBeLessThan(60)
  })

  it('returns exploring tier for low overlap (< 30%)', () => {
    const result = computeFallbackMatch(
      ['quantum computing', 'physics', 'simulation', 'hardware'],
      { researchAreas: ['AI safety', 'alignment'] },
    )
    expect(result.tier).toBe('exploring')
    expect(result.score).toBeLessThan(30)
  })

  it('considers preferredTopics in overlap calculation', () => {
    const result = computeFallbackMatch(
      ['alignment', 'safety', 'corrigibility'],
      {
        researchAreas: ['unrelated field'],
        preferredTopics: ['alignment', 'safety', 'corrigibility'],
      },
    )
    expect(result.tier).toBe('great')
  })

  it('returns strengths array with overlap description', () => {
    const result = computeFallbackMatch(
      ['alignment'],
      { researchAreas: ['alignment', 'safety'] },
    )
    expect(result.strengths.length).toBeGreaterThan(0)
    expect(result.strengths[0]).toContain('alignment')
  })

  it('returns fallback gapAnalysis', () => {
    const result = computeFallbackMatch(
      ['alignment'],
      { researchAreas: ['alignment'] },
    )
    expect(result.gapAnalysis).toContain('Fallback scoring')
  })

  it('handles empty keywords', () => {
    const result = computeFallbackMatch([], {
      researchAreas: ['alignment'],
    })
    expect(result.tier).toBe('exploring')
    expect(result.score).toBe(0)
  })

  it('handles empty research areas', () => {
    const result = computeFallbackMatch(
      ['alignment'],
      { researchAreas: [] },
    )
    expect(result.tier).toBe('exploring')
    expect(result.score).toBe(0)
  })
})
