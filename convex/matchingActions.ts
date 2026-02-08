"use node";

import { v } from 'convex/values'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

import { action, internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { withUser } from './helpers/auth'
import { unauthorizedError } from './helpers/errors'
import { EDITOR_ROLES } from './helpers/roles'

import type { Doc } from './_generated/dataModel'
import type { ActionCtx } from './_generated/server'


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
 * Embedding generation stub (disabled — will be replaced with a different solution).
 * Scheduled by `createOrUpdateProfile` after profile create/update.
 * On failure, logs the error and leaves the profile without an embedding.
 */
export const generateEmbedding = internalAction({
  args: { profileId: v.id('reviewerProfiles') },
  returns: v.null(),
  handler: async (_ctx, args) => {
    // Embedding generation disabled — will be replaced with a different solution.
    console.log(
      `[matching] Embedding generation skipped for profile ${args.profileId} (disabled)`,
    )
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
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          console.error(
            '[matching] ANTHROPIC_API_KEY not configured for reviewer matching',
          )
          await ctx.runMutation(internal.matching.saveMatchResults, {
            submissionId: args.submissionId,
            status: 'failed',
            matches: [],
            error: 'Anthropic API key is not configured. Please contact an administrator.',
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

        // Fetch all reviewer profiles for LLM-based matching
        const allProfiles = await ctx.runQuery(
          internal.matching.getAllProfilesInternal,
        )

        if (allProfiles.length === 0) {
          await ctx.runMutation(internal.matching.saveMatchResults, {
            submissionId: args.submissionId,
            status: 'complete',
            matches: [],
          })
          return null
        }

        // Resolve user data for each profile
        const candidates: Array<{
          profileId: Doc<'reviewerProfiles'>['_id']
          userId: Doc<'users'>['_id']
          reviewerName: string
          affiliation: string
          researchAreas: Array<string>
          publicationTitles: Array<string>
        }> = []

        for (const profile of allProfiles) {
          const user = await ctx.runQuery(internal.users.getByIdInternal, {
            userId: profile.userId,
          })
          if (!user) continue

          candidates.push({
            profileId: profile._id,
            userId: profile.userId,
            reviewerName: user.name,
            affiliation: user.affiliation,
            researchAreas: profile.researchAreas,
            publicationTitles: profile.publications.map((p) => p.title),
          })
        }

        if (candidates.length === 0) {
          await ctx.runMutation(internal.matching.saveMatchResults, {
            submissionId: args.submissionId,
            status: 'complete',
            matches: [],
          })
          return null
        }

        // LLM-based matching: ask Haiku to rank and explain top 5
        const candidateList = candidates
          .map(
            (m, i) =>
              `${i + 1}. ${m.reviewerName} - Research areas: ${m.researchAreas.join(', ')}. Publications: ${m.publicationTitles.join('; ')}`,
          )
          .join('\n')

        let rationaleResults: Array<{
          index: number
          rationale: string
          confidence: number
        }>

        try {
          const { object } = await generateObject({
            model: anthropic('claude-haiku-4-5-20251001'),
            schema: rationaleSchema,
            prompt: `You are an academic journal editor assistant. Given a paper and a list of reviewer candidates, select the top 5 best matches and for each explain in 1-2 sentences why they are a good match. Focus on specific overlap between the reviewer's publications/research areas and the paper's topic. Assign a confidence score (0-1) where 1 means near-perfect expertise match. Return exactly the top 5 (or fewer if less than 5 candidates).

Paper: ${submission.title} - ${submission.abstract}. Keywords: ${submission.keywords.join(', ')}

Candidates:
${candidateList}`,
          })

          rationaleResults = object.matches
        } catch (llmError) {
          console.error(
            `[matching] LLM matching failed, using fallback: ${
              llmError instanceof Error ? llmError.message : 'Unknown error'
            }`,
          )
          // Fallback: keyword-overlap rationale for first 5
          rationaleResults = candidates.slice(0, 5).map((m, i) => ({
            index: i + 1,
            rationale: generateFallbackRationale(
              submission.keywords,
              m.researchAreas,
            ),
            confidence: 0.5,
          }))
        }

        // Build final match results from LLM selections
        const finalMatches = rationaleResults
          .filter((r) => r.index >= 1 && r.index <= candidates.length)
          .map((r) => {
            const candidate = candidates[r.index - 1]
            return {
              profileId: candidate.profileId,
              userId: candidate.userId,
              reviewerName: candidate.reviewerName,
              affiliation: candidate.affiliation,
              researchAreas: candidate.researchAreas,
              publicationTitles: candidate.publicationTitles,
              rationale: r.rationale,
              confidence: Math.max(0, Math.min(1, r.confidence)),
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
