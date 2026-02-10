/**
 * Role-gated authentication wrappers for Convex functions.
 *
 * **Project-wide requirement:** Every `query`, `mutation`, and `action` must
 * define both `args` and `returns` validators using `v.*` syntax.
 *
 * All basic wrappers (`withUser`, `withRole`, `withAuthor`, `withEditor`,
 * `withAdmin`) support query, mutation, **and** action contexts.
 * For action contexts, user lookup is performed via an internal query.
 *
 * Assignment-aware wrappers (`withReviewer`, `withActionEditor`) require
 * `ctx.db` and only support query/mutation contexts.
 *
 * @example
 * ```typescript
 * import { query, action } from '../_generated/server'
 * import { v } from 'convex/values'
 * import { withAuthor } from './helpers/auth'
 *
 * export const getSubmission = query({
 *   args: { submissionId: v.id('submissions') },
 *   returns: v.object({ title: v.string() }),
 *   handler: withAuthor(async (ctx, args) => {
 *     const sub = await ctx.db.get('submissions', args.submissionId)
 *     return { title: sub!.title }
 *   }),
 * })
 *
 * export const processSubmission = action({
 *   args: { submissionId: v.id('submissions') },
 *   returns: v.null(),
 *   handler: withAuthor(async (ctx, args) => {
 *     // ctx.user is available; use ctx.runQuery for db access
 *     return null
 *   }),
 * })
 * ```
 */

import { internal } from '../_generated/api'
import { unauthorizedError } from './errors'

import type { Doc, Id } from '../_generated/dataModel'
import type { ActionCtx, MutationCtx, QueryCtx } from '../_generated/server'

/** User document from the `users` table. */
type TUserDoc = Doc<'users'>

/** Any Convex function context (query, mutation, or action). */
type TAnyCtx = QueryCtx | MutationCtx | ActionCtx

/** Context types that have direct database access. */
type TDbCtx = QueryCtx | MutationCtx

/** Extends a context type with the authenticated user document. */
type TAuthCtx<TCtx extends TAnyCtx> = TCtx & { user: TUserDoc }

/** Type guard: does the context have `ctx.db`? */
function hasDb(ctx: TAnyCtx): ctx is TDbCtx {
  return 'db' in ctx
}

/**
 * Resolves the authenticated user from any context type.
 *
 * For query/mutation contexts: uses `ctx.db` directly.
 * For action contexts: uses `ctx.runQuery` with an internal query.
 */
async function resolveUser(ctx: TAnyCtx): Promise<TUserDoc> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw unauthorizedError('Not authenticated')
  }

  let user: TUserDoc | null

  if (hasDb(ctx)) {
    user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()
  } else {
    user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    })
  }

  if (!user) {
    throw unauthorizedError('User record not found')
  }

  return user
}

/**
 * Resolves the Clerk identity, looks up the user in the `users` table,
 * and passes the user document on `ctx.user`.
 * Throws `UNAUTHORIZED` if no identity or no matching user record.
 *
 * Supports query, mutation, and action contexts.
 */
export function withUser<
  TCtx extends TAnyCtx,
  TArgs extends Record<string, unknown>,
  TReturns,
>(
  handler: (ctx: TAuthCtx<TCtx>, args: TArgs) => Promise<TReturns>,
): (ctx: TCtx, args: TArgs) => Promise<TReturns> {
  return async (ctx, args) => {
    const user = await resolveUser(ctx)

    const authenticatedCtx = Object.assign(ctx, {
      user,
    }) as TAuthCtx<TCtx>

    return handler(authenticatedCtx, args)
  }
}

/**
 * Extends `withUser` by checking that the user's `role` field matches.
 * Throws `UNAUTHORIZED` if role doesn't match.
 *
 * Supports query, mutation, and action contexts.
 */
export function withRole<
  TCtx extends TAnyCtx,
  TArgs extends Record<string, unknown>,
  TReturns,
>(
  role: TUserDoc['role'],
  handler: (ctx: TAuthCtx<TCtx>, args: TArgs) => Promise<TReturns>,
): (ctx: TCtx, args: TArgs) => Promise<TReturns> {
  return withUser<TCtx, TArgs, TReturns>(async (ctx, args) => {
    if (ctx.user.role !== role) {
      throw unauthorizedError(
        `Requires role "${role}", but user has role "${ctx.user.role}"`,
      )
    }
    return handler(ctx, args)
  })
}

/** Convenience wrapper: requires `author` role. Supports all context types. */
export function withAuthor<
  TCtx extends TAnyCtx,
  TArgs extends Record<string, unknown>,
  TReturns,
>(
  handler: (ctx: TAuthCtx<TCtx>, args: TArgs) => Promise<TReturns>,
): (ctx: TCtx, args: TArgs) => Promise<TReturns> {
  return withRole('author', handler)
}

/** Convenience wrapper: requires `editor_in_chief` role. Supports all context types. */
export function withEditor<
  TCtx extends TAnyCtx,
  TArgs extends Record<string, unknown>,
  TReturns,
>(
  handler: (ctx: TAuthCtx<TCtx>, args: TArgs) => Promise<TReturns>,
): (ctx: TCtx, args: TArgs) => Promise<TReturns> {
  return withRole('editor_in_chief', handler)
}

/** Convenience wrapper: requires `admin` role. Supports all context types. */
export function withAdmin<
  TCtx extends TAnyCtx,
  TArgs extends Record<string, unknown>,
  TReturns,
>(
  handler: (ctx: TAuthCtx<TCtx>, args: TArgs) => Promise<TReturns>,
): (ctx: TCtx, args: TArgs) => Promise<TReturns> {
  return withRole('admin', handler)
}

/**
 * Assignment-aware wrapper: requires `reviewer` role AND that the user
 * is assigned to the submission (via a matching `reviews` record).
 *
 * The function's `args` must include `submissionId: v.id("submissions")`.
 * Only supports `query` and `mutation` contexts (needs `ctx.db`).
 */
export function withReviewer<
  TCtx extends TDbCtx,
  TArgs extends { submissionId: Id<'submissions'> } & Record<
    string,
    unknown
  >,
  TReturns,
>(
  handler: (ctx: TAuthCtx<TCtx>, args: TArgs) => Promise<TReturns>,
): (ctx: TCtx, args: TArgs) => Promise<TReturns> {
  return withUser<TCtx, TArgs, TReturns>(async (ctx, args) => {
    const isReviewer = ctx.user.role === 'reviewer'
    const isDemoAdmin =
      process.env.DEMO_ROLE_SWITCHER && ctx.user.role === 'admin'

    if (!isReviewer && !isDemoAdmin) {
      throw unauthorizedError(
        `Requires role "reviewer", but user has role "${ctx.user.role}"`,
      )
    }

    const review = await ctx.db
      .query('reviews')
      .withIndex('by_submissionId_reviewerId', (q) =>
        q
          .eq('submissionId', args.submissionId)
          .eq('reviewerId', ctx.user._id),
      )
      .unique()

    if (!review) {
      throw unauthorizedError(
        'Reviewer is not assigned to this submission',
      )
    }

    return handler(ctx, args)
  })
}

/**
 * Assignment-aware wrapper: requires `action_editor` role AND that the user
 * is assigned to the submission (via `submissions.actionEditorId`).
 *
 * The function's `args` must include `submissionId: v.id("submissions")`.
 * Only supports `query` and `mutation` contexts (needs `ctx.db`).
 */
export function withActionEditor<
  TCtx extends TDbCtx,
  TArgs extends { submissionId: Id<'submissions'> } & Record<
    string,
    unknown
  >,
  TReturns,
>(
  handler: (ctx: TAuthCtx<TCtx>, args: TArgs) => Promise<TReturns>,
): (ctx: TCtx, args: TArgs) => Promise<TReturns> {
  return withRole<TCtx, TArgs, TReturns>(
    'action_editor',
    async (ctx, args) => {
      const submission = await ctx.db.get(
        'submissions',
        args.submissionId,
      )
      if (!submission) {
        throw unauthorizedError('Submission not found')
      }

      if (
        !submission.actionEditorId ||
        submission.actionEditorId !== ctx.user._id
      ) {
        throw unauthorizedError(
          'Action editor is not assigned to this submission',
        )
      }

      return handler(ctx, args)
    },
  )
}
