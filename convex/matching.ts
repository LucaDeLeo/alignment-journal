"use node";

import { v } from 'convex/values'
import OpenAI from 'openai'

import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

import {
  action,
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
import type { ActionCtx, MutationCtx, QueryCtx } from './_generated/server'

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
// Match result internal helpers
// ---------------------------------------------------------------------------

/** Maximum characters for paper text before embedding. */
const MAX_PAPER_TEXT_LENGTH = 8000

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
 * Builds paper text from submission data for embedding.
 */
function buildPaperText(submission: {
  title: string
  abstract: string
  keywords: Array<string>
}): string {
  const text = `Title: ${submission.title}. Abstract: ${submission.abstract}. Keywords: ${submission.keywords.join(', ')}`
  if (text.length > MAX_PAPER_TEXT_LENGTH) {
    return text.slice(0, MAX_PAPER_TEXT_LENGTH)
  }
  return text
}

/**
 * Sanitizes an error message for client display.
 * Strips raw API error details, keeps only a safe summary.
 */
function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Strip out API keys, URLs, and raw response bodies
    const msg = error.message
    if (msg.includes('API key') || msg.includes('api_key')) {
      return 'External service authentication error'
    }
    if (msg.includes('rate limit') || msg.includes('429')) {
      return 'External service rate limit exceeded. Please try again later.'
    }
    if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
      return 'External service timeout. Please try again.'
    }
    // Generic sanitization: cap length and remove potential sensitive data
    return msg.length > 200
      ? 'An error occurred during reviewer matching'
      : msg.replace(/https?:\/\/[^\s]+/g, '[url]')
  }
  return 'An unexpected error occurred during reviewer matching'
}

/**
 * Generates fallback rationale from keyword overlap when LLM call fails.
 */
function generateFallbackRationale(
  submissionKeywords: Array<string>,
  reviewerAreas: Array<string>,
): string {
  const normalizedKeywords = submissionKeywords.map((k) => k.toLowerCase())
  const normalizedAreas = reviewerAreas.map((a) => a.toLowerCase())
  const overlapping = normalizedAreas.filter(
    (area) =>
      normalizedKeywords.some(
        (kw) => area.includes(kw) || kw.includes(area),
      ),
  )
  if (overlapping.length > 0) {
    return `Expertise in ${overlapping.join(', ')} aligns with this paper's research focus.`
  }
  return `Research profile in ${reviewerAreas.slice(0, 3).join(', ')} may provide relevant perspective.`
}

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

// ---------------------------------------------------------------------------
// Reviewer matching action + query
// ---------------------------------------------------------------------------

/** Zod schema for structured LLM rationale output. */
const rationaleSchema = z.object({
  matches: z.array(
    z.object({
      index: z.number(),
      rationale: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
})

/**
 * Finds top reviewer matches for a submission using vector search + LLM rationale.
 * Requires editor-level access. Results are persisted to matchResults table.
 */
export const findMatches = action({
  args: { submissionId: v.id('submissions') },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: ActionCtx & { user: Doc<'users'> },
      args: { submissionId: Doc<'submissions'>['_id'] },
    ) => {
      // Authorization: editor-level access
      if (
        !EDITOR_ROLES.includes(
          ctx.user.role as (typeof EDITOR_ROLES)[number],
        )
      ) {
        throw unauthorizedError('Requires editor role')
      }

      // Set status to running
      await ctx.runMutation(internal.matching.saveMatchResults, {
        submissionId: args.submissionId,
        status: 'running',
        matches: [],
      })

      try {
        // Check for API key
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
          console.error(
            '[matching] OPENAI_API_KEY not configured for reviewer matching',
          )
          await ctx.runMutation(internal.matching.saveMatchResults, {
            submissionId: args.submissionId,
            status: 'failed',
            matches: [],
            error: 'OpenAI API key is not configured. Please contact an administrator.',
          })
          return null
        }

        // Read submission
        const submission = await ctx.runQuery(
          internal.matching.getSubmissionInternal,
          { submissionId: args.submissionId },
        )

        if (!submission) {
          await ctx.runMutation(internal.matching.saveMatchResults, {
            submissionId: args.submissionId,
            status: 'failed',
            matches: [],
            error: 'Submission not found',
          })
          return null
        }

        // Generate paper embedding
        const paperText = buildPaperText(submission)
        const openai = new OpenAI({ apiKey })

        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: paperText,
          dimensions: 1536,
        })

        const paperEmbedding = embeddingResponse.data[0].embedding

        // Vector search for similar reviewer profiles
        const searchResults = await ctx.vectorSearch(
          'reviewerProfiles',
          'by_embedding',
          { vector: paperEmbedding, limit: 10 },
        )

        if (searchResults.length === 0) {
          await ctx.runMutation(internal.matching.saveMatchResults, {
            submissionId: args.submissionId,
            status: 'complete',
            matches: [],
          })
          return null
        }

        // Resolve profiles and user data, filter to valid ones
        const enrichedMatches: Array<{
          profileId: Doc<'reviewerProfiles'>['_id']
          userId: Doc<'users'>['_id']
          reviewerName: string
          affiliation: string
          researchAreas: Array<string>
          publicationTitles: Array<string>
          score: number
        }> = []

        for (const result of searchResults) {
          if (enrichedMatches.length >= 5) break

          const profile = await ctx.runQuery(
            internal.matching.getProfileInternal,
            { profileId: result._id },
          )
          if (!profile || !profile.embedding) continue

          const user = await ctx.runQuery(internal.users.getByIdInternal, {
            userId: profile.userId,
          })
          if (!user) continue

          enrichedMatches.push({
            profileId: profile._id,
            userId: profile.userId,
            reviewerName: user.name,
            affiliation: user.affiliation,
            researchAreas: profile.researchAreas,
            publicationTitles: profile.publications.map((p) => p.title),
            score: result._score,
          })
        }

        if (enrichedMatches.length === 0) {
          await ctx.runMutation(internal.matching.saveMatchResults, {
            submissionId: args.submissionId,
            status: 'complete',
            matches: [],
          })
          return null
        }

        // Generate rationale via LLM (with fallback)
        let rationaleResults: Array<{
          index: number
          rationale: string
          confidence: number
        }>

        try {
          const aiOpenai = createOpenAI({ apiKey })

          const candidateList = enrichedMatches
            .map(
              (m, i) =>
                `${i + 1}. ${m.reviewerName} - Research areas: ${m.researchAreas.join(', ')}. Publications: ${m.publicationTitles.join('; ')}`,
            )
            .join('\n')

          const { object } = await generateObject({
            model: aiOpenai('gpt-4o-mini'),
            schema: rationaleSchema,
            prompt: `You are an academic journal editor assistant. For each reviewer candidate, explain in 1-2 sentences why they are a good match for the given paper. Focus on specific overlap between the reviewer's publications/research areas and the paper's topic. Also assign a confidence score (0-1) where 1 means near-perfect expertise match.

Paper: ${submission.title} - ${submission.abstract}

Candidates:
${candidateList}`,
          })

          rationaleResults = object.matches
        } catch (llmError) {
          console.error(
            `[matching] LLM rationale generation failed, using fallback: ${
              llmError instanceof Error ? llmError.message : 'Unknown error'
            }`,
          )
          // Fallback: keyword-overlap rationale
          rationaleResults = enrichedMatches.map((m, i) => ({
            index: i + 1,
            rationale: generateFallbackRationale(
              submission.keywords,
              m.researchAreas,
            ),
            confidence: Math.min(m.score, 1),
          }))
        }

        // Build final match results
        const finalMatches = enrichedMatches.map((m, i) => {
          const rationale = rationaleResults.find((r) => r.index === i + 1)
          return {
            profileId: m.profileId,
            userId: m.userId,
            reviewerName: m.reviewerName,
            affiliation: m.affiliation,
            researchAreas: m.researchAreas,
            publicationTitles: m.publicationTitles,
            rationale:
              rationale?.rationale ??
              generateFallbackRationale(
                submission.keywords,
                m.researchAreas,
              ),
            confidence: Math.max(
              0,
              Math.min(1, rationale?.confidence ?? m.score),
            ),
          }
        })

        // Save results
        await ctx.runMutation(internal.matching.saveMatchResults, {
          submissionId: args.submissionId,
          status: 'complete',
          matches: finalMatches,
        })
      } catch (error) {
        console.error(
          `[matching] Match pipeline failed for submission ${args.submissionId}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        )
        await ctx.runMutation(internal.matching.saveMatchResults, {
          submissionId: args.submissionId,
          status: 'failed',
          matches: [],
          error: sanitizeErrorMessage(error),
        })
      }

      return null
    },
  ),
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
        !EDITOR_ROLES.includes(
          ctx.user.role as (typeof EDITOR_ROLES)[number],
        )
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
