import { v } from 'convex/values'

import { mutation, query } from './_generated/server'
import { withReviewer, withUser } from './helpers/auth'
import { notFoundError, unauthorizedError } from './helpers/errors'
import { submissionStatusValidator } from './helpers/transitions'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

/** Roles allowed to access the review list. */
const REVIEWER_LIST_ROLES = ['reviewer', 'admin'] as const

const reviewStatusValidator = v.union(
  v.literal('assigned'),
  v.literal('in_progress'),
  v.literal('submitted'),
  v.literal('locked'),
)

/**
 * Lists all reviews assigned to the current reviewer with submission metadata.
 * Uses withUser + manual role check (no submissionId arg for withReviewer).
 */
export const listByReviewer = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('reviews'),
      submissionId: v.id('submissions'),
      title: v.string(),
      submissionStatus: submissionStatusValidator,
      reviewStatus: reviewStatusValidator,
      createdAt: v.number(),
    }),
  ),
  handler: withUser(async (ctx: QueryCtx & { user: Doc<'users'> }) => {
    if (
      !REVIEWER_LIST_ROLES.includes(
        ctx.user.role as (typeof REVIEWER_LIST_ROLES)[number],
      )
    ) {
      throw unauthorizedError('Requires reviewer or admin role')
    }

    const reviews = await ctx.db
      .query('reviews')
      .withIndex('by_reviewerId', (q) => q.eq('reviewerId', ctx.user._id))
      .order('desc')
      .collect()

    const results = await Promise.all(
      reviews.map(async (review) => {
        const submission = await ctx.db.get('submissions', review.submissionId)
        if (!submission) return null
        return {
          _id: review._id,
          submissionId: review.submissionId,
          title: submission.title,
          submissionStatus: submission.status,
          reviewStatus: review.status,
          createdAt: review.createdAt,
        }
      }),
    )

    return results.filter(
      (r): r is NonNullable<typeof r> => r !== null,
    )
  }),
})

/**
 * Fetches submission data + review record for the reviewer workspace.
 * Uses withReviewer for assignment-aware auth (reviewer role + matching review record).
 */
export const getSubmissionForReviewer = query({
  args: { submissionId: v.id('submissions') },
  returns: v.union(
    v.null(),
    v.object({
      submission: v.object({
        _id: v.id('submissions'),
        title: v.string(),
        authors: v.array(
          v.object({ name: v.string(), affiliation: v.string() }),
        ),
        abstract: v.string(),
        keywords: v.array(v.string()),
        extractedText: v.optional(v.string()),
        pdfStorageId: v.optional(v.id('_storage')),
        pdfUrl: v.union(v.null(), v.string()),
      }),
      review: v.object({
        _id: v.id('reviews'),
        status: reviewStatusValidator,
        sections: v.object({
          summary: v.optional(v.string()),
          strengths: v.optional(v.string()),
          weaknesses: v.optional(v.string()),
          questions: v.optional(v.string()),
          recommendation: v.optional(v.string()),
        }),
        revision: v.number(),
      }),
    }),
  ),
  handler: withReviewer(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      const submission = await ctx.db.get('submissions', args.submissionId)
      if (!submission) return null

      const review = await ctx.db
        .query('reviews')
        .withIndex('by_submissionId_reviewerId', (q) =>
          q
            .eq('submissionId', args.submissionId)
            .eq('reviewerId', ctx.user._id),
        )
        .unique()
      if (!review) return null

      const pdfUrl = submission.pdfStorageId
        ? await ctx.storage.getUrl(submission.pdfStorageId)
        : null

      return {
        submission: {
          _id: submission._id,
          title: submission.title,
          authors: submission.authors,
          abstract: submission.abstract,
          keywords: submission.keywords,
          extractedText: submission.extractedText,
          pdfStorageId: submission.pdfStorageId,
          pdfUrl,
        },
        review: {
          _id: review._id,
          status: review.status,
          sections: review.sections,
          revision: review.revision,
        },
      }
    },
  ),
})

/**
 * Transitions a review from `assigned` to `in_progress` on first workspace load.
 * Uses withReviewer for assignment-aware auth.
 * Idempotent — no-op if already in_progress or later.
 */
export const startReview = mutation({
  args: { submissionId: v.id('submissions') },
  returns: v.null(),
  handler: withReviewer(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      const review = await ctx.db
        .query('reviews')
        .withIndex('by_submissionId_reviewerId', (q) =>
          q
            .eq('submissionId', args.submissionId)
            .eq('reviewerId', ctx.user._id),
        )
        .unique()

      if (!review) {
        throw notFoundError('Review')
      }

      if (review.status === 'assigned') {
        await ctx.db.patch("reviews", review._id, {
          status: 'in_progress',
          updatedAt: Date.now(),
        })
      }

      return null
    },
  ),
})
