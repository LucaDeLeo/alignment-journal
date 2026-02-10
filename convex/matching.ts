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

// ---------------------------------------------------------------------------
// Reusable validators
// ---------------------------------------------------------------------------

/** Reusable validator for a single publication entry. */
const publicationValidator = v.object({
  title: v.string(),
  venue: v.string(),
  year: v.number(),
})

/** Validator for expertise level entries. */
const expertiseLevelValidator = v.object({
  area: v.string(),
  level: v.union(
    v.literal('primary'),
    v.literal('secondary'),
    v.literal('familiar'),
  ),
})

/** Validator for education entries. */
const educationValidator = v.object({
  institution: v.string(),
  degree: v.string(),
  field: v.string(),
  yearCompleted: v.optional(v.number()),
})

/** Tier validator for match items. */
const tierValidator = v.union(
  v.literal('great'),
  v.literal('good'),
  v.literal('exploring'),
)

/** Match interaction state validator. */
const matchInteractionValidator = v.object({
  profileId: v.id('reviewerProfiles'),
  state: v.union(v.literal('saved'), v.literal('dismissed')),
})

/** Return validator for profile documents with resolved user data. */
const enrichedProfileValidator = v.object({
  _id: v.id('reviewerProfiles'),
  userId: v.id('users'),
  userName: v.string(),
  userAffiliation: v.string(),
  researchAreas: v.array(v.string()),
  publicationCount: v.number(),
  isAvailable: v.optional(v.boolean()),
  bio: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

/** Return validator for the full profile (used by getProfileByUserId). */
const fullProfileValidator = v.object({
  _id: v.id('reviewerProfiles'),
  userId: v.id('users'),
  researchAreas: v.array(v.string()),
  publications: v.array(publicationValidator),
  expertiseLevels: v.optional(v.array(expertiseLevelValidator)),
  education: v.optional(v.array(educationValidator)),
  bio: v.optional(v.string()),
  preferredTopics: v.optional(v.array(v.string())),
  isAvailable: v.optional(v.boolean()),
  maxConcurrentReviews: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

/** Return validator for reviewer users (user selector dropdown). */
const reviewerUserValidator = v.object({
  _id: v.id('users'),
  name: v.string(),
  affiliation: v.string(),
})

/** Match result validator for the matches array items. */
const matchItemValidator = v.object({
  profileId: v.id('reviewerProfiles'),
  userId: v.id('users'),
  reviewerName: v.string(),
  affiliation: v.string(),
  researchAreas: v.array(v.string()),
  publicationTitles: v.array(v.string()),
  tier: tierValidator,
  score: v.float64(),
  strengths: v.array(v.string()),
  gapAnalysis: v.string(),
  recommendations: v.array(v.string()),
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
  editorialNotes: v.optional(v.array(v.string())),
  suggestedCombination: v.optional(v.array(v.number())),
  modelVersion: v.optional(v.string()),
  computedAt: v.optional(v.number()),
  matchInteractions: v.optional(v.array(matchInteractionValidator)),
  error: v.optional(v.string()),
  createdAt: v.number(),
})

// ---------------------------------------------------------------------------
// Internal helpers (not exposed to client)
// ---------------------------------------------------------------------------

/** Internal return validator for profiles (used by matching action). */
const internalProfileValidator = v.object({
  _id: v.id('reviewerProfiles'),
  userId: v.id('users'),
  researchAreas: v.array(v.string()),
  publications: v.array(publicationValidator),
  expertiseLevels: v.optional(v.array(expertiseLevelValidator)),
  education: v.optional(v.array(educationValidator)),
  bio: v.optional(v.string()),
  preferredTopics: v.optional(v.array(v.string())),
  isAvailable: v.optional(v.boolean()),
  maxConcurrentReviews: v.optional(v.number()),
})

/**
 * Internal query to fetch all reviewer profiles with enriched fields.
 * Used by the matching action to build candidate descriptions.
 */
export const getAllProfilesInternal = internalQuery({
  args: {},
  returns: v.array(internalProfileValidator),
  handler: async (ctx) => {
    const profiles = await ctx.db.query('reviewerProfiles').collect()
    return profiles.map((p) => ({
      _id: p._id,
      userId: p.userId,
      researchAreas: p.researchAreas,
      publications: p.publications,
      expertiseLevels: p.expertiseLevels,
      education: p.education,
      bio: p.bio,
      preferredTopics: p.preferredTopics,
      isAvailable: p.isAvailable,
      maxConcurrentReviews: p.maxConcurrentReviews,
    }))
  },
})

/**
 * Internal query to count active reviews (assigned/in_progress) per reviewer.
 * Returns a map of userId -> count.
 */
export const getActiveReviewCounts = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      reviewerId: v.id('users'),
      count: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const reviews = await ctx.db.query('reviews').collect()
    const counts = new Map<string, number>()
    for (const review of reviews) {
      if (review.status === 'assigned' || review.status === 'in_progress') {
        const current = counts.get(review.reviewerId) ?? 0
        counts.set(review.reviewerId, current + 1)
      }
    }
    return Array.from(counts.entries()).map(([reviewerId, count]) => ({
      reviewerId: reviewerId as Doc<'users'>['_id'],
      count,
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
    expertiseLevels: v.optional(v.array(expertiseLevelValidator)),
    education: v.optional(v.array(educationValidator)),
    bio: v.optional(v.string()),
    preferredTopics: v.optional(v.array(v.string())),
    isAvailable: v.optional(v.boolean()),
    maxConcurrentReviews: v.optional(v.number()),
  },
  returns: v.id('reviewerProfiles'),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: {
        userId: Doc<'reviewerProfiles'>['userId']
        researchAreas: Array<string>
        publications: Array<{ title: string; venue: string; year: number }>
        expertiseLevels?: Array<{
          area: string
          level: 'primary' | 'secondary' | 'familiar'
        }>
        education?: Array<{
          institution: string
          degree: string
          field: string
          yearCompleted?: number
        }>
        bio?: string
        preferredTopics?: Array<string>
        isAvailable?: boolean
        maxConcurrentReviews?: number
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

      // Validate new optional fields
      if (args.bio !== undefined && args.bio.length > 500) {
        throw validationError('Bio must be 500 characters or fewer')
      }
      if (
        args.preferredTopics !== undefined &&
        args.preferredTopics.length > 10
      ) {
        throw validationError('Maximum 10 preferred topics allowed')
      }
      if (args.maxConcurrentReviews !== undefined) {
        if (args.maxConcurrentReviews < 1 || args.maxConcurrentReviews > 10) {
          throw validationError(
            'Max concurrent reviews must be between 1 and 10',
          )
        }
      }
      if (args.expertiseLevels !== undefined) {
        for (const el of args.expertiseLevels) {
          if (!args.researchAreas.includes(el.area)) {
            throw validationError(
              `Expertise level area "${el.area}" must be in research areas`,
            )
          }
        }
      }

      const now = Date.now()

      // Upsert: check if profile exists for this user
      const existing = await ctx.db
        .query('reviewerProfiles')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .unique()

      const profileData = {
        researchAreas: args.researchAreas,
        publications: args.publications,
        expertiseLevels: args.expertiseLevels,
        education: args.education,
        bio: args.bio,
        preferredTopics: args.preferredTopics,
        isAvailable: args.isAvailable,
        maxConcurrentReviews: args.maxConcurrentReviews,
        updatedAt: now,
      }

      let profileId: Doc<'reviewerProfiles'>['_id']

      if (existing) {
        await ctx.db.patch('reviewerProfiles', existing._id, profileData)
        profileId = existing._id
      } else {
        profileId = await ctx.db.insert('reviewerProfiles', {
          userId: args.userId,
          ...profileData,
          createdAt: now,
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
        expertiseLevels: profile.expertiseLevels,
        education: profile.education,
        bio: profile.bio,
        preferredTopics: profile.preferredTopics,
        isAvailable: profile.isAvailable,
        maxConcurrentReviews: profile.maxConcurrentReviews,
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
          isAvailable: profile.isAvailable,
          bio: profile.bio,
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
 * Preserves matchInteractions across re-runs.
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
    editorialNotes: v.optional(v.array(v.string())),
    suggestedCombination: v.optional(v.array(v.number())),
    modelVersion: v.optional(v.string()),
    computedAt: v.optional(v.number()),
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
        editorialNotes: args.editorialNotes,
        suggestedCombination: args.suggestedCombination,
        modelVersion: args.modelVersion,
        computedAt: args.computedAt,
        error: args.error,
        // Preserve matchInteractions — don't overwrite
        createdAt: Date.now(),
      })
    } else {
      await ctx.db.insert('matchResults', {
        submissionId: args.submissionId,
        status: args.status,
        matches: args.matches,
        editorialNotes: args.editorialNotes,
        suggestedCombination: args.suggestedCombination,
        modelVersion: args.modelVersion,
        computedAt: args.computedAt,
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
        editorialNotes: result.editorialNotes,
        suggestedCombination: result.suggestedCombination,
        modelVersion: result.modelVersion,
        computedAt: result.computedAt,
        matchInteractions: result.matchInteractions,
        error: result.error,
        createdAt: result.createdAt,
      }
    },
  ),
})

// ---------------------------------------------------------------------------
// Match interaction mutations
// ---------------------------------------------------------------------------

/**
 * Persist save/dismiss state per reviewer per submission.
 * Requires editor-level access.
 */
export const updateMatchInteraction = mutation({
  args: {
    submissionId: v.id('submissions'),
    profileId: v.id('reviewerProfiles'),
    state: v.union(v.literal('saved'), v.literal('dismissed')),
  },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: {
        submissionId: Doc<'submissions'>['_id']
        profileId: Doc<'reviewerProfiles'>['_id']
        state: 'saved' | 'dismissed'
      },
    ) => {
      if (!hasEditorRole(ctx.user.role)) {
        throw unauthorizedError('Requires editor role')
      }

      const result = await ctx.db
        .query('matchResults')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .first()

      if (!result) {
        throw notFoundError('MatchResults', args.submissionId)
      }

      const interactions = result.matchInteractions ?? []
      const updated = interactions.filter(
        (i) => i.profileId !== args.profileId,
      )
      updated.push({ profileId: args.profileId, state: args.state })

      await ctx.db.patch('matchResults', result._id, {
        matchInteractions: updated,
      })

      return null
    },
  ),
})

/**
 * Remove a save/dismiss interaction (un-save, un-dismiss).
 * Requires editor-level access.
 */
export const clearMatchInteraction = mutation({
  args: {
    submissionId: v.id('submissions'),
    profileId: v.id('reviewerProfiles'),
  },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: {
        submissionId: Doc<'submissions'>['_id']
        profileId: Doc<'reviewerProfiles'>['_id']
      },
    ) => {
      if (!hasEditorRole(ctx.user.role)) {
        throw unauthorizedError('Requires editor role')
      }

      const result = await ctx.db
        .query('matchResults')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .first()

      if (!result) {
        throw notFoundError('MatchResults', args.submissionId)
      }

      const interactions = result.matchInteractions ?? []
      const updated = interactions.filter(
        (i) => i.profileId !== args.profileId,
      )

      await ctx.db.patch('matchResults', result._id, {
        matchInteractions: updated,
      })

      return null
    },
  ),
})
