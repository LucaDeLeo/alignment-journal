import { v } from 'convex/values'

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import { withUser } from './helpers/auth'
import {
  notFoundError,
  unauthorizedError,
  validationError,
} from './helpers/errors'
import { WRITE_ROLES, hasEditorRole } from './helpers/roles'

import type { Doc } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

/** Reusable validator for a single publication entry. */
const publicationValidator = v.object({
  title: v.string(),
  venue: v.string(),
  year: v.number(),
})

/** Return validator for profile documents with resolved user data. */
const enrichedProfileValidator = v.object({
  _id: v.id('reviewerProfiles'),
  userId: v.id('users'),
  userName: v.string(),
  userAffiliation: v.string(),
  researchAreas: v.array(v.string()),
  publicationCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})

/** Return validator for the full profile (used by getProfileByUserId). */
const fullProfileValidator = v.object({
  _id: v.id('reviewerProfiles'),
  userId: v.id('users'),
  researchAreas: v.array(v.string()),
  publications: v.array(publicationValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
})

/** Return validator for reviewer users (user selector dropdown). */
const reviewerUserValidator = v.object({
  _id: v.id('users'),
  name: v.string(),
  affiliation: v.string(),
})

// ---------------------------------------------------------------------------
// Internal helpers (not exposed to client)
// ---------------------------------------------------------------------------

/**
 * Internal query to fetch a reviewer profile by its document ID.
 * Used by the `generateEmbedding` action to read profile data.
 */
export const getAllProfilesInternal = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('reviewerProfiles'),
      userId: v.id('users'),
      researchAreas: v.array(v.string()),
      publications: v.array(publicationValidator),
    }),
  ),
  handler: async (ctx) => {
    const profiles = await ctx.db.query('reviewerProfiles').collect()
    return profiles.map((p) => ({
      _id: p._id,
      userId: p.userId,
      researchAreas: p.researchAreas,
      publications: p.publications,
    }))
  },
})

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Creates or updates a reviewer profile (upsert semantics).
 * Requires admin or editor_in_chief role.
 */
export const createOrUpdateProfile = mutation({
  args: {
    userId: v.id('users'),
    researchAreas: v.array(v.string()),
    publications: v.array(publicationValidator),
  },
  returns: v.id('reviewerProfiles'),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: {
        userId: Doc<'reviewerProfiles'>['userId']
        researchAreas: Array<string>
        publications: Array<{ title: string; venue: string; year: number }>
      },
    ) => {
      // Authorization: admin or editor_in_chief only
      if (
        !WRITE_ROLES.includes(
          ctx.user.role as (typeof WRITE_ROLES)[number],
        )
      ) {
        throw unauthorizedError(
          'Requires admin or editor_in_chief role to manage reviewer profiles',
        )
      }

      // Validate target user exists
      const targetUser = await ctx.db.get('users', args.userId)
      if (!targetUser) {
        throw notFoundError('User', args.userId)
      }

      // Validate target user has reviewer role
      if (targetUser.role !== 'reviewer') {
        throw validationError(
          `Target user must have reviewer role, but has "${targetUser.role}"`,
        )
      }

      // Validate research areas
      if (args.researchAreas.length < 1) {
        throw validationError('At least 1 research area is required')
      }
      if (args.researchAreas.length > 10) {
        throw validationError('Maximum 10 research areas allowed')
      }

      // Validate publications
      if (args.publications.length < 3) {
        throw validationError('At least 3 publications are required')
      }

      const now = Date.now()

      // Upsert: check if profile exists for this user
      const existing = await ctx.db
        .query('reviewerProfiles')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .unique()

      let profileId: Doc<'reviewerProfiles'>['_id']

      if (existing) {
        // Update existing profile
        await ctx.db.patch('reviewerProfiles', existing._id, {
          researchAreas: args.researchAreas,
          publications: args.publications,
          updatedAt: now,
        })
        profileId = existing._id
      } else {
        // Create new profile
        profileId = await ctx.db.insert('reviewerProfiles', {
          userId: args.userId,
          researchAreas: args.researchAreas,
          publications: args.publications,
          createdAt: now,
          updatedAt: now,
        })
      }

      return profileId
    },
  ),
})

/**
 * Fetches a reviewer profile by user ID.
 * Requires EDITOR_ROLES access.
 */
export const getProfileByUserId = query({
  args: { userId: v.id('users') },
  returns: v.union(fullProfileValidator, v.null()),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { userId: Doc<'users'>['_id'] },
    ) => {
      if (
        !hasEditorRole(ctx.user.role)
      ) {
        throw unauthorizedError('Requires editor role')
      }

      const profile = await ctx.db
        .query('reviewerProfiles')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .unique()

      if (!profile) return null

      return {
        _id: profile._id,
        userId: profile.userId,
        researchAreas: profile.researchAreas,
        publications: profile.publications,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      }
    },
  ),
})

/**
 * Lists all reviewer profiles with resolved user details.
 * Requires EDITOR_ROLES access.
 */
export const listProfiles = query({
  args: {},
  returns: v.array(enrichedProfileValidator),
  handler: withUser(async (ctx: QueryCtx & { user: Doc<'users'> }) => {
    if (
      !hasEditorRole(ctx.user.role)
    ) {
      throw unauthorizedError('Requires editor role')
    }

    const profiles = await ctx.db.query('reviewerProfiles').collect()
    const enriched = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get('users', profile.userId)
        return {
          _id: profile._id,
          userId: profile.userId,
          userName: user?.name ?? 'Unknown',
          userAffiliation: user?.affiliation ?? '',
          researchAreas: profile.researchAreas,
          publicationCount: profile.publications.length,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        }
      }),
    )
    return enriched
  }),
})

/**
 * Lists all users with the `reviewer` role.
 * Used by the profile form's user selector dropdown.
 * Requires EDITOR_ROLES access.
 */
export const listReviewerUsers = query({
  args: {},
  returns: v.array(reviewerUserValidator),
  handler: withUser(async (ctx: QueryCtx & { user: Doc<'users'> }) => {
    if (
      !hasEditorRole(ctx.user.role)
    ) {
      throw unauthorizedError('Requires editor role')
    }

    const allUsers = await ctx.db.query('users').collect()
    return allUsers
      .filter((u) => u.role === 'reviewer')
      .map((u) => ({
        _id: u._id,
        name: u.name,
        affiliation: u.affiliation,
      }))
  }),
})

// ---------------------------------------------------------------------------
// Match result internal helpers
// ---------------------------------------------------------------------------

/** Match result validator for the matches array items. */
const matchItemValidator = v.object({
  profileId: v.id('reviewerProfiles'),
  userId: v.id('users'),
  reviewerName: v.string(),
  affiliation: v.string(),
  researchAreas: v.array(v.string()),
  publicationTitles: v.array(v.string()),
  rationale: v.string(),
  confidence: v.float64(),
})

/** Return validator for getMatchResults query. */
const matchResultValidator = v.object({
  _id: v.id('matchResults'),
  submissionId: v.id('submissions'),
  status: v.union(
    v.literal('pending'),
    v.literal('running'),
    v.literal('complete'),
    v.literal('failed'),
  ),
  matches: v.array(matchItemValidator),
  error: v.optional(v.string()),
  createdAt: v.number(),
})

/**
 * Internal query to read submission data for the matching action.
 */
export const getSubmissionInternal = internalQuery({
  args: { submissionId: v.id('submissions') },
  returns: v.union(
    v.object({
      _id: v.id('submissions'),
      title: v.string(),
      abstract: v.string(),
      keywords: v.array(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get('submissions', args.submissionId)
    if (!submission) return null
    return {
      _id: submission._id,
      title: submission.title,
      abstract: submission.abstract,
      keywords: submission.keywords,
    }
  },
})

/**
 * Internal mutation to upsert match results for a submission.
 * Creates a new document or replaces existing one (upsert semantics).
 */
export const saveMatchResults = internalMutation({
  args: {
    submissionId: v.id('submissions'),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('complete'),
      v.literal('failed'),
    ),
    matches: v.array(matchItemValidator),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('matchResults')
      .withIndex('by_submissionId', (q) =>
        q.eq('submissionId', args.submissionId),
      )
      .first()

    if (existing) {
      await ctx.db.patch('matchResults', existing._id, {
        status: args.status,
        matches: args.matches,
        error: args.error,
        createdAt: Date.now(),
      })
    } else {
      await ctx.db.insert('matchResults', {
        submissionId: args.submissionId,
        status: args.status,
        matches: args.matches,
        error: args.error,
        createdAt: Date.now(),
      })
    }
    return null
  },
})

/**
 * Gets match results for a submission.
 * Requires editor-level access.
 */
export const getMatchResults = query({
  args: { submissionId: v.id('submissions') },
  returns: v.union(matchResultValidator, v.null()),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Doc<'submissions'>['_id'] },
    ) => {
      if (
        !hasEditorRole(ctx.user.role)
      ) {
        throw unauthorizedError('Requires editor role')
      }

      const result = await ctx.db
        .query('matchResults')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .first()

      if (!result) return null

      return {
        _id: result._id,
        submissionId: result.submissionId,
        status: result.status,
        matches: result.matches,
        error: result.error,
        createdAt: result.createdAt,
      }
    },
  ),
})
