import { v } from 'convex/values'

import { mutation } from './_generated/server'
import { withUser } from './helpers/auth'

/**
 * Generates a short-lived upload URL for Convex file storage.
 * Any authenticated user can generate an upload URL — role-specific
 * authorization happens at the point of use (e.g. submissions.create).
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: withUser(async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  }),
})
