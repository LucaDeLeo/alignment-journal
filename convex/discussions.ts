import { v } from 'convex/values'

import { mutation, query } from './_generated/server'
import { withUser } from './helpers/auth'
import {
  notFoundError,
  unauthorizedError,
  validationError,
} from './helpers/errors'
import { EDITOR_ROLES } from './helpers/roles'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

/** 5-minute edit window for discussion messages (Tier 2). */
const EDIT_WINDOW_MS = 5 * 60 * 1000

/** Maximum character length for discussion messages. */
const MAX_CONTENT_LENGTH = 5000

type DiscussionRole = 'author' | 'reviewer' | 'editor'

const enrichedMessageValidator = v.object({
  _id: v.id('discussions'),
  parentId: v.optional(v.id('discussions')),
  content: v.string(),
  isRetracted: v.boolean(),
  displayName: v.string(),
  displayRole: v.string(),
  isAnonymous: v.boolean(),
  avatarInitials: v.string(),
  isOwnMessage: v.boolean(),
  editableUntil: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})

/**
 * Fetches all discussion messages for a submission with identity gating.
 * Display names are computed server-side based on viewer role + submission status.
 */
export const listBySubmission = query({
  args: { submissionId: v.id('submissions') },
  returns: v.union(
    v.null(),
    v.object({
      messages: v.array(enrichedMessageValidator),
      submissionStatus: v.string(),
      isAuthor: v.boolean(),
      viewerRole: v.string(),
      publicConversation: v.optional(v.boolean()),
      canPost: v.boolean(),
    }),
  ),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      const submission = await ctx.db.get(
        'submissions',
        args.submissionId,
      )
      if (!submission) return null

      // Determine viewer role
      let viewerRole: DiscussionRole | null = null
      const isAuthor = ctx.user._id === submission.authorId
      let review: Doc<'reviews'> | null = null

      if (isAuthor) {
        viewerRole = 'author'
      } else if (
        EDITOR_ROLES.includes(
          ctx.user.role as (typeof EDITOR_ROLES)[number],
        )
      ) {
        viewerRole = 'editor'
      } else {
        // Check if user has a review for this submission
        review = await ctx.db
          .query('reviews')
          .withIndex('by_submissionId_reviewerId', (q) =>
            q
              .eq('submissionId', args.submissionId)
              .eq('reviewerId', ctx.user._id),
          )
          .unique()
        if (review) {
          viewerRole = 'reviewer'
        }
      }

      if (!viewerRole) return null

      // Determine canPost (reuse review from role check to avoid duplicate query)
      let canPost = false
      if (viewerRole === 'author' || viewerRole === 'editor') {
        canPost = true
      } else {
        // viewerRole is 'reviewer' — reuse the review fetched above
        canPost =
          review?.status === 'submitted' || review?.status === 'locked'
      }

      // Fetch all messages sorted by createdAt
      const messages = await ctx.db
        .query('discussions')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .order('asc')
        .collect()

      // Build reviewer pseudonym map (by first appearance order)
      const reviewerOrder: Array<Id<'users'>> = []
      const userCache = new Map<string, Doc<'users'> | null>()

      // Pre-fetch all message authors
      for (const msg of messages) {
        if (!userCache.has(msg.authorId)) {
          const user = await ctx.db.get('users', msg.authorId)
          userCache.set(msg.authorId, user)
        }
      }

      // Determine which authors are reviewers (for pseudonym assignment)
      for (const msg of messages) {
        const msgAuthor = userCache.get(msg.authorId)
        if (!msgAuthor) continue

        const isReviewer =
          msgAuthor._id !== submission.authorId &&
          !EDITOR_ROLES.includes(
            msgAuthor.role as (typeof EDITOR_ROLES)[number],
          )

        if (isReviewer && !reviewerOrder.includes(msgAuthor._id)) {
          reviewerOrder.push(msgAuthor._id)
        }
      }

      const pseudonymMap = new Map<string, string>()
      reviewerOrder.forEach((reviewerId, index) => {
        pseudonymMap.set(reviewerId, `Reviewer ${index + 1}`)
      })

      // Should we anonymize reviewer names for this viewer?
      const shouldAnonymizeReviewers =
        viewerRole === 'author' && submission.status !== 'ACCEPTED'

      // Enrich messages
      const enrichedMessages = messages.map((msg) => {
        const msgAuthor = userCache.get(msg.authorId)
        const authorName = msgAuthor?.name ?? 'Unknown'

        // Determine display role
        let displayRole: DiscussionRole = 'reviewer'
        if (msgAuthor) {
          if (msgAuthor._id === submission.authorId) {
            displayRole = 'author'
          } else if (
            EDITOR_ROLES.includes(
              msgAuthor.role as (typeof EDITOR_ROLES)[number],
            )
          ) {
            displayRole = 'editor'
          }
        }

        // Compute display name and anonymity
        let displayName = authorName
        let isAnonymous = false
        let avatarInitials = ''

        if (displayRole === 'reviewer' && shouldAnonymizeReviewers) {
          const pseudonym = pseudonymMap.get(msg.authorId) ?? 'Reviewer'
          displayName = pseudonym
          isAnonymous = true
          // "Reviewer 1" -> "R1"
          avatarInitials = pseudonym.replace('Reviewer ', 'R')
        } else {
          // Real name — initials from first letters of name parts
          const parts = authorName.split(' ').filter(Boolean)
          avatarInitials =
            parts.length >= 2
              ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
              : authorName.slice(0, 2).toUpperCase()
        }

        return {
          _id: msg._id,
          parentId: msg.parentId,
          content: msg.isRetracted === true ? '' : msg.content,
          isRetracted: msg.isRetracted === true,
          displayName,
          displayRole: displayRole as string,
          isAnonymous,
          avatarInitials,
          isOwnMessage: msg.authorId === ctx.user._id,
          editableUntil: msg.editableUntil ?? 0,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt,
        }
      })

      return {
        messages: enrichedMessages,
        submissionStatus: submission.status,
        isAuthor,
        viewerRole: viewerRole as string,
        publicConversation: submission.publicConversation,
        canPost,
      }
    },
  ),
})

/**
 * Posts a new discussion message (top-level or reply).
 * Validates the user is a participant and sets 5-minute edit window.
 */
export const postMessage = mutation({
  args: {
    submissionId: v.id('submissions'),
    content: v.string(),
    parentId: v.optional(v.id('discussions')),
  },
  returns: v.object({ _id: v.id('discussions') }),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: {
        submissionId: Id<'submissions'>
        content: string
        parentId?: Id<'discussions'>
      },
    ) => {
      const content = args.content.trim()
      if (content.length === 0) {
        throw validationError('Message content cannot be empty')
      }
      if (content.length > MAX_CONTENT_LENGTH) {
        throw validationError(
          `Message content cannot exceed ${MAX_CONTENT_LENGTH} characters`,
        )
      }

      const submission = await ctx.db.get(
        'submissions',
        args.submissionId,
      )
      if (!submission) {
        throw notFoundError('Submission')
      }

      // Validate participant
      const isAuthor = ctx.user._id === submission.authorId
      const isEditor = EDITOR_ROLES.includes(
        ctx.user.role as (typeof EDITOR_ROLES)[number],
      )

      if (!isAuthor && !isEditor) {
        // Must be a reviewer with submitted/locked review
        const review = await ctx.db
          .query('reviews')
          .withIndex('by_submissionId_reviewerId', (q) =>
            q
              .eq('submissionId', args.submissionId)
              .eq('reviewerId', ctx.user._id),
          )
          .unique()

        if (!review) {
          throw unauthorizedError(
            'Not a participant in this discussion',
          )
        }

        if (
          review.status !== 'submitted' &&
          review.status !== 'locked'
        ) {
          throw validationError(
            'You must submit your review before participating in the discussion',
          )
        }
      }

      // Validate parentId if provided
      if (args.parentId) {
        const parent = await ctx.db.get(
          'discussions',
          args.parentId,
        )
        if (!parent) {
          throw notFoundError('Parent message')
        }
        if (parent.submissionId !== args.submissionId) {
          throw validationError(
            'Parent message does not belong to this submission',
          )
        }
      }

      const now = Date.now()
      const id = await ctx.db.insert('discussions', {
        submissionId: args.submissionId,
        authorId: ctx.user._id,
        parentId: args.parentId,
        content,
        isRetracted: false,
        editableUntil: now + EDIT_WINDOW_MS,
        createdAt: now,
        updatedAt: now,
      })

      return { _id: id }
    },
  ),
})

/**
 * Edits a discussion message within the 5-minute edit window.
 */
export const editMessage = mutation({
  args: {
    messageId: v.id('discussions'),
    content: v.string(),
  },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { messageId: Id<'discussions'>; content: string },
    ) => {
      const message = await ctx.db.get(
        'discussions',
        args.messageId,
      )
      if (!message) {
        throw notFoundError('Discussion message')
      }

      if (message.authorId !== ctx.user._id) {
        throw unauthorizedError('You can only edit your own messages')
      }

      if (Date.now() >= (message.editableUntil ?? 0)) {
        throw validationError(
          'The 5-minute edit window has expired',
        )
      }

      const content = args.content.trim()
      if (content.length === 0) {
        throw validationError('Message content cannot be empty')
      }
      if (content.length > MAX_CONTENT_LENGTH) {
        throw validationError(
          `Message content cannot exceed ${MAX_CONTENT_LENGTH} characters`,
        )
      }

      await ctx.db.patch('discussions', args.messageId, {
        content,
        updatedAt: Date.now(),
      })

      return null
    },
  ),
})

/**
 * Retracts a discussion message (replaces content with placeholder).
 * Available after the edit window — retracted messages cannot be un-retracted.
 */
export const retractMessage = mutation({
  args: { messageId: v.id('discussions') },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { messageId: Id<'discussions'> },
    ) => {
      const message = await ctx.db.get(
        'discussions',
        args.messageId,
      )
      if (!message) {
        throw notFoundError('Discussion message')
      }

      if (message.authorId !== ctx.user._id) {
        throw unauthorizedError(
          'You can only retract your own messages',
        )
      }

      if (message.isRetracted === true) {
        throw validationError('Message is already retracted')
      }

      await ctx.db.patch('discussions', args.messageId, {
        isRetracted: true,
        updatedAt: Date.now(),
      })

      return null
    },
  ),
})

/**
 * Toggles `publicConversation` on a rejected submission.
 * Only the submission author can toggle, and only when status is REJECTED.
 */
export const togglePublicConversation = mutation({
  args: { submissionId: v.id('submissions') },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      const submission = await ctx.db.get(
        'submissions',
        args.submissionId,
      )
      if (!submission) {
        throw notFoundError('Submission')
      }

      if (submission.authorId !== ctx.user._id) {
        throw unauthorizedError(
          'Only the submission author can toggle public conversation',
        )
      }

      if (submission.status !== 'REJECTED') {
        throw validationError(
          'Public conversation toggle is only available for rejected submissions',
        )
      }

      if (submission.publicConversation === true) {
        throw validationError(
          'Conversation is already public',
        )
      }

      await ctx.db.patch('submissions', args.submissionId, {
        publicConversation: true,
        updatedAt: Date.now(),
      })

      return null
    },
  ),
})
