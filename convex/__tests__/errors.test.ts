import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'

import {
  environmentMisconfiguredError,
  externalServiceError,
  invalidTransitionError,
  inviteTokenExpiredError,
  inviteTokenInvalidError,
  inviteTokenUsedError,
  notFoundError,
  unauthorizedError,
  validationError,
  versionConflictError,
} from '../helpers/errors'

describe('Error helpers', () => {
  it('unauthorizedError returns ConvexError with UNAUTHORIZED code', () => {
    const error = unauthorizedError()
    expect(error).toBeInstanceOf(ConvexError)
    expect(error.data.code).toBe('UNAUTHORIZED')
    expect(error.data.message).toBe('Authentication required')
  })

  it('unauthorizedError accepts a custom message', () => {
    const error = unauthorizedError('Custom message')
    expect(error.data.code).toBe('UNAUTHORIZED')
    expect(error.data.message).toBe('Custom message')
  })

  it('invalidTransitionError includes both statuses in message', () => {
    const error = invalidTransitionError('SUBMITTED', 'PUBLISHED')
    expect(error).toBeInstanceOf(ConvexError)
    expect(error.data.code).toBe('INVALID_TRANSITION')
    expect(error.data.message).toContain('SUBMITTED')
    expect(error.data.message).toContain('PUBLISHED')
  })

  it('notFoundError with resource only', () => {
    const error = notFoundError('Submission')
    expect(error).toBeInstanceOf(ConvexError)
    expect(error.data.code).toBe('NOT_FOUND')
    expect(error.data.message).toBe('Submission not found')
  })

  it('notFoundError with resource and id', () => {
    const error = notFoundError('Submission', 'abc123')
    expect(error.data.code).toBe('NOT_FOUND')
    expect(error.data.message).toContain('abc123')
  })

  it('validationError includes the provided message', () => {
    const error = validationError('Title is required')
    expect(error).toBeInstanceOf(ConvexError)
    expect(error.data.code).toBe('VALIDATION_ERROR')
    expect(error.data.message).toBe('Title is required')
  })

  it('versionConflictError returns VERSION_CONFLICT', () => {
    const error = versionConflictError()
    expect(error).toBeInstanceOf(ConvexError)
    expect(error.data.code).toBe('VERSION_CONFLICT')
    expect(error.data.message).toContain('modified')
  })

  it('inviteTokenInvalidError returns INVITE_TOKEN_INVALID', () => {
    const error = inviteTokenInvalidError()
    expect(error).toBeInstanceOf(ConvexError)
    expect(error.data.code).toBe('INVITE_TOKEN_INVALID')
  })

  it('inviteTokenExpiredError returns INVITE_TOKEN_EXPIRED', () => {
    const error = inviteTokenExpiredError()
    expect(error).toBeInstanceOf(ConvexError)
    expect(error.data.code).toBe('INVITE_TOKEN_EXPIRED')
  })

  it('inviteTokenUsedError returns INVITE_TOKEN_USED', () => {
    const error = inviteTokenUsedError()
    expect(error).toBeInstanceOf(ConvexError)
    expect(error.data.code).toBe('INVITE_TOKEN_USED')
  })

  it('externalServiceError includes service name', () => {
    const error = externalServiceError('OpenAI')
    expect(error).toBeInstanceOf(ConvexError)
    expect(error.data.code).toBe('EXTERNAL_SERVICE_ERROR')
    expect(error.data.message).toContain('OpenAI')
  })

  it('externalServiceError includes optional message', () => {
    const error = externalServiceError('OpenAI', 'Rate limit exceeded')
    expect(error.data.message).toContain('OpenAI')
    expect(error.data.message).toContain('Rate limit exceeded')
  })

  it('environmentMisconfiguredError includes the message', () => {
    const error = environmentMisconfiguredError(
      'CLERK_JWT_ISSUER_DOMAIN is not set',
    )
    expect(error).toBeInstanceOf(ConvexError)
    expect(error.data.code).toBe('ENVIRONMENT_MISCONFIGURED')
    expect(error.data.message).toContain('CLERK_JWT_ISSUER_DOMAIN')
  })

  it('all helpers return errors with code and message fields', () => {
    const errors: Array<ConvexError<{ code: string; message: string }>> = [
      unauthorizedError(),
      invalidTransitionError('A', 'B'),
      notFoundError('X'),
      validationError('msg'),
      versionConflictError(),
      inviteTokenInvalidError(),
      inviteTokenExpiredError(),
      inviteTokenUsedError(),
      externalServiceError('svc'),
      environmentMisconfiguredError('msg'),
    ]

    for (const error of errors) {
      expect(error).toBeInstanceOf(ConvexError)
      expect(typeof error.data.code).toBe('string')
      expect(typeof error.data.message).toBe('string')
      expect(error.data.code.length).toBeGreaterThan(0)
      expect(error.data.message.length).toBeGreaterThan(0)
    }
  })
})
