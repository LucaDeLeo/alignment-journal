import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'

import { internalMutation, query } from './_generated/server'
import { withUser } from './helpers/auth'
import { unauthorizedError } from './helpers/errors'
import { hasEditorRole } from './helpers/roles'

import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'

/**
 * Logs an action to the auditLogs table.
 * Called from other mutations via ctx.scheduler.runAfter(0, ...).
 */
export const logAction = internalMutation({
  args: {
    submissionId: v.id('submissions'),
    actorId: v.id('users'),
    actorRole: v.string(),
    action: v.string(),
    details: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert('auditLogs', {
      submissionId: args.submissionId,
      actorId: args.actorId,
      actorRole: args.actorRole,
      action: args.action,
      details: args.details,
      createdAt: Date.now(),
    })
    return null
  },
})

/**
 * Lists audit log entries for a submission with pagination.
 * Resolves actor names server-side. Supports optional action type filtering.
 * Requires editor-level role.
 */
export const listBySubmission = query({
  args: {
    submissionId: v.id('submissions'),
    paginationOpts: paginationOptsValidator,
    actionFilter: v.optional(v.string()),
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id('auditLogs'),
        action: v.string(),
        details: v.optional(v.string()),
        actorName: v.string(),
        actorRole: v.string(),
        createdAt: v.number(),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
    pageStatus: v.optional(v.union(v.literal('SplitRecommended'), v.literal('SplitRequired'), v.null())),
    splitCursor: v.optional(v.union(v.string(), v.null())),
  }),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: {
        submissionId: Id<'submissions'>
        paginationOpts: { numItems: number; cursor: string | null }
        actionFilter?: string
      },
    ) => {
      if (
        !hasEditorRole(ctx.user.role)
      ) {
        throw unauthorizedError('Requires editor role')
      }

      const indexedQuery = args.actionFilter
        ? ctx.db
            .query('auditLogs')
            .withIndex('by_submissionId_action', (idx) =>
              idx
                .eq('submissionId', args.submissionId)
                .eq('action', args.actionFilter!),
            )
        : ctx.db
            .query('auditLogs')
            .withIndex('by_submissionId', (idx) =>
              idx.eq('submissionId', args.submissionId),
            )

      const results = await indexedQuery
        .order('asc')
        .paginate(args.paginationOpts)

      const resolvedPage = await Promise.all(
        results.page.map(async (entry) => {
          const actor = await ctx.db.get('users', entry.actorId)
          return {
            _id: entry._id,
            action: entry.action,
            details: entry.details,
            actorName: actor?.name ?? 'Unknown',
            actorRole: entry.actorRole,
            createdAt: entry.createdAt,
          }
        }),
      )

      return {
        ...results,
        page: resolvedPage,
      }
    },
  ),
})
