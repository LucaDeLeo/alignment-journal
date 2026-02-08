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

/** Maximum length for LLM-generated string fields (AC7 sanitization). */
const MAX_LLM_FIELD_LENGTH = 5_000

// ---------------------------------------------------------------------------
// Zod schema for generateObject structured output
// ---------------------------------------------------------------------------

const triageResultSchema = z.object({
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

// ---------------------------------------------------------------------------
// LLM system prompts (one per triage pass)
// ---------------------------------------------------------------------------

const SCOPE_SYSTEM_PROMPT = `You are a triage assistant for the Alignment Journal, a peer-reviewed journal focused on theoretical AI alignment research. Analyze the following paper text and assess its scope fit.

The journal's focus areas are:
- Theoretical AI alignment: agency, understanding, asymptotic behavior of advanced synthetic agents
- Conceptual and mathematically abstract ideas transcending contemporary architectures
- Empirical work is welcome but no emphasis on SOTA benchmarks
- Out of scope: AI governance, deployment, applied mechinterp, evaluations, societal impact

Assess whether the paper falls within scope. Consider the paper's core thesis, methodology, and contribution area.`

const FORMATTING_SYSTEM_PROMPT = `You are a triage assistant for the Alignment Journal. Analyze the following paper text for formatting and completeness issues.

Check for:
- Abstract present and well-structured
- Clear section structure (introduction, related work, methodology, results/analysis, conclusion)
- References section present and formatted
- Page numbers present
- Author affiliations included
- Figures/tables referenced in text

Report any formatting or completeness issues found.`

const CITATIONS_SYSTEM_PROMPT = `You are a triage assistant for the Alignment Journal. Analyze the following paper text for citation quality.

Check for:
- Extract key citations referenced in the paper
- Flag any citations that appear incomplete (missing year, venue, or author)
- Identify citations that may be unresolvable (non-standard format, missing from common databases)
- Note the total approximate citation count

Report on citation quality and any issues found.`

const CLAIMS_SYSTEM_PROMPT = `You are a triage assistant for the Alignment Journal. Analyze the following paper text for technical claims and evidence quality.

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
// Internal actions: triage passes
// ---------------------------------------------------------------------------

export const runScope = internalAction({
  args: {
    submissionId: v.id('submissions'),
    triageRunId: v.string(),
    pdfStorageId: v.id('_storage'),
    attemptCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = args.attemptCount ?? 1
    const idempotencyKey = `${args.submissionId}_${args.triageRunId}_scope`

    try {
      // 1. Mark running BEFORE PDF fetch (fixes retry tracking)
      await ctx.runMutation(internal.triage.markRunning, {
        idempotencyKey,
        attemptCount: attempt,
      })

      // 2. Fetch PDF and extract text
      const pdfUrl = await ctx.storage.getUrl(args.pdfStorageId)
      if (!pdfUrl) throw new Error('PDF not found in storage')
      const pdfResponse = await fetch(pdfUrl)
      const pdfBuffer = await pdfResponse.arrayBuffer()
      const { text: extractedText } = await extractText(
        new Uint8Array(pdfBuffer),
        { mergePages: true },
      )

      // 3. Handle empty text
      if (!extractedText || extractedText.trim().length === 0) {
        await ctx.runMutation(internal.triage.writeResult, {
          idempotencyKey,
          result: {
            finding: 'No extractable text found in the PDF',
            severity: 'high' as const,
            recommendation:
              'Request the author to resubmit with a text-based PDF',
          },
          completedAt: Date.now(),
        })
        await ctx.scheduler.runAfter(0, internal.triageActions.runFormatting, {
          submissionId: args.submissionId,
          triageRunId: args.triageRunId,
          extractedText: '',
        })
        return null
      }

      // 4. Truncate text and call LLM
      const truncatedText = extractedText.slice(0, MAX_TEXT_LENGTH)

      const { object: result } = await generateObject({
        model: anthropic('claude-sonnet-4-5-20250929'),
        schema: triageResultSchema,
        system: SCOPE_SYSTEM_PROMPT,
        prompt: `Analyze the following paper:\n\n${truncatedText}`,
      })

      // 5. Write sanitized result
      await ctx.runMutation(internal.triage.writeResult, {
        idempotencyKey,
        result: sanitizeResult(result),
        completedAt: Date.now(),
      })

      // 6. Schedule next pass
      await ctx.scheduler.runAfter(0, internal.triageActions.runFormatting, {
        submissionId: args.submissionId,
        triageRunId: args.triageRunId,
        extractedText: truncatedText,
      })
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        const delayMs = 1000 * Math.pow(2, attempt - 1)
        await ctx.scheduler.runAfter(delayMs, internal.triageActions.runScope, {
          ...args,
          attemptCount: attempt + 1,
        })
      } else {
        await ctx.runMutation(internal.triage.markFailed, {
          idempotencyKey,
          lastError: 'LLM analysis failed for scope pass',
          attemptCount: attempt,
        })
        // Continue pipeline even on terminal failure
        await ctx.scheduler.runAfter(0, internal.triageActions.runFormatting, {
          submissionId: args.submissionId,
          triageRunId: args.triageRunId,
          extractedText: '',
        })
      }
    }
    return null
  },
})

export const runFormatting = internalAction({
  args: {
    submissionId: v.id('submissions'),
    triageRunId: v.string(),
    extractedText: v.string(),
    attemptCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = args.attemptCount ?? 1
    const idempotencyKey = `${args.submissionId}_${args.triageRunId}_formatting`

    try {
      await ctx.runMutation(internal.triage.markRunning, {
        idempotencyKey,
        attemptCount: attempt,
      })

      const { object: result } = await generateObject({
        model: anthropic('claude-sonnet-4-5-20250929'),
        schema: triageResultSchema,
        system: FORMATTING_SYSTEM_PROMPT,
        prompt: `Analyze the following paper:\n\n${args.extractedText}`,
      })

      await ctx.runMutation(internal.triage.writeResult, {
        idempotencyKey,
        result: sanitizeResult(result),
        completedAt: Date.now(),
      })

      await ctx.scheduler.runAfter(0, internal.triageActions.runCitations, {
        submissionId: args.submissionId,
        triageRunId: args.triageRunId,
        extractedText: args.extractedText,
      })
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        const delayMs = 1000 * Math.pow(2, attempt - 1)
        await ctx.scheduler.runAfter(delayMs, internal.triageActions.runFormatting, {
          ...args,
          attemptCount: attempt + 1,
        })
      } else {
        await ctx.runMutation(internal.triage.markFailed, {
          idempotencyKey,
          lastError: 'LLM analysis failed for formatting pass',
          attemptCount: attempt,
        })
        // Continue pipeline even on terminal failure
        await ctx.scheduler.runAfter(0, internal.triageActions.runCitations, {
          submissionId: args.submissionId,
          triageRunId: args.triageRunId,
          extractedText: args.extractedText,
        })
      }
    }
    return null
  },
})

export const runCitations = internalAction({
  args: {
    submissionId: v.id('submissions'),
    triageRunId: v.string(),
    extractedText: v.string(),
    attemptCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = args.attemptCount ?? 1
    const idempotencyKey = `${args.submissionId}_${args.triageRunId}_citations`

    try {
      await ctx.runMutation(internal.triage.markRunning, {
        idempotencyKey,
        attemptCount: attempt,
      })

      const { object: result } = await generateObject({
        model: anthropic('claude-sonnet-4-5-20250929'),
        schema: triageResultSchema,
        system: CITATIONS_SYSTEM_PROMPT,
        prompt: `Analyze the following paper:\n\n${args.extractedText}`,
      })

      await ctx.runMutation(internal.triage.writeResult, {
        idempotencyKey,
        result: sanitizeResult(result),
        completedAt: Date.now(),
      })

      await ctx.scheduler.runAfter(0, internal.triageActions.runClaims, {
        submissionId: args.submissionId,
        triageRunId: args.triageRunId,
        extractedText: args.extractedText,
      })
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        const delayMs = 1000 * Math.pow(2, attempt - 1)
        await ctx.scheduler.runAfter(delayMs, internal.triageActions.runCitations, {
          ...args,
          attemptCount: attempt + 1,
        })
      } else {
        await ctx.runMutation(internal.triage.markFailed, {
          idempotencyKey,
          lastError: 'LLM analysis failed for citations pass',
          attemptCount: attempt,
        })
        // Continue pipeline even on terminal failure
        await ctx.scheduler.runAfter(0, internal.triageActions.runClaims, {
          submissionId: args.submissionId,
          triageRunId: args.triageRunId,
          extractedText: args.extractedText,
        })
      }
    }
    return null
  },
})

export const runClaims = internalAction({
  args: {
    submissionId: v.id('submissions'),
    triageRunId: v.string(),
    extractedText: v.string(),
    attemptCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = args.attemptCount ?? 1
    const idempotencyKey = `${args.submissionId}_${args.triageRunId}_claims`

    try {
      await ctx.runMutation(internal.triage.markRunning, {
        idempotencyKey,
        attemptCount: attempt,
      })

      const { object: result } = await generateObject({
        model: anthropic('claude-sonnet-4-5-20250929'),
        schema: triageResultSchema,
        system: CLAIMS_SYSTEM_PROMPT,
        prompt: `Analyze the following paper:\n\n${args.extractedText}`,
      })

      await ctx.runMutation(internal.triage.writeResult, {
        idempotencyKey,
        result: sanitizeResult(result),
        completedAt: Date.now(),
      })

      // Final pass — check if all passes are complete
      await ctx.runMutation(internal.triage.completeTriageRun, {
        submissionId: args.submissionId,
        triageRunId: args.triageRunId,
      })
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        const delayMs = 1000 * Math.pow(2, attempt - 1)
        await ctx.scheduler.runAfter(delayMs, internal.triageActions.runClaims, {
          ...args,
          attemptCount: attempt + 1,
        })
      } else {
        await ctx.runMutation(internal.triage.markFailed, {
          idempotencyKey,
          lastError: 'LLM analysis failed for claims pass',
          attemptCount: attempt,
        })
        // Final pass failed — still attempt completion (other passes may be done)
        await ctx.runMutation(internal.triage.completeTriageRun, {
          submissionId: args.submissionId,
          triageRunId: args.triageRunId,
        })
      }
    }
    return null
  },
})
