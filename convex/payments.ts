import { v } from 'convex/values'

import { query } from './_generated/server'
import { withReviewer } from './helpers/auth'
import { notFoundError } from './helpers/errors'

import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'

// Payment formula constants (exported for reuse in Story 6.2)
export const BASE_FLAT = 100
export const PER_PAGE = 20
export const SPEED_BONUS_PER_WEEK = 100
export const DEADLINE_WEEKS = 4
export const ABSTRACT_BONUS = 300
export const QUALITY_MULTIPLIERS = { standard: 1, excellent: 2 } as const

/** Default page count when no data is available. */
export const DEFAULT_PAGE_COUNT = 15

/** Rough bytes per page for PDF page estimation. */
export const BYTES_PER_PAGE = 3000

/** Input data for pure payment calculation. */
export interface PaymentInput {
  pageCount: number | undefined
  pdfFileSize: number | undefined
  qualityLevel: 'standard' | 'excellent' | undefined
  qualityAssessed: boolean
  reviewCreatedAt: number
  reviewStatus: 'assigned' | 'in_progress' | 'submitted' | 'locked'
  reviewSubmittedAt: number | undefined
  reviewUpdatedAt: number
  hasAbstractAssignment: boolean
  now: number
}

/** Output from payment calculation. */
export interface PaymentBreakdown {
  basePay: number
  pageCount: number
  qualityMultiplier: number
  qualityLevel: 'standard' | 'excellent'
  qualityAssessed: boolean
  speedBonus: number
  weeksEarly: number
  deadlineMs: number
  reviewSubmittedAt: number | undefined
  abstractBonus: number
  hasAbstractAssignment: boolean
  total: number
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

/** Pure function: computes payment breakdown from input data. */
export function computePaymentBreakdown(input: PaymentInput): PaymentBreakdown {
  // Page count
  let pageCount: number
  if (input.pageCount !== undefined) {
    pageCount = input.pageCount
  } else if (input.pdfFileSize !== undefined && input.pdfFileSize > 0) {
    pageCount = Math.max(1, Math.ceil(input.pdfFileSize / BYTES_PER_PAGE))
  } else {
    pageCount = DEFAULT_PAGE_COUNT
  }

  // Base pay
  const basePay = BASE_FLAT + PER_PAGE * pageCount

  // Quality
  const qualityLevel = input.qualityLevel ?? 'standard'
  const qualityMultiplier = QUALITY_MULTIPLIERS[qualityLevel]
  const qualityAssessed = input.qualityAssessed

  // Deadline
  const deadlineMs = input.reviewCreatedAt + DEADLINE_WEEKS * MS_PER_WEEK

  // Weeks early
  let weeksEarly: number
  if (input.reviewStatus === 'submitted' || input.reviewStatus === 'locked') {
    const completionTime = input.reviewSubmittedAt ?? input.reviewUpdatedAt
    weeksEarly = Math.max(0, Math.floor((deadlineMs - completionTime) / MS_PER_WEEK))
  } else {
    weeksEarly = Math.max(0, Math.floor((deadlineMs - input.now) / MS_PER_WEEK))
  }

  // Speed bonus
  const speedBonus = SPEED_BONUS_PER_WEEK * weeksEarly

  // Abstract bonus
  const abstractBonus = input.hasAbstractAssignment ? ABSTRACT_BONUS : 0

  // Total
  const total = basePay * qualityMultiplier + speedBonus + abstractBonus

  return {
    basePay,
    pageCount,
    qualityMultiplier,
    qualityLevel,
    qualityAssessed,
    speedBonus,
    weeksEarly,
    deadlineMs,
    reviewSubmittedAt: input.reviewSubmittedAt,
    abstractBonus,
    hasAbstractAssignment: input.hasAbstractAssignment,
    total,
  }
}

const qualityLevelValidator = v.union(
  v.literal('standard'),
  v.literal('excellent'),
)

/**
 * Computes a detailed line-item payment breakdown for a reviewer on a submission.
 * All values are computed on-the-fly from existing data (FR44, FR46 display-only).
 */
export const getPaymentBreakdown = query({
  args: { submissionId: v.id('submissions') },
  returns: v.object({
    basePay: v.number(),
    pageCount: v.number(),
    qualityMultiplier: v.number(),
    qualityLevel: qualityLevelValidator,
    qualityAssessed: v.boolean(),
    speedBonus: v.number(),
    weeksEarly: v.number(),
    deadlineMs: v.number(),
    reviewSubmittedAt: v.optional(v.number()),
    abstractBonus: v.number(),
    hasAbstractAssignment: v.boolean(),
    total: v.number(),
  }),
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

      // 4. Get submission for PDF file size fallback
      const submission = await ctx.db.get('submissions', args.submissionId)

      // 5. Compute breakdown using pure function
      return computePaymentBreakdown({
        pageCount: paymentRecord?.pageCount,
        pdfFileSize: submission?.pdfFileSize,
        qualityLevel: paymentRecord?.qualityLevel,
        qualityAssessed: paymentRecord !== undefined,
        reviewCreatedAt: review.createdAt,
        reviewStatus: review.status,
        reviewSubmittedAt: review.submittedAt,
        reviewUpdatedAt: review.updatedAt,
        hasAbstractAssignment: abstractRecord !== null,
        now: Date.now(),
      })
    },
  ),
})
