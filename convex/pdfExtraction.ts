import { v } from 'convex/values'

import { internalMutation, internalQuery } from './_generated/server'

/**
 * Internal query to read submission data for the extraction action.
 */
export const getSubmissionInternal = internalQuery({
  args: { submissionId: v.id('submissions') },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('submissions'),
      pdfStorageId: v.optional(v.id('_storage')),
      extractedText: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get('submissions', args.submissionId)
    if (!submission) return null
    return {
      _id: submission._id,
      pdfStorageId: submission.pdfStorageId,
      extractedText: submission.extractedText,
    }
  },
})

/**
 * Internal mutation to persist extracted text on the submission.
 */
export const writeExtractedText = internalMutation({
  args: {
    submissionId: v.id('submissions'),
    extractedText: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("submissions", args.submissionId, {
      extractedText: args.extractedText,
    })
    return null
  },
})
