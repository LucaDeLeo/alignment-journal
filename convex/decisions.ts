import { v } from 'convex/values'

import { internal } from './_generated/api'
import { mutation, query } from './_generated/server'
import { withUser } from './helpers/auth'
import {
  notFoundError,
  unauthorizedError,
  validationError,
} from './helpers/errors'
import { EDITOR_ROLES } from './helpers/roles'
import { assertTransition } from './helpers/transitions'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

export const DECISION_NOTE_MAX_LENGTH = 2000

const decisionValidator = v.union(
  v.literal('ACCEPTED'),
  v.literal('REJECTED'),
  v.literal('REVISION_REQUESTED'),
)

/**
 * Notification templates for editorial decisions.
 */
function buildNotificationBody(
  decision: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED',
  title: string,
  decisionNote?: string,
): string {
  switch (decision) {
    case 'ACCEPTED':
      return `Congratulations! Your submission '${title}' has been accepted for publication in the Alignment Journal.\n\n${decisionNote ? `Editor's note: ${decisionNote}\n\n` : ''}The paper will now proceed to the publication pipeline. You will receive further instructions regarding the reviewer abstract process.`
    case 'REJECTED':
      return `After careful review, your submission '${title}' has been declined for publication in the Alignment Journal.\n\nEditor's feedback: ${decisionNote}\n\nWe encourage you to consider the reviewers' feedback for future submissions. You may also wish to make the review conversation public, which can be done from your submission page.`
    case 'REVISION_REQUESTED':
      return `Your submission '${title}' requires revisions before a final decision can be made.\n\nRequired changes:\n${decisionNote}\n\nPlease submit a revised version addressing the requested changes. Your updated submission will be re-reviewed.`
  }
}

function buildNotificationSubject(
  decision: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED',
  title: string,
): string {
  switch (decision) {
    case 'ACCEPTED':
      return `Your submission has been accepted: ${title}`
    case 'REJECTED':
      return `Decision on your submission: ${title}`
    case 'REVISION_REQUESTED':
      return `Revisions requested for your submission: ${title}`
  }
}

/**
 * Maps a decision type to a snake_case action string.
 * Used for both notification types and audit log actions
 * (they use the same mapping).
 */
function decisionToActionString(
  decision: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED',
): string {
  switch (decision) {
    case 'ACCEPTED':
      return 'decision_accepted'
    case 'REJECTED':
      return 'decision_rejected'
    case 'REVISION_REQUESTED':
      return 'decision_revision_requested'
  }
}

/**
 * Makes an editorial decision on a submission.
 * Validates DECISION_PENDING status, transitions to target status,
 * stores decisionNote, creates author notification, logs audit entry.
 */
export const makeDecision = mutation({
  args: {
    submissionId: v.id('submissions'),
    decision: decisionValidator,
    decisionNote: v.optional(v.string()),
  },
  returns: v.object({
    submissionId: v.id('submissions'),
    decision: v.string(),
    decidedAt: v.number(),
  }),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: {
        submissionId: Id<'submissions'>
        decision: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED'
        decisionNote?: string
      },
    ) => {
      // Authorization: editor-level access
      if (
        !EDITOR_ROLES.includes(
          ctx.user.role as (typeof EDITOR_ROLES)[number],
        )
      ) {
        throw unauthorizedError(
          'Requires editor, action editor, or admin role',
        )
      }

      // Read and validate submission
      const submission = await ctx.db.get('submissions', args.submissionId)
      if (!submission) {
        throw notFoundError('Submission', args.submissionId)
      }

      if (submission.status !== 'DECISION_PENDING') {
        throw validationError(
          `Submission must be in DECISION_PENDING status, currently: ${submission.status}`,
        )
      }

      // Validate decision note requirements
      if (
        (args.decision === 'REJECTED' ||
          args.decision === 'REVISION_REQUESTED') &&
        (!args.decisionNote || args.decisionNote.trim().length === 0)
      ) {
        throw validationError(
          args.decision === 'REJECTED'
            ? 'A decision note is required when rejecting a submission'
            : 'Required changes must be provided when requesting revision',
        )
      }

      if (
        args.decisionNote &&
        args.decisionNote.length > DECISION_NOTE_MAX_LENGTH
      ) {
        throw validationError(
          `Decision note must be ${DECISION_NOTE_MAX_LENGTH} characters or fewer`,
        )
      }

      // State machine validation
      assertTransition(submission.status, args.decision)

      const now = Date.now()

      // Patch submission (decidedAt is used for undo TTL, independent of updatedAt)
      await ctx.db.patch('submissions', submission._id, {
        status: args.decision,
        decisionNote: args.decisionNote ?? undefined,
        decidedAt: now,
        updatedAt: now,
      })

      // Create author notification
      const notificationType = decisionToActionString(args.decision)
      const subject = buildNotificationSubject(args.decision, submission.title)
      const body = buildNotificationBody(
        args.decision,
        submission.title,
        args.decisionNote,
      )

      await ctx.db.insert('notifications', {
        recipientId: submission.authorId,
        submissionId: args.submissionId,
        type: notificationType,
        subject,
        body,
        createdAt: now,
      })

      // Log audit entry
      const auditAction = decisionToActionString(args.decision)
      const noteSnippet = args.decisionNote
        ? args.decisionNote.slice(0, 100)
        : undefined

      await ctx.scheduler.runAfter(0, internal.audit.logAction, {
        submissionId: args.submissionId,
        actorId: ctx.user._id,
        actorRole: ctx.user.role,
        action: auditAction,
        details: noteSnippet,
      })

      return {
        submissionId: args.submissionId,
        decision: args.decision,
        decidedAt: now,
      }
    },
  ),
})

/**
 * Undoes a recent editorial decision within a 10-second grace period.
 * Reverts submission to DECISION_PENDING and clears decisionNote.
 * Bypasses the normal transition map since this is a timed undo operation.
 */
export const undoDecision = mutation({
  args: {
    submissionId: v.id('submissions'),
    previousDecision: decisionValidator,
  },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: {
        submissionId: Id<'submissions'>
        previousDecision: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED'
      },
    ) => {
      // Authorization: editor-level access
      if (
        !EDITOR_ROLES.includes(
          ctx.user.role as (typeof EDITOR_ROLES)[number],
        )
      ) {
        throw unauthorizedError(
          'Requires editor, action editor, or admin role',
        )
      }

      // Read and validate submission
      const submission = await ctx.db.get('submissions', args.submissionId)
      if (!submission) {
        throw notFoundError('Submission', args.submissionId)
      }

      if (submission.status !== args.previousDecision) {
        throw validationError(
          `Cannot undo: submission status is ${submission.status}, expected ${args.previousDecision}`,
        )
      }

      // Validate time window (10 seconds) using decidedAt (immutable after decision)
      // Decisions without decidedAt predate undo support and cannot be undone
      if (submission.decidedAt == null) {
        throw validationError('Undo window has expired')
      }
      const elapsed = Date.now() - submission.decidedAt
      if (elapsed > 10_000) {
        throw validationError('Undo window has expired')
      }

      // Revert to DECISION_PENDING (bypasses transition map)
      await ctx.db.patch('submissions', submission._id, {
        status: 'DECISION_PENDING',
        decisionNote: undefined,
        decidedAt: undefined,
        updatedAt: Date.now(),
      })

      // Log audit entry
      await ctx.scheduler.runAfter(0, internal.audit.logAction, {
        submissionId: args.submissionId,
        actorId: ctx.user._id,
        actorRole: ctx.user.role,
        action: 'decision_undone',
        details: `Reversed ${args.previousDecision} decision`,
      })

      return null
    },
  ),
})

/**
 * Computes basic per-reviewer payment estimates for the decision context.
 * Returns ranges based on review status (detailed formula deferred to Epic 6).
 */
export const getPaymentEstimates = query({
  args: {
    submissionId: v.id('submissions'),
  },
  returns: v.array(
    v.object({
      reviewerId: v.id('users'),
      reviewerName: v.string(),
      reviewStatus: v.string(),
      estimateMin: v.number(),
      estimateMax: v.number(),
    }),
  ),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      // Authorization: editor-level access
      if (
        !EDITOR_ROLES.includes(
          ctx.user.role as (typeof EDITOR_ROLES)[number],
        )
      ) {
        throw unauthorizedError(
          'Requires editor, action editor, or admin role',
        )
      }

      // Read all reviews for the submission
      const reviews = await ctx.db
        .query('reviews')
        .withIndex('by_submissionId', (idx) =>
          idx.eq('submissionId', args.submissionId),
        )
        .collect()

      // Deduplicate by reviewerId, keeping the most recent review per reviewer
      const latestByReviewer = new Map<Id<'users'>, (typeof reviews)[number]>()
      for (const review of reviews) {
        const existing = latestByReviewer.get(review.reviewerId)
        if (!existing || review.updatedAt > existing.updatedAt) {
          latestByReviewer.set(review.reviewerId, review)
        }
      }

      const estimates = await Promise.all(
        Array.from(latestByReviewer.values()).map(async (review) => {
          const reviewer = await ctx.db.get('users', review.reviewerId)
          const reviewerName = reviewer?.name ?? 'Unknown'

          let estimateMin: number
          let estimateMax: number

          if (review.status === 'submitted' || review.status === 'locked') {
            estimateMin = 600
            estimateMax = 1500
          } else if (review.status === 'in_progress') {
            estimateMin = 500
            estimateMax = 1200
          } else {
            // assigned — not started
            estimateMin = 0
            estimateMax = 0
          }

          return {
            reviewerId: review.reviewerId,
            reviewerName,
            reviewStatus: review.status,
            estimateMin,
            estimateMax,
          }
        }),
      )

      return estimates
    },
  ),
})
