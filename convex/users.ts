import { v } from 'convex/values'

import { internalQuery } from './_generated/server'

/**
 * Internal query to look up a user by their Clerk identity subject.
 * Used by auth wrappers to resolve user records from action contexts
 * (which lack direct `ctx.db` access).
 */
export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      clerkId: v.string(),
      email: v.string(),
      name: v.string(),
      affiliation: v.string(),
      role: v.union(
        v.literal('author'),
        v.literal('reviewer'),
        v.literal('action_editor'),
        v.literal('editor_in_chief'),
        v.literal('admin'),
      ),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .unique()
  },
})
