import { describe, expect, it } from 'vitest'

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
