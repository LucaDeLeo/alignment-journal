import { v } from 'convex/values'

import { internal } from './_generated/api'
import { mutation, query } from './_generated/server'
import { withUser } from './helpers/auth'
import {
  notFoundError,
  unauthorizedError,
  validationError,
  versionConflictError,
} from './helpers/errors'
import { EDITOR_ROLES } from './helpers/roles'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

export const ABSTRACT_MIN_WORDS = 150
export const ABSTRACT_MAX_WORDS = 500

const abstractStatusValidator = v.union(
  v.literal('drafting'),
  v.literal('submitted'),
  v.literal('approved'),
)

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Fetches the reviewer abstract record for a submission.
 * Returns null if no abstract exists.
 * Access: the assigned reviewer, the submission author, or editor-level roles.
 */
export const getBySubmission = query({
  args: { submissionId: v.id('submissions') },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('reviewerAbstracts'),
      content: v.string(),
      wordCount: v.number(),
      isSigned: v.boolean(),
      status: abstractStatusValidator,
      authorAccepted: v.optional(v.boolean()),
      authorAcceptedAt: v.optional(v.number()),
      revision: v.number(),
      reviewerName: v.string(),
      isOwnAbstract: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      const abstract = await ctx.db
        .query('reviewerAbstracts')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .unique()

      if (!abstract) return null

      // Access control: assigned reviewer, submission author, or editor role
      const isAssignedReviewer = abstract.reviewerId === ctx.user._id
      const isEditor = EDITOR_ROLES.includes(
        ctx.user.role as (typeof EDITOR_ROLES)[number],
      )

      let isSubmissionAuthor = false
      if (!isAssignedReviewer && !isEditor) {
        const submission = await ctx.db.get(
          'submissions',
          args.submissionId,
        )
        isSubmissionAuthor = submission?.authorId === ctx.user._id
      }

      if (!isAssignedReviewer && !isEditor && !isSubmissionAuthor) {
        throw unauthorizedError(
          'Not authorized to view this abstract',
        )
      }

      const reviewer = await ctx.db.get('users', abstract.reviewerId)

      return {
        _id: abstract._id,
        content: abstract.content,
        wordCount: abstract.wordCount,
        isSigned: abstract.isSigned,
        status: abstract.status,
        authorAccepted: abstract.authorAccepted,
        authorAcceptedAt: abstract.authorAcceptedAt,
        revision: abstract.revision,
        reviewerName: reviewer?.name ?? 'Unknown',
        isOwnAbstract: abstract.reviewerId === ctx.user._id,
        createdAt: abstract.createdAt,
        updatedAt: abstract.updatedAt,
      }
    },
  ),
})

/**
 * Editor selects a reviewer to write the published abstract.
 * Creates a new reviewerAbstracts record with status 'drafting'.
 */
export const createDraft = mutation({
  args: {
    submissionId: v.id('submissions'),
    reviewerId: v.id('users'),
  },
  returns: v.object({ _id: v.id('reviewerAbstracts') }),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'>; reviewerId: Id<'users'> },
    ) => {
      // Validate editor role
      if (
        !EDITOR_ROLES.includes(
          ctx.user.role as (typeof EDITOR_ROLES)[number],
        )
      ) {
        throw unauthorizedError('Requires editor role')
      }

      // Validate submission is ACCEPTED
      const submission = await ctx.db.get(
        'submissions',
        args.submissionId,
      )
      if (!submission) {
        throw notFoundError('Submission')
      }
      if (submission.status !== 'ACCEPTED') {
        throw validationError(
          'Abstract can only be assigned for accepted submissions',
        )
      }

      // Validate reviewer has a submitted or locked review
      const review = await ctx.db
        .query('reviews')
        .withIndex('by_submissionId_reviewerId', (q) =>
          q
            .eq('submissionId', args.submissionId)
            .eq('reviewerId', args.reviewerId),
        )
        .unique()
      if (!review) {
        throw validationError(
          'Reviewer does not have a review for this submission',
        )
      }
      if (review.status !== 'submitted' && review.status !== 'locked') {
        throw validationError(
          'Reviewer must have a submitted or locked review',
        )
      }

      // Validate no abstract already exists
      const existing = await ctx.db
        .query('reviewerAbstracts')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .unique()
      if (existing) {
        throw validationError(
          'An abstract assignment already exists for this submission',
        )
      }

      const now = Date.now()
      const id = await ctx.db.insert('reviewerAbstracts', {
        submissionId: args.submissionId,
        reviewerId: args.reviewerId,
        content: '',
        wordCount: 0,
        isSigned: false,
        status: 'drafting',
        revision: 0,
        createdAt: now,
        updatedAt: now,
      })

      // Audit trail
      const reviewer = await ctx.db.get('users', args.reviewerId)
      await ctx.scheduler.runAfter(0, internal.audit.logAction, {
        submissionId: args.submissionId,
        actorId: ctx.user._id,
        actorRole: ctx.user.role,
        action: 'abstract_assigned',
        details: `Reviewer: ${reviewer?.name ?? 'Unknown'}`,
      })

      return { _id: id }
    },
  ),
})

/**
 * Auto-saves abstract content with optimistic concurrency control.
 * Computes wordCount server-side.
 */
export const updateContent = mutation({
  args: {
    submissionId: v.id('submissions'),
    content: v.string(),
    expectedRevision: v.number(),
  },
  returns: v.object({ revision: v.number() }),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: {
        submissionId: Id<'submissions'>
        content: string
        expectedRevision: number
      },
    ) => {
      const abstract = await ctx.db
        .query('reviewerAbstracts')
        .withIndex('by_submissionId_reviewerId', (q) =>
          q
            .eq('submissionId', args.submissionId)
            .eq('reviewerId', ctx.user._id),
        )
        .unique()

      if (!abstract) {
        throw notFoundError('Reviewer abstract')
      }

      if (abstract.reviewerId !== ctx.user._id) {
        throw unauthorizedError('Not the assigned reviewer')
      }

      if (abstract.status === 'approved') {
        throw validationError(
          'Cannot edit an approved abstract',
        )
      }

      if (args.content.length > 5000) {
        throw validationError(
          'Abstract content exceeds maximum character limit',
        )
      }

      if (abstract.revision !== args.expectedRevision) {
        throw versionConflictError()
      }

      const newRevision = abstract.revision + 1
      const now = Date.now()

      // Clear author acceptance if abstract was previously accepted
      if (abstract.authorAccepted === true) {
        await ctx.db.patch('reviewerAbstracts', abstract._id, {
          content: args.content,
          wordCount: countWords(args.content),
          revision: newRevision,
          updatedAt: now,
          authorAccepted: false,
          authorAcceptedAt: undefined,
        })
      } else {
        await ctx.db.patch('reviewerAbstracts', abstract._id, {
          content: args.content,
          wordCount: countWords(args.content),
          revision: newRevision,
          updatedAt: now,
        })
      }

      return { revision: newRevision }
    },
  ),
})

/**
 * Toggles the signing choice for the abstract.
 * No debounce needed — single boolean toggle.
 */
export const updateSigning = mutation({
  args: {
    submissionId: v.id('submissions'),
    isSigned: v.boolean(),
  },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'>; isSigned: boolean },
    ) => {
      const abstract = await ctx.db
        .query('reviewerAbstracts')
        .withIndex('by_submissionId_reviewerId', (q) =>
          q
            .eq('submissionId', args.submissionId)
            .eq('reviewerId', ctx.user._id),
        )
        .unique()

      if (!abstract) {
        throw notFoundError('Reviewer abstract')
      }

      if (abstract.reviewerId !== ctx.user._id) {
        throw unauthorizedError('Not the assigned reviewer')
      }

      if (abstract.status === 'approved') {
        throw validationError(
          'Cannot modify signing on an approved abstract',
        )
      }

      await ctx.db.patch('reviewerAbstracts', abstract._id, {
        isSigned: args.isSigned,
        updatedAt: Date.now(),
      })

      return null
    },
  ),
})

/**
 * Submits the abstract for editor review.
 * Validates word count is within 150-500 range.
 * Transitions status from 'drafting' to 'submitted'.
 * Idempotent if already 'submitted'.
 */
export const submitAbstract = mutation({
  args: {
    submissionId: v.id('submissions'),
    expectedRevision: v.number(),
  },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'>; expectedRevision: number },
    ) => {
      const abstract = await ctx.db
        .query('reviewerAbstracts')
        .withIndex('by_submissionId_reviewerId', (q) =>
          q
            .eq('submissionId', args.submissionId)
            .eq('reviewerId', ctx.user._id),
        )
        .unique()

      if (!abstract) {
        throw notFoundError('Reviewer abstract')
      }

      if (abstract.reviewerId !== ctx.user._id) {
        throw unauthorizedError('Not the assigned reviewer')
      }

      // Idempotent if already submitted
      if (abstract.status === 'submitted') {
        return null
      }

      if (abstract.status !== 'drafting') {
        throw validationError(
          'Abstract can only be submitted from drafting status',
        )
      }

      if (abstract.revision !== args.expectedRevision) {
        throw versionConflictError()
      }

      if (
        abstract.wordCount < ABSTRACT_MIN_WORDS ||
        abstract.wordCount > ABSTRACT_MAX_WORDS
      ) {
        throw validationError(
          `Abstract must be between ${ABSTRACT_MIN_WORDS} and ${ABSTRACT_MAX_WORDS} words`,
        )
      }

      const newRevision = abstract.revision + 1
      await ctx.db.patch('reviewerAbstracts', abstract._id, {
        status: 'submitted',
        revision: newRevision,
        updatedAt: Date.now(),
      })

      // Audit trail
      await ctx.scheduler.runAfter(0, internal.audit.logAction, {
        submissionId: args.submissionId,
        actorId: ctx.user._id,
        actorRole: ctx.user.role,
        action: 'abstract_submitted',
      })

      return null
    },
  ),
})

/**
 * Editor approves the abstract. Transitions from 'submitted' to 'approved'.
 * The abstract becomes read-only after approval.
 */
export const approveAbstract = mutation({
  args: { submissionId: v.id('submissions') },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      if (
        !EDITOR_ROLES.includes(
          ctx.user.role as (typeof EDITOR_ROLES)[number],
        )
      ) {
        throw unauthorizedError('Requires editor role')
      }

      const abstract = await ctx.db
        .query('reviewerAbstracts')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .unique()

      if (!abstract) {
        throw notFoundError('Reviewer abstract')
      }

      if (abstract.status !== 'submitted') {
        throw validationError(
          'Abstract can only be approved from submitted status',
        )
      }

      await ctx.db.patch('reviewerAbstracts', abstract._id, {
        status: 'approved',
        updatedAt: Date.now(),
      })

      // Audit trail
      await ctx.scheduler.runAfter(0, internal.audit.logAction, {
        submissionId: args.submissionId,
        actorId: ctx.user._id,
        actorRole: ctx.user.role,
        action: 'abstract_approved',
      })

      return null
    },
  ),
})

/**
 * Author accepts the reviewer abstract for publication.
 * Validates the caller is the submission author and the abstract is ready for review.
 * Idempotent — returns early if already accepted.
 */
export const authorAcceptAbstract = mutation({
  args: { submissionId: v.id('submissions') },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      // Validate the submission exists and the caller is the author
      const submission = await ctx.db.get(
        'submissions',
        args.submissionId,
      )
      if (!submission) {
        throw notFoundError('Submission')
      }
      if (submission.authorId !== ctx.user._id) {
        throw unauthorizedError(
          'Only the submission author can accept the abstract',
        )
      }

      // Get the reviewer abstract
      const abstract = await ctx.db
        .query('reviewerAbstracts')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .unique()

      if (!abstract) {
        throw notFoundError('Reviewer abstract')
      }

      // Validate status is submitted or approved (not drafting)
      if (abstract.status === 'drafting') {
        throw validationError(
          'Cannot accept an abstract that is still being drafted',
        )
      }

      // Idempotent — return early if already accepted
      if (abstract.authorAccepted === true) {
        return null
      }

      await ctx.db.patch('reviewerAbstracts', abstract._id, {
        authorAccepted: true,
        authorAcceptedAt: Date.now(),
        updatedAt: Date.now(),
      })

      // Audit trail
      await ctx.scheduler.runAfter(0, internal.audit.logAction, {
        submissionId: args.submissionId,
        actorId: ctx.user._id,
        actorRole: ctx.user.role,
        action: 'abstract_author_accepted',
      })

      return null
    },
  ),
})
