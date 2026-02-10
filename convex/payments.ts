import { v } from 'convex/values'

import { mutation, query } from './_generated/server'
import { withReviewer, withUser } from './helpers/auth'
import { notFoundError, unauthorizedError, validationError } from './helpers/errors'
import { hasEditorRole } from './helpers/roles'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

// Payment schedule constants (exported for tests)
export const USEFUL_PAY = 200
export const EXCELLENT_PAY = 400
export const ABSTRACT_BONUS = 100

/** Input data for pure payment calculation. */
export interface PaymentInput {
  qualityLevel: 'useful' | 'excellent' | undefined
  hasAbstractAssignment: boolean
}

/** Output from payment calculation. */
export interface PaymentBreakdown {
  qualityLevel: 'useful' | 'excellent'
  qualityAssessed: boolean
  qualityPay: number
  abstractBonus: number
  hasAbstractAssignment: boolean
  total: number
}

/** Pure function: computes payment breakdown from input data. */
export function computePaymentBreakdown(input: PaymentInput): PaymentBreakdown {
  const qualityLevel = input.qualityLevel ?? 'useful'
  const qualityAssessed = input.qualityLevel !== undefined
  const qualityPay = qualityLevel === 'excellent' ? EXCELLENT_PAY : USEFUL_PAY
  const abstractBonus = input.hasAbstractAssignment ? ABSTRACT_BONUS : 0
  const total = qualityPay + abstractBonus

  return {
    qualityLevel,
    qualityAssessed,
    qualityPay,
    abstractBonus,
    hasAbstractAssignment: input.hasAbstractAssignment,
    total,
  }
}

const qualityLevelValidator = v.union(
  v.literal('useful'),
  v.literal('excellent'),
)

const breakdownValidator = v.object({
  qualityLevel: qualityLevelValidator,
  qualityAssessed: v.boolean(),
  qualityPay: v.number(),
  abstractBonus: v.number(),
  hasAbstractAssignment: v.boolean(),
  total: v.number(),
})

/**
 * Computes a detailed line-item payment breakdown for a reviewer on a submission.
 * All values are computed on-the-fly from existing data (FR44, FR46 display-only).
 */
export const getPaymentBreakdown = query({
  args: { submissionId: v.id('submissions') },
  returns: breakdownValidator,
  handler: withReviewer(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      // 1. Find the review record for this reviewer + submission
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

      // 2. Look up the payments record (if any)
      const allPayments = await ctx.db
        .query('payments')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .collect()
      const paymentRecord = allPayments.find(
        (p) => p.reviewerId === ctx.user._id,
      )

      // 3. Look up reviewerAbstracts record
      const abstractRecord = await ctx.db
        .query('reviewerAbstracts')
        .withIndex('by_submissionId_reviewerId', (q) =>
          q
            .eq('submissionId', args.submissionId)
            .eq('reviewerId', ctx.user._id),
        )
        .unique()

      // 4. Compute breakdown using pure function
      return computePaymentBreakdown({
        qualityLevel: paymentRecord?.qualityLevel,
        hasAbstractAssignment: abstractRecord !== null,
      })
    },
  ),
})

const paymentSummaryItemValidator = v.object({
  reviewerId: v.id('users'),
  reviewerName: v.string(),
  reviewStatus: v.string(),
  qualityLevel: qualityLevelValidator,
  qualityAssessed: v.boolean(),
  qualityPay: v.number(),
  abstractBonus: v.number(),
  hasAbstractAssignment: v.boolean(),
  total: v.number(),
})

/**
 * Returns per-reviewer payment breakdowns for a submission.
 * Editor-facing query — uses withUser + EDITOR_ROLES check.
 */
export const getPaymentSummary = query({
  args: { submissionId: v.id('submissions') },
  returns: v.array(paymentSummaryItemValidator),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      if (!hasEditorRole(ctx.user.role)) {
        throw unauthorizedError(
          'Requires editor, action editor, or admin role',
        )
      }

      // Read all reviews for the submission
      const reviews = await ctx.db
        .query('reviews')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .collect()

      // Deduplicate by reviewerId, keeping most recent
      const latestByReviewer = new Map<Id<'users'>, (typeof reviews)[number]>()
      for (const review of reviews) {
        const existing = latestByReviewer.get(review.reviewerId)
        if (!existing || review.updatedAt > existing.updatedAt) {
          latestByReviewer.set(review.reviewerId, review)
        }
      }

      if (latestByReviewer.size === 0) {
        return []
      }

      // Read all payments for the submission
      const allPayments = await ctx.db
        .query('payments')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .collect()

      // Read all reviewer abstracts for the submission
      const allAbstracts = await ctx.db
        .query('reviewerAbstracts')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .collect()

      const summaries = await Promise.all(
        Array.from(latestByReviewer.values()).map(async (review) => {
          const reviewer = await ctx.db.get('users', review.reviewerId)
          const reviewerName = reviewer?.name ?? 'Unknown'

          const paymentRecord = allPayments.find(
            (p) => p.reviewerId === review.reviewerId,
          )
          const abstractRecord = allAbstracts.find(
            (a) => a.reviewerId === review.reviewerId,
          )

          const breakdown = computePaymentBreakdown({
            qualityLevel: paymentRecord?.qualityLevel,
            hasAbstractAssignment: abstractRecord !== undefined,
          })

          return {
            reviewerId: review.reviewerId,
            reviewerName,
            reviewStatus: review.status,
            ...breakdown,
          }
        }),
      )

      return summaries
    },
  ),
})

/**
 * Sets the quality level for a reviewer on a submission.
 * Creates a new payments record if none exists, or updates the existing one.
 * Editor-facing mutation — uses withUser + EDITOR_ROLES check.
 */
export const setQualityLevel = mutation({
  args: {
    submissionId: v.id('submissions'),
    reviewerId: v.id('users'),
    qualityLevel: qualityLevelValidator,
  },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: {
        submissionId: Id<'submissions'>
        reviewerId: Id<'users'>
        qualityLevel: 'useful' | 'excellent'
      },
    ) => {
      if (!hasEditorRole(ctx.user.role)) {
        throw unauthorizedError(
          'Requires editor, action editor, or admin role',
        )
      }

      // Validate submission exists
      const submission = await ctx.db.get('submissions', args.submissionId)
      if (!submission) {
        throw notFoundError('Submission', args.submissionId)
      }

      // Validate review exists for this reviewer/submission
      const review = await ctx.db
        .query('reviews')
        .withIndex('by_submissionId_reviewerId', (q) =>
          q
            .eq('submissionId', args.submissionId)
            .eq('reviewerId', args.reviewerId),
        )
        .first()

      if (!review) {
        throw validationError(
          'No review found for this reviewer on this submission',
        )
      }

      const now = Date.now()

      // Look up existing payments record
      const allPayments = await ctx.db
        .query('payments')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .collect()
      const existing = allPayments.find(
        (p) => p.reviewerId === args.reviewerId,
      )

      if (existing) {
        await ctx.db.patch('payments', existing._id, {
          qualityLevel: args.qualityLevel,
          updatedAt: now,
        })
      } else {
        await ctx.db.insert('payments', {
          submissionId: args.submissionId,
          reviewerId: args.reviewerId,
          qualityLevel: args.qualityLevel,
          createdAt: now,
          updatedAt: now,
        })
      }

      return null
    },
  ),
})
