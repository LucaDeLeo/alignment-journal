import { v } from 'convex/values'

import { query } from './_generated/server'
import { withUser } from './helpers/auth'
import { unauthorizedError } from './helpers/errors'
import { hasEditorRole } from './helpers/roles'

import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'

const notificationPreviewValidator = v.object({
  _id: v.id('notifications'),
  recipientName: v.string(),
  type: v.string(),
  subject: v.string(),
  body: v.string(),
  createdAt: v.number(),
})

/**
 * Lists all notifications for a submission, enriched with recipient names.
 * Editor-only access. Returns newest first.
 */
export const listBySubmission = query({
  args: {
    submissionId: v.id('submissions'),
  },
  returns: v.array(notificationPreviewValidator),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      if (!hasEditorRole(ctx.user.role)) {
        throw unauthorizedError('Requires editor role to view notifications')
      }

      const notifications = await ctx.db
        .query('notifications')
        .filter((q) => q.eq(q.field('submissionId'), args.submissionId))
        .collect()

      const enriched = await Promise.all(
        notifications.map(async (notification) => {
          const recipient = await ctx.db.get(
            'users',
            notification.recipientId,
          )
          return {
            _id: notification._id,
            recipientName: recipient?.name ?? 'Unknown',
            type: notification.type,
            subject: notification.subject,
            body: notification.body,
            createdAt: notification.createdAt,
          }
        }),
      )

      // Sort newest first
      enriched.sort((a, b) => b.createdAt - a.createdAt)

      return enriched
    },
  ),
})
