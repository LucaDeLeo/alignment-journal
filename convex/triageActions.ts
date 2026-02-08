"use node";

import { v } from 'convex/values'
import { generateObject } from 'ai'
import type { CoreMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

import { internalAction } from './_generated/server'
import { internal } from './_generated/api'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 3

/** Maximum length for LLM-generated string fields (AC7 sanitization). */
const MAX_LLM_FIELD_LENGTH = 5_000

// ---------------------------------------------------------------------------
// Zod schema for generateObject structured output (all 4 dimensions)
// ---------------------------------------------------------------------------

const dimensionSchema = z.object({
  finding: z
    .string()
    .max(MAX_LLM_FIELD_LENGTH)
    .describe('A concise summary of the analysis finding'),
  severity: z
    .enum(['low', 'medium', 'high'])
    .describe(
      'low = no issues, medium = minor issues, high = significant concerns',
    ),
  recommendation: z
    .string()
    .max(MAX_LLM_FIELD_LENGTH)
    .describe('Editor-facing recommendation based on the finding'),
})

const triageResultSchema = z.object({
  scope: dimensionSchema.describe('Scope fit analysis'),
  formatting: dimensionSchema.describe('Formatting and completeness analysis'),
  citations: dimensionSchema.describe('Citation quality analysis'),
  claims: dimensionSchema.describe('Technical claims and evidence analysis'),
})

// ---------------------------------------------------------------------------
// Combined system prompt
// ---------------------------------------------------------------------------

const TRIAGE_SYSTEM_PROMPT = `You are a triage assistant for the Alignment Journal, a peer-reviewed journal focused on theoretical AI alignment research. You will analyze the attached PDF paper across four dimensions and return structured results for each.

## 1. Scope Fit

The journal's focus areas are:
- Theoretical AI alignment: agency, understanding, asymptotic behavior of advanced synthetic agents
- Conceptual and mathematically abstract ideas transcending contemporary architectures
- Empirical work is welcome but no emphasis on SOTA benchmarks
- Out of scope: AI governance, deployment, applied mechinterp, evaluations, societal impact

Assess whether the paper falls within scope. Consider the paper's core thesis, methodology, and contribution area.

## 2. Formatting & Completeness

Check for:
- Abstract present and well-structured
- Clear section structure (introduction, related work, methodology, results/analysis, conclusion)
- References section present and formatted
- Page numbers present
- Author affiliations included
- Figures/tables referenced in text

Report any formatting or completeness issues found.

## 3. Citation Quality

Check for:
- Extract key citations referenced in the paper
- Flag any citations that appear incomplete (missing year, venue, or author)
- Identify citations that may be unresolvable (non-standard format, missing from common databases)
- Note the total approximate citation count

Report on citation quality and any issues found.

## 4. Technical Claims & Evidence

Check for:
- Identify the key technical claims made by the paper (2-5 main claims)
- For each claim, assess whether the paper provides supporting evidence, proofs, or arguments
- Flag claims that appear unsupported or under-argued
- Note whether the methodology is clearly described and reproducible

Report on the quality of the paper's technical argumentation.`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Truncate a string to the max LLM field length for DB storage. */
function truncateLlmField(value: string): string {
  if (value.length <= MAX_LLM_FIELD_LENGTH) return value
  return value.slice(0, MAX_LLM_FIELD_LENGTH)
}

/** Sanitize an LLM result before persisting — truncates all string fields. */
function sanitizeResult(result: {
  finding: string
  severity: 'low' | 'medium' | 'high'
  recommendation: string
}) {
  return {
    finding: truncateLlmField(result.finding),
    severity: result.severity,
    recommendation: truncateLlmField(result.recommendation),
  }
}

// ---------------------------------------------------------------------------
// Single triage action: sends PDF to Haiku, gets all 4 analyses at once
// ---------------------------------------------------------------------------

export const runTriage = internalAction({
  args: {
    submissionId: v.id('submissions'),
    triageRunId: v.string(),
    pdfStorageId: v.id('_storage'),
    attemptCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = args.attemptCount ?? 1

    try {
      // 1. Mark all 4 reports as running
      await ctx.runMutation(internal.triage.markAllRunning, {
        submissionId: args.submissionId,
        triageRunId: args.triageRunId,
        attemptCount: attempt,
      })

      // 2. Fetch PDF bytes from Convex storage
      const pdfUrl = await ctx.storage.getUrl(args.pdfStorageId)
      if (!pdfUrl) throw new Error('PDF not found in storage')
      const pdfResponse = await fetch(pdfUrl)
      const pdfBuffer = await pdfResponse.arrayBuffer()

      // 3. Send PDF directly to Haiku — one call for all 4 dimensions
      const { object: results } = await generateObject({
        model: anthropic('claude-haiku-4-5-20251001'),
        schema: triageResultSchema,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze the attached PDF paper across all four triage dimensions: scope fit, formatting & completeness, citation quality, and technical claims & evidence.',
              },
              {
                type: 'file',
                data: new Uint8Array(pdfBuffer),
                mimeType: 'application/pdf',
              },
            ],
          },
        ] satisfies Array<CoreMessage>,
        system: TRIAGE_SYSTEM_PROMPT,
      })

      // 4. Write all 4 sanitized results + transition to TRIAGE_COMPLETE
      await ctx.runMutation(internal.triage.writeAllResults, {
        submissionId: args.submissionId,
        triageRunId: args.triageRunId,
        results: {
          scope: sanitizeResult(results.scope),
          formatting: sanitizeResult(results.formatting),
          citations: sanitizeResult(results.citations),
          claims: sanitizeResult(results.claims),
        },
      })
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        // Retry with exponential backoff
        const delayMs = 1000 * Math.pow(2, attempt - 1)
        await ctx.scheduler.runAfter(delayMs, internal.triageActions.runTriage, {
          ...args,
          attemptCount: attempt + 1,
        })
      } else {
        // Terminal failure — mark all reports as failed
        const message =
          error instanceof Error ? error.message : 'Unknown triage error'
        await ctx.runMutation(internal.triage.markAllFailed, {
          submissionId: args.submissionId,
          triageRunId: args.triageRunId,
          lastError: message,
          attemptCount: attempt,
        })
      }
    }
    return null
  },
})
