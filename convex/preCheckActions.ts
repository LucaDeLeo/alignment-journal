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
// Zod schema for PDF metadata extraction
// ---------------------------------------------------------------------------

const pdfMetadataSchema = z.object({
  title: z.string().describe('The exact title of the paper'),
  authors: z.array(
    z.object({
      name: z.string().describe('Full author name'),
      affiliation: z
        .string()
        .describe('Author affiliation/institution, empty string if not listed'),
    }),
  ),
  abstract: z.string().describe('The full abstract text'),
  keywords: z
    .array(z.string())
    .describe(
      'Explicit keywords if listed; otherwise suggest 3-5 based on content',
    ),
})

// ---------------------------------------------------------------------------
// Zod schema for a single pre-check dimension
// ---------------------------------------------------------------------------

const preCheckResultSchema = z.object({
  feedback: z
    .string()
    .describe('Concise summary written constructively for the author'),
  status: z
    .enum(['good', 'needs_attention', 'concern'])
    .describe(
      'good = strong in this area, needs_attention = some improvements possible, concern = significant issues to address',
    ),
  suggestion: z
    .string()
    .describe('Specific, actionable suggestion to improve the paper'),
})

// ---------------------------------------------------------------------------
// Author-facing system prompts
// ---------------------------------------------------------------------------

const SYSTEM_PROMPTS: Record<(typeof PASS_NAMES)[number], string> = {
  scope: `You are a helpful pre-submission assistant for the Alignment Journal, a peer-reviewed journal focused on theoretical AI alignment research. Your role is to give authors constructive feedback before they submit.

The journal's focus areas are:
- Theoretical AI alignment: agency, understanding, asymptotic behavior of advanced synthetic agents
- Conceptual and mathematically abstract ideas transcending contemporary architectures
- Empirical work is welcome but no emphasis on SOTA benchmarks
- Out of scope: AI governance, deployment, applied mechinterp, evaluations, societal impact

Assess whether the paper fits the journal's scope. If it's a strong fit, say so encouragingly. If it's borderline, suggest how the author might reframe the contribution. If it appears out of scope, explain kindly and suggest where it might be a better fit.`,

  formatting: `You are a helpful pre-submission assistant for the Alignment Journal. Your role is to give authors constructive feedback on paper structure and completeness before they submit.

Check for:
- Abstract present and well-structured
- Clear section structure (introduction, related work, methodology, results/analysis, conclusion)
- References section present and formatted
- Author affiliations included
- Figures/tables referenced in text

Focus on actionable fixes the author can make before submitting. Be encouraging about what's done well.`,

  citations: `You are a helpful pre-submission assistant for the Alignment Journal. Your role is to give authors constructive feedback on their references before they submit.

Check for:
- Adequate number of references for the topic
- Citation completeness (year, venue, authors present)
- Mix of foundational and recent work
- Key related work that may be missing

Suggest specific improvements the author can make to strengthen their references.`,

  claims: `You are a helpful pre-submission assistant for the Alignment Journal. Your role is to give authors constructive feedback on the strength of their technical arguments before they submit.

Check for:
- Key technical claims are clearly stated
- Claims are supported by evidence, proofs, or arguments
- Methodology is clearly described
- Limitations are acknowledged

Highlight strengths as well as areas that would benefit from more support. Be constructive and specific.`,
}

// ---------------------------------------------------------------------------
// Pre-check action
// ---------------------------------------------------------------------------

export const runPreCheck = internalAction({
  args: {
    userId: v.id('users'),
    pdfStorageId: v.id('_storage'),
    checkRunId: v.string(),
    attemptCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = args.attemptCount ?? 1

    try {
      // 1. Mark all 4 reports as running
      await ctx.runMutation(internal.preCheck.markAllRunning, {
        checkRunId: args.checkRunId,
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
        const emptyResult = {
          feedback: 'No extractable text was found in your PDF. This may mean the file is image-based or corrupted.',
          status: 'concern' as const,
          suggestion: 'Please ensure your PDF contains selectable text. If your paper is in image format, consider converting it to a text-based PDF.',
        }
        await ctx.runMutation(internal.preCheck.writeAllResults, {
          checkRunId: args.checkRunId,
          results: {
            scope: emptyResult,
            formatting: emptyResult,
            citations: emptyResult,
            claims: emptyResult,
          },
        })
        return null
      }

      // 4. Truncate text, then run all 4 analyses sequentially
      const truncatedText = extractedText.slice(0, MAX_TEXT_LENGTH)
      const results: Record<string, { feedback: string; status: 'good' | 'needs_attention' | 'concern'; suggestion: string }> = {}

      for (const passName of PASS_NAMES) {
        const { object } = await generateObject({
          model: anthropic('claude-haiku-4-5-20251001'),
          schema: preCheckResultSchema,
          system: SYSTEM_PROMPTS[passName],
          prompt: `Please review the following paper and provide constructive feedback:\n\n${truncatedText}`,
        })
        results[passName] = object
      }

      // 5. Write all 4 results
      await ctx.runMutation(internal.preCheck.writeAllResults, {
        checkRunId: args.checkRunId,
        results: results as {
          scope: { feedback: string; status: 'good' | 'needs_attention' | 'concern'; suggestion: string }
          formatting: { feedback: string; status: 'good' | 'needs_attention' | 'concern'; suggestion: string }
          citations: { feedback: string; status: 'good' | 'needs_attention' | 'concern'; suggestion: string }
          claims: { feedback: string; status: 'good' | 'needs_attention' | 'concern'; suggestion: string }
        },
      })
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        // Retry with exponential backoff
        const delayMs = 1000 * Math.pow(2, attempt - 1)
        await ctx.scheduler.runAfter(delayMs, internal.preCheckActions.runPreCheck, {
          ...args,
          attemptCount: attempt + 1,
        })
      } else {
        // Terminal failure — mark all reports as failed
        const message =
          error instanceof Error ? error.message : 'Unknown pre-check error'
        await ctx.runMutation(internal.preCheck.markAllFailed, {
          checkRunId: args.checkRunId,
          lastError: message,
        })
      }
    }
    return null
  },
})

// ---------------------------------------------------------------------------
// Metadata extraction action
// ---------------------------------------------------------------------------

export const extractMetadata = internalAction({
  args: {
    userId: v.id('users'),
    pdfStorageId: v.id('_storage'),
    attemptCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = args.attemptCount ?? 1

    try {
      // Mark as running
      await ctx.runMutation(internal.pdfMetadata.markRunning, {
        userId: args.userId,
        pdfStorageId: args.pdfStorageId,
      })

      // Fetch PDF and extract text
      const pdfUrl = await ctx.storage.getUrl(args.pdfStorageId)
      if (!pdfUrl) throw new Error('PDF not found in storage')
      const pdfResponse = await fetch(pdfUrl)
      const pdfBuffer = await pdfResponse.arrayBuffer()
      const { text: extractedText } = await extractText(
        new Uint8Array(pdfBuffer),
        { mergePages: true },
      )

      if (!extractedText || extractedText.trim().length === 0) {
        // Can't extract metadata from image-only PDFs
        await ctx.runMutation(internal.pdfMetadata.markFailed, {
          userId: args.userId,
          pdfStorageId: args.pdfStorageId,
          lastError: 'No extractable text found in PDF',
        })
        return null
      }

      const truncatedText = extractedText.slice(0, MAX_TEXT_LENGTH)

      const { object } = await generateObject({
        model: anthropic('claude-haiku-4-5-20251001'),
        schema: pdfMetadataSchema,
        system: `You are a metadata extraction assistant. Extract the title, authors, abstract, and keywords from the given academic paper text exactly as they appear. For author affiliations, use an empty string if not listed. If the paper does not explicitly list keywords, suggest 3 to 5 relevant keywords based on the content.`,
        prompt: truncatedText,
      })

      await ctx.runMutation(internal.pdfMetadata.writeResult, {
        userId: args.userId,
        pdfStorageId: args.pdfStorageId,
        result: object,
      })
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        const delayMs = 1000 * Math.pow(2, attempt - 1)
        await ctx.scheduler.runAfter(
          delayMs,
          internal.preCheckActions.extractMetadata,
          {
            ...args,
            attemptCount: attempt + 1,
          },
        )
      } else {
        const message =
          error instanceof Error ? error.message : 'Unknown extraction error'
        await ctx.runMutation(internal.pdfMetadata.markFailed, {
          userId: args.userId,
          pdfStorageId: args.pdfStorageId,
          lastError: message,
        })
      }
    }
    return null
  },
})
