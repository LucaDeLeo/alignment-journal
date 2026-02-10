import { v } from 'convex/values'

import { internal } from './_generated/api'
import { internalMutation, mutation, query } from './_generated/server'
import { withReviewer, withUser } from './helpers/auth'
import {
  environmentMisconfiguredError,
  notFoundError,
  unauthorizedError,
  validationError,
  versionConflictError,
} from './helpers/errors'
import {
  submissionStatusValidator,
} from './helpers/transitions'

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
        status: submissionStatusValidator,
        extractedText: v.optional(v.string()),
        extractedHtml: v.optional(v.string()),
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
        submittedAt: v.optional(v.number()),
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
          status: submission.status,
          extractedText: submission.extractedText,
          extractedHtml: submission.extractedHtml,
          pdfStorageId: submission.pdfStorageId,
          pdfUrl,
        },
        review: {
          _id: review._id,
          status: review.status,
          sections: review.sections,
          revision: review.revision,
          submittedAt: review.submittedAt,
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
        await ctx.db.patch('reviews', review._id, {
          status: 'in_progress',
          updatedAt: Date.now(),
        })
      }

      return null
    },
  ),
})

const sectionNameValidator = v.union(
  v.literal('summary'),
  v.literal('strengths'),
  v.literal('weaknesses'),
  v.literal('questions'),
  v.literal('recommendation'),
)

/**
 * Auto-saves a single review section with optimistic concurrency.
 * Checks revision to prevent silent overwrites in multi-tab scenarios.
 */
export const updateSection = mutation({
  args: {
    submissionId: v.id('submissions'),
    section: sectionNameValidator,
    content: v.string(),
    expectedRevision: v.number(),
  },
  returns: v.object({ revision: v.number() }),
  handler: withReviewer(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: {
        submissionId: Id<'submissions'>
        section: 'summary' | 'strengths' | 'weaknesses' | 'questions' | 'recommendation'
        content: string
        expectedRevision: number
      },
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

      if (review.status === 'locked' || review.status === 'assigned') {
        throw validationError(
          'Review sections can only be edited when in progress or within the edit window',
        )
      }

      if (review.status === 'submitted') {
        const editDeadline = (review.submittedAt ?? 0) + 15 * 60 * 1000
        if (Date.now() > editDeadline) {
          throw validationError(
            'The 15-minute edit window has expired',
          )
        }
      }

      if (review.revision !== args.expectedRevision) {
        throw versionConflictError()
      }

      const newRevision = review.revision + 1
      await ctx.db.patch('reviews', review._id, {
        sections: {
          ...review.sections,
          [args.section]: args.content,
        },
        revision: newRevision,
        updatedAt: Date.now(),
      })

      return { revision: newRevision }
    },
  ),
})

/**
 * Submits a review after validating all 5 sections have content.
 * Transitions status to submitted, sets submittedAt, and schedules auto-lock.
 */
export const submitReview = mutation({
  args: {
    submissionId: v.id('submissions'),
    expectedRevision: v.number(),
  },
  returns: v.null(),
  handler: withReviewer(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'>; expectedRevision: number },
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

      if (review.revision !== args.expectedRevision) {
        throw versionConflictError()
      }

      if (review.status !== 'in_progress') {
        throw validationError('Review can only be submitted from in_progress status')
      }

      const { sections } = review
      const requiredSections = [
        'summary',
        'strengths',
        'weaknesses',
        'questions',
        'recommendation',
      ] as const
      for (const name of requiredSections) {
        if (!sections[name] || sections[name].trim().length === 0) {
          throw validationError(
            'All sections must be completed before submitting',
          )
        }
      }

      const newRevision = review.revision + 1
      await ctx.db.patch('reviews', review._id, {
        status: 'submitted',
        submittedAt: Date.now(),
        revision: newRevision,
        updatedAt: Date.now(),
      })

      await ctx.scheduler.runAfter(
        15 * 60 * 1000,
        internal.reviews.lockReview,
        { reviewId: review._id },
      )

      return null
    },
  ),
})

/**
 * Auto-locks a review after the 15-minute Tier 2 edit window.
 * Idempotent — no-op if already locked or in a different state.
 */
export const lockReview = internalMutation({
  args: { reviewId: v.id('reviews') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const review = await ctx.db.get('reviews', args.reviewId)
    if (!review) return null

    if (review.status === 'submitted') {
      await ctx.db.patch('reviews', review._id, {
        status: 'locked',
        lockedAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    return null
  },
})

/**
 * Demo-only: assigns the current user as a reviewer on a submission.
 * Gated by DEMO_ROLE_SWITCHER env var (same guard as switchRole).
 * Allows a single account to walk the full editorial pipeline end-to-end.
 */
export const assignSelfAsReviewer = mutation({
  args: { submissionId: v.id('submissions') },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      if (!process.env.DEMO_ROLE_SWITCHER) {
        throw environmentMisconfiguredError(
          'Self-assign reviewer is disabled in production',
        )
      }

      const submission = await ctx.db.get('submissions', args.submissionId)
      if (!submission) {
        throw notFoundError('Submission')
      }

      if (
        submission.status !== 'TRIAGE_COMPLETE' &&
        submission.status !== 'UNDER_REVIEW'
      ) {
        throw validationError(
          'Submission must be in TRIAGE_COMPLETE or UNDER_REVIEW status',
        )
      }

      const existing = await ctx.db
        .query('reviews')
        .withIndex('by_submissionId_reviewerId', (q) =>
          q
            .eq('submissionId', args.submissionId)
            .eq('reviewerId', ctx.user._id),
        )
        .unique()

      if (existing) {
        throw validationError(
          'You already have a review assigned for this submission',
        )
      }

      const now = Date.now()
      await ctx.db.insert('reviews', {
        submissionId: args.submissionId,
        reviewerId: ctx.user._id,
        sections: {},
        status: 'assigned',
        revision: 0,
        createdAt: now,
        updatedAt: now,
      })

      await ctx.scheduler.runAfter(0, internal.audit.logAction, {
        submissionId: args.submissionId,
        actorId: ctx.user._id,
        actorRole: ctx.user.role,
        action: 'assign_self_reviewer',
        details: 'Demo: self-assigned as reviewer',
      })

      return null
    },
  ),
})
