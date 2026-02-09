import { v } from 'convex/values'

import { internal } from './_generated/api'
import { mutation, query } from './_generated/server'
import { withUser } from './helpers/auth'
import {
  inviteTokenExpiredError,
  inviteTokenInvalidError,
  inviteTokenUsedError,
  unauthorizedError,
  validationError,
} from './helpers/errors'
import { buildInvitationBody, resolveAcceptLink } from './helpers/invitation_template'
import { hasEditorRole } from './helpers/roles'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

// 24-hour invitation TTL in milliseconds
const INVITE_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Hash a token string using Web Crypto API (available in Convex runtime).
 * Returns the hex-encoded SHA-256 digest.
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const matchDataItemValidator = v.object({
  userId: v.id('users'),
  rationale: v.string(),
})

const inviteStatusValidator = v.union(
  v.literal('pending'),
  v.literal('accepted'),
  v.literal('expired'),
  v.literal('revoked'),
)

const enrichedInviteValidator = v.object({
  _id: v.id('reviewInvites'),
  reviewerId: v.id('users'),
  reviewerName: v.string(),
  status: inviteStatusValidator,
  createdAt: v.number(),
  expiresAt: v.number(),
})

const progressEntryValidator = v.object({
  reviewerId: v.id('users'),
  reviewerName: v.string(),
  reviewStatus: v.union(
    v.literal('assigned'),
    v.literal('in_progress'),
    v.literal('submitted'),
    v.literal('locked'),
  ),
  inviteStatus: inviteStatusValidator,
  createdAt: v.number(),
  daysSinceAssignment: v.number(),
  indicator: v.union(
    v.literal('green'),
    v.literal('amber'),
    v.literal('red'),
  ),
  indicatorLabel: v.string(),
})

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Sends invitations to selected reviewers for a submission.
 * Creates reviewInvites, reviews, and notifications records.
 * Logs audit entries for each invitation.
 */
export const sendInvitations = mutation({
  args: {
    submissionId: v.id('submissions'),
    reviewerIds: v.array(v.id('users')),
    matchData: v.array(matchDataItemValidator),
    customBodies: v.optional(
      v.array(v.object({ userId: v.id('users'), body: v.string() })),
    ),
  },
  returns: v.array(v.id('reviewInvites')),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: {
        submissionId: Id<'submissions'>
        reviewerIds: Array<Id<'users'>>
        matchData: Array<{ userId: Id<'users'>; rationale: string }>
        customBodies?: Array<{ userId: Id<'users'>; body: string }>
      },
    ) => {
      // Authorization: editor-level access
      if (
        !hasEditorRole(ctx.user.role)
      ) {
        throw unauthorizedError('Requires editor role to send invitations')
      }

      // Read submission for notification body
      const submission = await ctx.db.get('submissions', args.submissionId)
      if (!submission) {
        throw validationError('Submission not found')
      }

      const now = Date.now()
      const inviteIds: Array<Id<'reviewInvites'>> = []

      // Deduplicate reviewerIds within this request
      const uniqueReviewerIds = [...new Set(args.reviewerIds)]

      // Fetch existing invites once for duplicate checking
      const existingInvites = await ctx.db
        .query('reviewInvites')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .collect()

      // Track reviewers we've already invited in this loop
      const invitedInThisRequest = new Set<Id<'users'>>()

      for (const reviewerId of uniqueReviewerIds) {
        // Check for existing non-revoked invite for this reviewer+submission
        const hasActiveInvite = existingInvites.some(
          (inv) =>
            inv.reviewerId === reviewerId && inv.revokedAt === undefined,
        )

        if (hasActiveInvite || invitedInThisRequest.has(reviewerId)) {
          continue // Skip duplicate invitation
        }

        invitedInThisRequest.add(reviewerId)

        // Generate unique token
        const reviewAssignmentId = crypto.randomUUID()
        const tokenHash = await hashToken(reviewAssignmentId)

        // Find rationale from matchData
        const matchEntry = args.matchData.find(
          (m) => m.userId === reviewerId,
        )
        const rationale = matchEntry?.rationale ?? 'Selected based on expertise match.'

        // Insert reviewInvites record
        const inviteId = await ctx.db.insert('reviewInvites', {
          submissionId: args.submissionId,
          reviewerId,
          reviewAssignmentId,
          createdBy: ctx.user._id,
          tokenHash,
          expiresAt: now + INVITE_TTL_MS,
          createdAt: now,
        })

        inviteIds.push(inviteId)

        // Insert reviews record with status 'assigned'
        await ctx.db.insert('reviews', {
          submissionId: args.submissionId,
          reviewerId,
          sections: {},
          status: 'assigned',
          revision: 0,
          createdAt: now,
          updatedAt: now,
        })

        // Build notification body — use custom body if provided, else default template
        const customEntry = args.customBodies?.find(
          (c) => c.userId === reviewerId,
        )
        const notificationBody = customEntry
          ? resolveAcceptLink(customEntry.body, reviewAssignmentId)
          : resolveAcceptLink(
              buildInvitationBody(submission.title, rationale),
              reviewAssignmentId,
            )

        await ctx.db.insert('notifications', {
          recipientId: reviewerId,
          submissionId: args.submissionId,
          type: 'reviewer_invitation',
          subject: `Invitation to Review: ${submission.title}`,
          body: notificationBody,
          createdAt: now,
        })

        // Resolve reviewer name for audit log
        const reviewer = await ctx.db.get('users', reviewerId)
        const reviewerName = reviewer?.name ?? 'Unknown'

        // Log audit entry
        await ctx.scheduler.runAfter(0, internal.audit.logAction, {
          submissionId: args.submissionId,
          actorId: ctx.user._id,
          actorRole: ctx.user.role,
          action: 'reviewer_invited',
          details: `Invited ${reviewerName}. Rationale: ${rationale}`,
        })
      }

      return inviteIds
    },
  ),
})

/**
 * Revokes a pending invitation.
 * Sets revokedAt on the invite record and logs an audit entry.
 */
export const revokeInvitation = mutation({
  args: {
    inviteId: v.id('reviewInvites'),
  },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { inviteId: Id<'reviewInvites'> },
    ) => {
      // Authorization: editor-level access
      if (
        !hasEditorRole(ctx.user.role)
      ) {
        throw unauthorizedError('Requires editor role to revoke invitations')
      }

      const invite = await ctx.db.get('reviewInvites', args.inviteId)
      if (!invite) {
        throw validationError('Invitation not found')
      }

      if (invite.consumedAt !== undefined) {
        throw validationError('Cannot revoke an already accepted invitation')
      }

      if (invite.revokedAt !== undefined) {
        throw validationError('Invitation is already revoked')
      }

      await ctx.db.patch('reviewInvites', args.inviteId, {
        revokedAt: Date.now(),
      })

      // Resolve reviewer name for audit log
      const reviewer = await ctx.db.get('users', invite.reviewerId)
      const reviewerName = reviewer?.name ?? 'Unknown'

      await ctx.scheduler.runAfter(0, internal.audit.logAction, {
        submissionId: invite.submissionId,
        actorId: ctx.user._id,
        actorRole: ctx.user.role,
        action: 'reviewer_invite_revoked',
        details: `Revoked invitation for ${reviewerName}`,
      })

      return null
    },
  ),
})

/**
 * Accepts an invitation by validating the token, consuming it, and upgrading
 * the user's role from 'author' to 'reviewer' if needed.
 */
export const acceptInvitation = mutation({
  args: {
    token: v.string(),
  },
  returns: v.object({
    submissionId: v.id('submissions'),
    reviewerId: v.id('users'),
  }),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { token: string },
    ) => {
      const tokenHash = await hashToken(args.token)

      const invite = await ctx.db
        .query('reviewInvites')
        .withIndex('by_tokenHash', (q) => q.eq('tokenHash', tokenHash))
        .unique()

      if (!invite) {
        throw inviteTokenInvalidError()
      }

      if (invite.revokedAt !== undefined) {
        throw inviteTokenInvalidError()
      }

      if (invite.consumedAt !== undefined) {
        throw inviteTokenUsedError()
      }

      if (invite.expiresAt < Date.now()) {
        throw inviteTokenExpiredError()
      }

      // Verify the authenticated user is the intended reviewer
      if (invite.reviewerId !== ctx.user._id) {
        throw unauthorizedError(
          'This invitation was sent to a different reviewer',
        )
      }

      // Atomically consume the invitation
      await ctx.db.patch('reviewInvites', invite._id, {
        consumedAt: Date.now(),
      })

      // Upgrade role from author to reviewer (never downgrade)
      if (ctx.user.role === 'author') {
        await ctx.db.patch('users', ctx.user._id, {
          role: 'reviewer',
        })
      }

      // Log audit entry
      await ctx.scheduler.runAfter(0, internal.audit.logAction, {
        submissionId: invite.submissionId,
        actorId: ctx.user._id,
        actorRole: ctx.user.role,
        action: 'invitation_accepted',
        details: `${ctx.user.name} accepted the invitation`,
      })

      return {
        submissionId: invite.submissionId,
        reviewerId: ctx.user._id,
      }
    },
  ),
})

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Public query to check the status of an invitation token without consuming it.
 * Does NOT require authentication.
 */
export const getInviteStatus = query({
  args: {
    token: v.string(),
  },
  returns: v.object({
    status: v.union(
      v.literal('valid'),
      v.literal('expired'),
      v.literal('consumed'),
      v.literal('revoked'),
      v.literal('invalid'),
    ),
    submissionId: v.optional(v.id('submissions')),
  }),
  handler: async (ctx, args) => {
    const tokenHash = await hashToken(args.token)

    const invite = await ctx.db
      .query('reviewInvites')
      .withIndex('by_tokenHash', (q) => q.eq('tokenHash', tokenHash))
      .unique()

    if (!invite) {
      return { status: 'invalid' as const }
    }

    if (invite.revokedAt !== undefined) {
      return { status: 'revoked' as const, submissionId: invite.submissionId }
    }

    if (invite.consumedAt !== undefined) {
      return { status: 'consumed' as const, submissionId: invite.submissionId }
    }

    if (invite.expiresAt < Date.now()) {
      return { status: 'expired' as const, submissionId: invite.submissionId }
    }

    return { status: 'valid' as const, submissionId: invite.submissionId }
  },
})

/**
 * Derives the status of an invitation from its fields.
 */
function deriveInviteStatus(
  invite: Doc<'reviewInvites'>,
): 'revoked' | 'accepted' | 'expired' | 'pending' {
  if (invite.revokedAt !== undefined) return 'revoked'
  if (invite.consumedAt !== undefined) return 'accepted'
  if (invite.expiresAt < Date.now()) return 'expired'
  return 'pending'
}

/**
 * Lists all invitations for a submission with reviewer names and derived statuses.
 */
export const listBySubmission = query({
  args: {
    submissionId: v.id('submissions'),
  },
  returns: v.array(enrichedInviteValidator),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      // Authorization: editor-level access
      if (
        !hasEditorRole(ctx.user.role)
      ) {
        throw unauthorizedError('Requires editor role')
      }

      const invites = await ctx.db
        .query('reviewInvites')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .collect()

      const enriched = await Promise.all(
        invites.map(async (invite) => {
          const reviewer = await ctx.db.get('users', invite.reviewerId)
          return {
            _id: invite._id,
            reviewerId: invite.reviewerId,
            reviewerName: reviewer?.name ?? 'Unknown',
            status: deriveInviteStatus(invite),
            createdAt: invite.createdAt,
            expiresAt: invite.expiresAt,
          }
        }),
      )

      return enriched
    },
  ),
})

/**
 * Returns review progress data for all reviewers on a submission.
 * Joins reviews and reviewInvites data with reviewer names.
 */
export const getReviewProgress = query({
  args: {
    submissionId: v.id('submissions'),
  },
  returns: v.array(progressEntryValidator),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      // Authorization: editor-level access
      if (
        !hasEditorRole(ctx.user.role)
      ) {
        throw unauthorizedError('Requires editor role')
      }

      const reviews = await ctx.db
        .query('reviews')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .collect()

      const invites = await ctx.db
        .query('reviewInvites')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .collect()

      const now = Date.now()
      const MS_PER_DAY = 24 * 60 * 60 * 1000
      const OVERDUE_THRESHOLD_DAYS = 7

      const entries = await Promise.all(
        reviews.map(async (review) => {
          const reviewer = await ctx.db.get('users', review.reviewerId)
          const reviewerName = reviewer?.name ?? 'Unknown'

          // Find corresponding invite
          const invite = invites.find(
            (inv) => inv.reviewerId === review.reviewerId,
          )
          const inviteStatus = invite
            ? deriveInviteStatus(invite)
            : ('pending' as const)

          const daysSinceAssignment = Math.floor(
            (now - review.createdAt) / MS_PER_DAY,
          )

          // Determine progress indicator
          let indicator: 'green' | 'amber' | 'red'
          let indicatorLabel: string

          if (
            review.status === 'submitted' ||
            review.status === 'locked'
          ) {
            indicator = 'green'
            indicatorLabel = 'Submitted'
          } else if (review.status === 'in_progress') {
            indicator = 'amber'
            indicatorLabel = 'In Progress'
          } else if (daysSinceAssignment <= OVERDUE_THRESHOLD_DAYS) {
            // status is 'assigned' and within threshold
            indicator = 'amber'
            indicatorLabel = 'Awaiting Response'
          } else {
            indicator = 'red'
            indicatorLabel = 'No Response'
          }

          return {
            reviewerId: review.reviewerId,
            reviewerName,
            reviewStatus: review.status,
            inviteStatus,
            createdAt: review.createdAt,
            daysSinceAssignment,
            indicator,
            indicatorLabel,
          }
        }),
      )

      return entries
    },
  ),
})
