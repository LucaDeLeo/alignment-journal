import { v } from 'convex/values'

import { internalMutation } from './_generated/server'

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
