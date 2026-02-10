"use node";

import { v } from 'convex/values'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

import { action, internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { withUser } from './helpers/auth'
import { unauthorizedError } from './helpers/errors'
import { hasEditorRole } from './helpers/roles'

import type { Doc } from './_generated/dataModel'
import type { ActionCtx } from './_generated/server'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_SIZE = 15
const MAX_MATCHES = 15
const MAX_ATTEMPTS = 3
const MODEL_ID = 'claude-haiku-4-5-20251001'
const MAX_PAPER_TEXT_LENGTH = 8000
const DEFAULT_MAX_CONCURRENT = 3

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

/** Per-batch evaluation schema (LLM structured output). */
const batchEvaluationSchema = z.object({
  evaluations: z.array(
    z.object({
      candidateIndex: z.number().int().min(1),
      tier: z.enum(['great', 'good', 'exploring']),
      score: z.number().min(0).max(100),
      strengths: z
        .array(z.string())
        .min(2)
        .max(4),
      gapAnalysis: z.string(),
      recommendations: z
        .array(z.string())
        .min(1)
        .max(2),
    }),
  ),
})

/** Editorial notes schema (final aggregation call). */
const editorialNotesSchema = z.object({
  notes: z
    .array(z.string())
    .min(3)
    .max(5),
  suggestedCombination: z.array(z.number().int().min(1)),
})

// ---------------------------------------------------------------------------
// Pure functions (exported for testing)
// ---------------------------------------------------------------------------

/** Format submission context for the LLM prompt. */
export function buildPaperContext(submission: {
  title: string
  abstract: string
  keywords: Array<string>
}): string {
  const text = `Title: ${submission.title}\nAbstract: ${submission.abstract}\nKeywords: ${submission.keywords.join(', ')}`
  if (text.length > MAX_PAPER_TEXT_LENGTH) {
    return text.slice(0, MAX_PAPER_TEXT_LENGTH)
  }
  return text
}

/** Format a single candidate's description for the LLM prompt. */
export function buildCandidateDescription(
  index: number,
  candidate: {
    reviewerName: string
    affiliation: string
    researchAreas: Array<string>
    publicationTitles: Array<string>
    bio?: string
    expertiseLevels?: Array<{ area: string; level: string }>
    education?: Array<{
      institution: string
      degree: string
      field: string
      yearCompleted?: number
    }>
    preferredTopics?: Array<string>
  },
): string {
  const lines: Array<string> = [
    `${index}. ${candidate.reviewerName} (${candidate.affiliation})`,
    `   Research areas: ${candidate.researchAreas.join(', ')}`,
    `   Publications: ${candidate.publicationTitles.join('; ')}`,
  ]

  if (candidate.bio) {
    lines.push(`   Bio: ${candidate.bio}`)
  }

  if (candidate.expertiseLevels && candidate.expertiseLevels.length > 0) {
    const primary = candidate.expertiseLevels
      .filter((e) => e.level === 'primary')
      .map((e) => e.area)
    const secondary = candidate.expertiseLevels
      .filter((e) => e.level === 'secondary')
      .map((e) => e.area)
    if (primary.length > 0) {
      lines.push(`   Primary expertise: ${primary.join(', ')}`)
    }
    if (secondary.length > 0) {
      lines.push(`   Secondary expertise: ${secondary.join(', ')}`)
    }
  }

  if (candidate.education && candidate.education.length > 0) {
    const eduStr = candidate.education
      .map(
        (e) =>
          `${e.degree} in ${e.field} from ${e.institution}${e.yearCompleted ? ` (${e.yearCompleted})` : ''}`,
      )
      .join('; ')
    lines.push(`   Education: ${eduStr}`)
  }

  if (candidate.preferredTopics && candidate.preferredTopics.length > 0) {
    lines.push(
      `   Preferred review topics: ${candidate.preferredTopics.join(', ')}`,
    )
  }

  return lines.join('\n')
}

/** Keyword-overlap fallback scoring per candidate (when LLM fails). */
export function computeFallbackMatch(
  keywords: Array<string>,
  reviewer: {
    researchAreas: Array<string>
    preferredTopics?: Array<string>
  },
): {
  tier: 'great' | 'good' | 'exploring'
  score: number
  strengths: Array<string>
  gapAnalysis: string
  recommendations: Array<string>
} {
  const normalizedKeywords = keywords.map((k) => k.toLowerCase())
  const allAreas = [
    ...reviewer.researchAreas,
    ...(reviewer.preferredTopics ?? []),
  ]
  const normalizedAreas = allAreas.map((a) => a.toLowerCase())

  const overlapping = normalizedAreas.filter((area) =>
    normalizedKeywords.some((kw) => area.includes(kw) || kw.includes(area)),
  )

  const overlapRatio =
    normalizedKeywords.length > 0
      ? overlapping.length / normalizedKeywords.length
      : 0

  let tier: 'great' | 'good' | 'exploring'
  let score: number

  if (overlapRatio >= 0.6) {
    tier = 'great'
    score = Math.round(overlapRatio * 100)
  } else if (overlapRatio >= 0.3) {
    tier = 'good'
    score = Math.round(overlapRatio * 100)
  } else {
    tier = 'exploring'
    score = Math.round(overlapRatio * 100)
  }

  const strengths =
    overlapping.length > 0
      ? [
          `Expertise in ${overlapping.join(', ')} aligns with this paper's research focus.`,
        ]
      : [
          `Research profile in ${reviewer.researchAreas.slice(0, 3).join(', ')} may provide relevant perspective.`,
        ]

  const gapAnalysis =
    overlapping.length > 0
      ? 'Fallback scoring — detailed gap analysis not available.'
      : 'Limited keyword overlap detected. LLM evaluation was not available.'

  const recommendations =
    overlapping.length > 0
      ? ['Fallback scoring applied — consider re-running matching for detailed recommendations.']
      : ['Fallback scoring applied — no keyword overlap detected. Consider re-running matching.']

  return { tier, score, strengths, gapAnalysis, recommendations }
}

// ---------------------------------------------------------------------------
// Error sanitization
// ---------------------------------------------------------------------------

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
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
    return msg.length > 200
      ? 'An error occurred during reviewer matching'
      : msg.replace(/https?:\/\/[^\s]+/g, '[url]')
  }
  return 'An unexpected error occurred during reviewer matching'
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const BATCH_SYSTEM_PROMPT = `You are an expert editorial advisor for the Alignment Journal, a peer-reviewed journal for theoretical AI alignment research.

Evaluate each reviewer candidate for their suitability as a peer reviewer for the given paper.

TIER DEFINITIONS:
- "great": Deep expertise match. Reviewer has published in the paper's subfield, understands the methodology. Score: 70-100.
- "good": Solid overlap. Works in a related area, can competently evaluate most aspects. Score: 40-69.
- "exploring": Tangential expertise. Brings a useful but different perspective. May need pairing with a more expert reviewer. Score: 0-39.

SCORING FACTORS (priority order):
1. Primary expertise overlap with paper's core topic
2. Publication track record in the area
3. Reviewer's preferred review topics
4. Secondary/complementary expertise
5. Educational background relevance

Be specific in strengths (cite publication titles when relevant).
Be constructive in gap analysis (what aspects they cannot evaluate).`

const EDITORIAL_SYSTEM_PROMPT = `You are an expert editorial advisor for the Alignment Journal.

Given a set of ranked reviewer candidates for a paper, provide strategic editorial recommendations.

Your notes should help the editor make a well-informed decision about which reviewers to invite. Consider:
- Coverage of the paper's key aspects across the reviewer set
- Complementary expertise combinations
- Potential gaps that no single reviewer covers

Suggest a combination of 2-3 reviewers from the list that would provide the most comprehensive review.`

// ---------------------------------------------------------------------------
// Matching pipeline (internal action with retry)
// ---------------------------------------------------------------------------

export const runMatchingPipeline = internalAction({
  args: {
    submissionId: v.id('submissions'),
    attempt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // 1. Fetch submission
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

      // 2. Fetch all profiles (now includes enriched fields)
      const allProfiles = await ctx.runQuery(
        internal.matching.getAllProfilesInternal,
      )

      if (allProfiles.length === 0) {
        await ctx.runMutation(internal.matching.saveMatchResults, {
          submissionId: args.submissionId,
          status: 'complete',
          matches: [],
          modelVersion: MODEL_ID,
          computedAt: Date.now(),
        })
        return null
      }

      // 3. Pre-filter: skip unavailable and at-capacity reviewers
      const activeReviewCounts = await ctx.runQuery(
        internal.matching.getActiveReviewCounts,
      )
      const countMap = new Map(
        activeReviewCounts.map((r) => [r.reviewerId, r.count]),
      )

      const availableProfiles = allProfiles.filter((profile) => {
        // Skip explicitly unavailable
        if (profile.isAvailable === false) return false
        // Skip at-capacity
        const maxConcurrent =
          profile.maxConcurrentReviews ?? DEFAULT_MAX_CONCURRENT
        const activeCount = countMap.get(profile.userId) ?? 0
        return activeCount < maxConcurrent
      })

      if (availableProfiles.length === 0) {
        await ctx.runMutation(internal.matching.saveMatchResults, {
          submissionId: args.submissionId,
          status: 'complete',
          matches: [],
          modelVersion: MODEL_ID,
          computedAt: Date.now(),
        })
        return null
      }

      // 4. Resolve user data for each profile
      const candidates: Array<{
        profileId: Doc<'reviewerProfiles'>['_id']
        userId: Doc<'users'>['_id']
        reviewerName: string
        affiliation: string
        researchAreas: Array<string>
        publicationTitles: Array<string>
        bio?: string
        expertiseLevels?: Array<{ area: string; level: string }>
        education?: Array<{
          institution: string
          degree: string
          field: string
          yearCompleted?: number
        }>
        preferredTopics?: Array<string>
      }> = []

      for (const profile of availableProfiles) {
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
          bio: profile.bio,
          expertiseLevels: profile.expertiseLevels,
          education: profile.education,
          preferredTopics: profile.preferredTopics,
        })
      }

      if (candidates.length === 0) {
        await ctx.runMutation(internal.matching.saveMatchResults, {
          submissionId: args.submissionId,
          status: 'complete',
          matches: [],
          modelVersion: MODEL_ID,
          computedAt: Date.now(),
        })
        return null
      }

      // 5. Build paper context
      const paperContext = buildPaperContext(submission)

      // 6. Split candidates into batches and evaluate
      const allEvaluations: Array<{
        candidateIdx: number
        tier: 'great' | 'good' | 'exploring'
        score: number
        strengths: Array<string>
        gapAnalysis: string
        recommendations: Array<string>
      }> = []

      for (let batchStart = 0; batchStart < candidates.length; batchStart += BATCH_SIZE) {
        const batch = candidates.slice(batchStart, batchStart + BATCH_SIZE)
        const candidateDescriptions = batch
          .map((c, i) =>
            buildCandidateDescription(i + 1, c),
          )
          .join('\n\n')

        try {
          const { object } = await generateObject({
            model: anthropic(MODEL_ID),
            schema: batchEvaluationSchema,
            system: BATCH_SYSTEM_PROMPT,
            prompt: `Paper:\n${paperContext}\n\nReviewer Candidates:\n${candidateDescriptions}\n\nEvaluate all ${batch.length} candidates. Return one evaluation per candidate using their candidateIndex (1-based within this batch).`,
          })

          for (const evaluation of object.evaluations) {
            const batchIdx = evaluation.candidateIndex - 1
            if (batchIdx >= 0 && batchIdx < batch.length) {
              allEvaluations.push({
                candidateIdx: batchStart + batchIdx,
                tier: evaluation.tier,
                score: evaluation.score,
                strengths: evaluation.strengths,
                gapAnalysis: evaluation.gapAnalysis,
                recommendations: evaluation.recommendations,
              })
            }
          }
        } catch (batchError) {
          console.error(
            `[matching] Batch ${batchStart}-${batchStart + batch.length} LLM failed, using fallback: ${
              batchError instanceof Error ? batchError.message : 'Unknown error'
            }`,
          )
          // Fallback: keyword-overlap scoring for this batch
          for (let i = 0; i < batch.length; i++) {
            const fallback = computeFallbackMatch(
              submission.keywords,
              batch[i],
            )
            allEvaluations.push({
              candidateIdx: batchStart + i,
              tier: fallback.tier,
              score: fallback.score,
              strengths: fallback.strengths,
              gapAnalysis: fallback.gapAnalysis,
              recommendations: fallback.recommendations,
            })
          }
        }
      }

      // 7. Sort by tier (great > good > exploring) then score descending
      const tierOrder = { great: 0, good: 1, exploring: 2 }
      allEvaluations.sort((a, b) => {
        const tierDiff = tierOrder[a.tier] - tierOrder[b.tier]
        if (tierDiff !== 0) return tierDiff
        return b.score - a.score
      })

      // 8. Take top MAX_MATCHES
      const topEvaluations = allEvaluations.slice(0, MAX_MATCHES)

      // 9. Editorial notes call (optional — failure doesn't block results)
      let editorialNotes: Array<string> | undefined
      let suggestedCombination: Array<number> | undefined

      if (topEvaluations.length > 0) {
        try {
          const matchSummary = topEvaluations
            .map((e, i) => {
              const c = candidates[e.candidateIdx]
              return `${i + 1}. ${c.reviewerName} — ${e.tier} match (score ${e.score}). Strengths: ${e.strengths.join('; ')}`
            })
            .join('\n')

          const { object: notesResult } = await generateObject({
            model: anthropic(MODEL_ID),
            schema: editorialNotesSchema,
            system: EDITORIAL_SYSTEM_PROMPT,
            prompt: `Paper:\n${paperContext}\n\nTop Reviewer Matches:\n${matchSummary}\n\nProvide editorial recommendations and suggest the best combination of 2-3 reviewers (using their 1-based index from the list above).`,
          })

          editorialNotes = notesResult.notes
          suggestedCombination = notesResult.suggestedCombination
        } catch (notesError) {
          console.error(
            `[matching] Editorial notes call failed (non-blocking): ${
              notesError instanceof Error ? notesError.message : 'Unknown error'
            }`,
          )
        }
      }

      // 10. Build final match results
      const finalMatches = topEvaluations.map((e) => {
        const candidate = candidates[e.candidateIdx]
        return {
          profileId: candidate.profileId,
          userId: candidate.userId,
          reviewerName: candidate.reviewerName,
          affiliation: candidate.affiliation,
          researchAreas: candidate.researchAreas,
          publicationTitles: candidate.publicationTitles,
          tier: e.tier,
          score: Math.max(0, Math.min(100, e.score)),
          strengths: e.strengths,
          gapAnalysis: e.gapAnalysis,
          recommendations: e.recommendations,
        }
      })

      // 11. Save results
      await ctx.runMutation(internal.matching.saveMatchResults, {
        submissionId: args.submissionId,
        status: 'complete',
        matches: finalMatches,
        editorialNotes,
        suggestedCombination,
        modelVersion: MODEL_ID,
        computedAt: Date.now(),
      })
    } catch (error) {
      console.error(
        `[matching] Pipeline attempt ${args.attempt} failed for submission ${args.submissionId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )

      // Retry with exponential backoff
      if (args.attempt < MAX_ATTEMPTS) {
        const delayMs = Math.pow(2, args.attempt) * 1000
        await ctx.scheduler.runAfter(
          delayMs,
          internal.matchingActions.runMatchingPipeline,
          {
            submissionId: args.submissionId,
            attempt: args.attempt + 1,
          },
        )
      } else {
        await ctx.runMutation(internal.matching.saveMatchResults, {
          submissionId: args.submissionId,
          status: 'failed',
          matches: [],
          error: sanitizeErrorMessage(error),
          modelVersion: MODEL_ID,
          computedAt: Date.now(),
        })
      }
    }

    return null
  },
})

// ---------------------------------------------------------------------------
// Public action (entry point)
// ---------------------------------------------------------------------------

/**
 * Finds top reviewer matches for a submission using tiered LLM evaluation.
 * Requires editor-level access. Sets status to 'running' and schedules
 * the internal pipeline action.
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
      if (!hasEditorRole(ctx.user.role)) {
        throw unauthorizedError('Requires editor role')
      }

      // Check for API key before changing status
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        console.error(
          '[matching] ANTHROPIC_API_KEY not configured for reviewer matching',
        )
        await ctx.runMutation(internal.matching.saveMatchResults, {
          submissionId: args.submissionId,
          status: 'failed',
          matches: [],
          error:
            'Anthropic API key is not configured. Please contact an administrator.',
        })
        return null
      }

      // Set status to running
      await ctx.runMutation(internal.matching.saveMatchResults, {
        submissionId: args.submissionId,
        status: 'running',
        matches: [],
      })

      // Schedule the internal pipeline action
      await ctx.scheduler.runAfter(
        0,
        internal.matchingActions.runMatchingPipeline,
        {
          submissionId: args.submissionId,
          attempt: 1,
        },
      )

      return null
    },
  ),
})
