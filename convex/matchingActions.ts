"use node";

import { v } from 'convex/values'
import OpenAI from 'openai'

import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

import { action, internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { withUser } from './helpers/auth'
import { unauthorizedError } from './helpers/errors'
import { EDITOR_ROLES } from './helpers/roles'

import type { Doc } from './_generated/dataModel'
import type { ActionCtx } from './_generated/server'

/** Maximum characters for paper text before embedding. */
const MAX_PAPER_TEXT_LENGTH = 8000

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
// Reviewer matching action
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
