import { ConvexError } from 'convex/values'

/** All typed error codes used across the application. */
export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_TRANSITION'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'VERSION_CONFLICT'
  | 'INVITE_TOKEN_INVALID'
  | 'INVITE_TOKEN_EXPIRED'
  | 'INVITE_TOKEN_USED'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'ENVIRONMENT_MISCONFIGURED'

export function unauthorizedError(message = 'Authentication required') {
  return new ConvexError({
    code: 'UNAUTHORIZED' as const,
    message,
  })
}

export function invalidTransitionError(from: string, to: string) {
  return new ConvexError({
    code: 'INVALID_TRANSITION' as const,
    message: `Cannot transition from ${from} to ${to}`,
  })
}

export function notFoundError(resource: string, id?: string) {
  const message = id
    ? `${resource} not found: ${id}`
    : `${resource} not found`
  return new ConvexError({ code: 'NOT_FOUND' as const, message })
}

export function validationError(message: string) {
  return new ConvexError({ code: 'VALIDATION_ERROR' as const, message })
}

export function versionConflictError() {
  return new ConvexError({
    code: 'VERSION_CONFLICT' as const,
    message:
      'Document has been modified by another request. Please refresh and try again.',
  })
}

export function inviteTokenInvalidError() {
  return new ConvexError({
    code: 'INVITE_TOKEN_INVALID' as const,
    message: 'The invitation token is invalid',
  })
}

export function inviteTokenExpiredError() {
  return new ConvexError({
    code: 'INVITE_TOKEN_EXPIRED' as const,
    message: 'The invitation token has expired',
  })
}

export function inviteTokenUsedError() {
  return new ConvexError({
    code: 'INVITE_TOKEN_USED' as const,
    message: 'The invitation token has already been used',
  })
}

export function externalServiceError(service: string, message?: string) {
  const msg = message
    ? `External service error (${service}): ${message}`
    : `External service error: ${service}`
  return new ConvexError({
    code: 'EXTERNAL_SERVICE_ERROR' as const,
    message: msg,
  })
}

export function environmentMisconfiguredError(message: string) {
  return new ConvexError({
    code: 'ENVIRONMENT_MISCONFIGURED' as const,
    message,
  })
}
