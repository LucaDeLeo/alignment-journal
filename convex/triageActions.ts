"use node";

import { v } from 'convex/values'
import { extractText } from 'unpdf'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

import { internalAction } from './_generated/server'
import { internal } from './_generated/api'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 3
const MAX_TEXT_LENGTH = 100_000

// ---------------------------------------------------------------------------
// Zod schema for a single triage dimension
// ---------------------------------------------------------------------------

const triageResultSchema = z.object({
  finding: z
    .string()
    .describe('A concise summary of the analysis finding'),
  severity: z
    .enum(['low', 'medium', 'high'])
    .describe(
      'low = no issues, medium = minor issues, high = significant concerns',
    ),
  recommendation: z
    .string()
    .describe('Editor-facing recommendation based on the finding'),
})

// ---------------------------------------------------------------------------
// Combined schema: all 4 dimensions in a single LLM call
// ---------------------------------------------------------------------------

const allTriageResultsSchema = z.object({
  scope: triageResultSchema,
  formatting: triageResultSchema,
  citations: triageResultSchema,
  claims: triageResultSchema,
})

// ---------------------------------------------------------------------------
// System prompt: single combined prompt for all 4 dimensions
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a triage assistant for the Alignment Journal, a peer-reviewed journal focused on theoretical AI alignment research. Analyze the following paper across four dimensions and return structured results for each.

## 1. Scope Fit
The journal's focus areas are:
- Theoretical AI alignment: agency, understanding, asymptotic behavior of advanced synthetic agents
- Conceptual and mathematically abstract ideas transcending contemporary architectures
- Empirical work is welcome but no emphasis on SOTA benchmarks
- Out of scope: AI governance, deployment, applied mechinterp, evaluations, societal impact
Assess whether the paper falls within scope based on its core thesis, methodology, and contribution area.

## 2. Formatting & Completeness
Check for: abstract present and well-structured, clear section structure (introduction, related work, methodology, results/analysis, conclusion), references section present and formatted, page numbers, author affiliations, figures/tables referenced in text.

## 3. Citation Quality
Check for: key citations referenced, incomplete citations (missing year, venue, or author), unresolvable citations (non-standard format), approximate total citation count.

## 4. Claims & Evidence
Identify the key technical claims (2-5 main claims), assess whether each has supporting evidence/proofs/arguments, flag unsupported or under-argued claims, note whether methodology is clearly described and reproducible.`

// ---------------------------------------------------------------------------
// Single triage action: extracts text once, analyzes all 4 dimensions in one LLM call
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

      // 2. Fetch PDF and extract text
      const pdfUrl = await ctx.storage.getUrl(args.pdfStorageId)
      if (!pdfUrl) throw new Error('PDF not found in storage')
      const pdfResponse = await fetch(pdfUrl)
      const pdfBuffer = await pdfResponse.arrayBuffer()
      const { text: extractedText, totalPages } = await extractText(
        new Uint8Array(pdfBuffer),
        { mergePages: true },
      )

      // 3. Handle empty text
      if (!extractedText || extractedText.trim().length === 0) {
        const emptyResult = {
          finding: 'No extractable text found in the PDF',
          severity: 'high' as const,
          recommendation:
            'Request the author to resubmit with a text-based PDF',
        }
        await ctx.runMutation(internal.triage.writeAllResults, {
          submissionId: args.submissionId,
          triageRunId: args.triageRunId,
          results: {
            scope: emptyResult,
            formatting: emptyResult,
            citations: emptyResult,
            claims: emptyResult,
          },
          pageCount: 0,
        })
        return null
      }

      // 4. Truncate text, then run a single LLM call for all 4 dimensions
      const truncatedText = extractedText.slice(0, MAX_TEXT_LENGTH)

      const { object: results } = await generateObject({
        model: anthropic('claude-sonnet-4-5-20250929'),
        schema: allTriageResultsSchema,
        system: SYSTEM_PROMPT,
        maxTokens: 8192,
        prompt: `Analyze the following paper:\n\n${truncatedText}`,
      })

      // 5. Write all 4 results + transition to TRIAGE_COMPLETE
      await ctx.runMutation(internal.triage.writeAllResults, {
        submissionId: args.submissionId,
        triageRunId: args.triageRunId,
        results,
        pageCount: totalPages,
      })
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        // Retry with exponential backoff (30s base for rate limits)
        const delayMs = 30_000 * Math.pow(2, attempt - 1)
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
