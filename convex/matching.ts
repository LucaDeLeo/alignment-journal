"use node";

import { v } from 'convex/values'
import OpenAI from 'openai'

import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import { internal } from './_generated/api'
import { withUser } from './helpers/auth'
import {
  notFoundError,
  unauthorizedError,
  validationError,
} from './helpers/errors'

import type { Doc } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

// Roles allowed to read reviewer profiles (editor-level access)
const EDITOR_ROLES = ['editor_in_chief', 'action_editor', 'admin'] as const

// Roles allowed to write/modify reviewer profiles
const WRITE_ROLES = ['admin', 'editor_in_chief'] as const

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
  hasEmbedding: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})

/** Return validator for the full profile (used by getProfileByUserId). */
const fullProfileValidator = v.object({
  _id: v.id('reviewerProfiles'),
  userId: v.id('users'),
  researchAreas: v.array(v.string()),
  publications: v.array(publicationValidator),
  hasEmbedding: v.boolean(),
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
export const getProfileInternal = internalQuery({
  args: { profileId: v.id('reviewerProfiles') },
  returns: v.union(
    v.object({
      _id: v.id('reviewerProfiles'),
      userId: v.id('users'),
      researchAreas: v.array(v.string()),
      publications: v.array(publicationValidator),
      embedding: v.optional(v.array(v.float64())),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const profile = await ctx.db.get('reviewerProfiles', args.profileId)
    if (!profile) return null
    return {
      _id: profile._id,
      userId: profile.userId,
      researchAreas: profile.researchAreas,
      publications: profile.publications,
      embedding: profile.embedding,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    }
  },
})

/**
 * Internal mutation to write the embedding vector to a reviewer profile.
 * Includes a stale-check: skips the write if the profile has been updated
 * since the embedding job started (prevents concurrent job overwrites).
 */
export const saveEmbedding = internalMutation({
  args: {
    profileId: v.id('reviewerProfiles'),
    embedding: v.array(v.float64()),
    updatedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db.get('reviewerProfiles', args.profileId)
    if (!profile) return null

    // Stale-check: if the profile was updated after this embedding job started,
    // skip the write to avoid overwriting a newer embedding.
    if (profile.updatedAt > args.updatedAt) {
      return null
    }

    await ctx.db.patch('reviewerProfiles', args.profileId, {
      embedding: args.embedding,
      updatedAt: Date.now(),
    })
    return null
  },
})

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Creates or updates a reviewer profile (upsert semantics).
 * Requires admin or editor_in_chief role.
 * Schedules embedding generation on success.
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

      // Schedule embedding generation
      await ctx.scheduler.runAfter(
        0,
        internal.matching.generateEmbedding,
        { profileId },
      )

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
        !EDITOR_ROLES.includes(
          ctx.user.role as (typeof EDITOR_ROLES)[number],
        )
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
        hasEmbedding: profile.embedding !== undefined && profile.embedding.length > 0,
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
      !EDITOR_ROLES.includes(
        ctx.user.role as (typeof EDITOR_ROLES)[number],
      )
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
          hasEmbedding:
            profile.embedding !== undefined && profile.embedding.length > 0,
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
      !EDITOR_ROLES.includes(
        ctx.user.role as (typeof EDITOR_ROLES)[number],
      )
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
// Embedding generation (internal action)
// ---------------------------------------------------------------------------

/**
 * Generates a vector embedding for a reviewer profile via OpenAI.
 * Scheduled by `createOrUpdateProfile` after profile create/update.
 * On failure, logs the error and leaves the profile without an embedding.
 */
export const generateEmbedding = internalAction({
  args: { profileId: v.id('reviewerProfiles') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.runQuery(
      internal.matching.getProfileInternal,
      { profileId: args.profileId },
    )

    if (!profile) {
      console.warn(
        `[matching] Profile ${args.profileId} not found, skipping embedding generation`,
      )
      return null
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn(
        '[matching] OPENAI_API_KEY not configured, skipping embedding generation',
      )
      return null
    }

    // Build text representation of reviewer expertise
    const areas = profile.researchAreas.join(', ')
    const titles = profile.publications.map((p) => p.title).join('; ')
    const text = `Research areas: ${areas}. Publications: ${titles}`

    try {
      const openai = new OpenAI({ apiKey })

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
        dimensions: 1536,
      })

      const embedding = response.data[0].embedding

      await ctx.runMutation(internal.matching.saveEmbedding, {
        profileId: args.profileId,
        embedding,
        updatedAt: profile.updatedAt,
      })
    } catch (error) {
      // Graceful degradation: log the error, don't throw.
      // The profile remains usable without an embedding.
      const message =
        error instanceof Error ? error.message : 'Unknown error'
      console.error(
        `[matching] Failed to generate embedding for profile ${args.profileId}: ${message}`,
      )
    }

    return null
  },
})
