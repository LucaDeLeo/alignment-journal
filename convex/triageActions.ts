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

const PASS_NAMES = ['scope', 'formatting', 'citations', 'claims'] as const

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
// Per-dimension system prompts
// ---------------------------------------------------------------------------

const SYSTEM_PROMPTS: Record<(typeof PASS_NAMES)[number], string> = {
  scope: `You are a triage assistant for the Alignment Journal, a peer-reviewed journal focused on theoretical AI alignment research. Analyze the following paper text and assess its scope fit.

The journal's focus areas are:
- Theoretical AI alignment: agency, understanding, asymptotic behavior of advanced synthetic agents
- Conceptual and mathematically abstract ideas transcending contemporary architectures
- Empirical work is welcome but no emphasis on SOTA benchmarks
- Out of scope: AI governance, deployment, applied mechinterp, evaluations, societal impact

Assess whether the paper falls within scope. Consider the paper's core thesis, methodology, and contribution area.`,

  formatting: `You are a triage assistant for the Alignment Journal. Analyze the following paper text for formatting and completeness issues.

Check for:
- Abstract present and well-structured
- Clear section structure (introduction, related work, methodology, results/analysis, conclusion)
- References section present and formatted
- Page numbers present
- Author affiliations included
- Figures/tables referenced in text

Report any formatting or completeness issues found.`,

  citations: `You are a triage assistant for the Alignment Journal. Analyze the following paper text for citation quality.

Check for:
- Extract key citations referenced in the paper
- Flag any citations that appear incomplete (missing year, venue, or author)
- Identify citations that may be unresolvable (non-standard format, missing from common databases)
- Note the total approximate citation count

Report on citation quality and any issues found.`,

  claims: `You are a triage assistant for the Alignment Journal. Analyze the following paper text for technical claims and evidence quality.

Check for:
- Identify the key technical claims made by the paper (2-5 main claims)
- For each claim, assess whether the paper provides supporting evidence, proofs, or arguments
- Flag claims that appear unsupported or under-argued
- Note whether the methodology is clearly described and reproducible

Report on the quality of the paper's technical argumentation.`,
}

// ---------------------------------------------------------------------------
// Single triage action: extracts text once, runs all 4 analyses sequentially
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

      // 4. Truncate text, then run all 4 analyses sequentially
      const truncatedText = extractedText.slice(0, MAX_TEXT_LENGTH)
      const results = {} as Record<
        (typeof PASS_NAMES)[number],
        z.infer<typeof triageResultSchema>
      >

      for (const passName of PASS_NAMES) {
        const { object } = await generateObject({
          model: anthropic('claude-haiku-4-5-20251001'),
          schema: triageResultSchema,
          system: SYSTEM_PROMPTS[passName],
          prompt: `Analyze the following paper:\n\n${truncatedText}`,
        })
        results[passName] = object
      }

      // 5. Write all 4 results + transition to TRIAGE_COMPLETE
      await ctx.runMutation(internal.triage.writeAllResults, {
        submissionId: args.submissionId,
        triageRunId: args.triageRunId,
        results,
        pageCount: totalPages,
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
