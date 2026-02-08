import { describe, expect, it } from 'vitest'
import { cn } from '~/lib/utils'

describe('project setup', () => {
  it('cn utility merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('cn utility handles undefined classes', () => {
    expect(cn('base', undefined, 'visible')).toBe('base visible')
  })

  it('cn utility deduplicates tailwind classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })
})
