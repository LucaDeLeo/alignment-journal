"use node";

import { v } from 'convex/values'
import { extractText } from 'unpdf'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from './_generated/server'
import { internal } from './_generated/api'
import { withUser } from './helpers/auth'
import { assertTransition } from './helpers/transitions'
import { notFoundError, unauthorizedError } from './helpers/errors'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PASS_NAMES = ['scope', 'formatting', 'citations', 'claims'] as const

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
// Convex validators (reused across functions)
// ---------------------------------------------------------------------------

const triageResultValidator = v.object({
  finding: v.string(),
  severity: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
  recommendation: v.string(),
})

const passNameValidator = v.union(
  v.literal('scope'),
  v.literal('formatting'),
  v.literal('citations'),
  v.literal('claims'),
)

const triageStatusValidator = v.union(
  v.literal('pending'),
  v.literal('running'),
  v.literal('complete'),
  v.literal('failed'),
)

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

/** Roles that have cross-author access to triage data. */
const TRIAGE_PRIVILEGED_ROLES: ReadonlyArray<string> = [
  'editor_in_chief',
  'action_editor',
  'admin',
]

/**
 * Object-level authorization for triage data access.
 * Allows the submission author or users with a privileged role.
 *
 * Works with both QueryCtx and MutationCtx (both extend QueryCtx).
 * Returns the submission document so callers that need it can avoid
 * a redundant `db.get`.
 */
async function assertTriageAccess<TCtx extends QueryCtx>(
  ctx: TCtx & { user: Doc<'users'> },
  submissionId: Id<'submissions'>,
): Promise<Doc<'submissions'>> {
  const submission = await ctx.db.get('submissions', submissionId)
  if (!submission) throw notFoundError('Submission', submissionId)

  if (
    submission.authorId !== ctx.user._id &&
    !TRIAGE_PRIVILEGED_ROLES.includes(ctx.user.role)
  ) {
    throw unauthorizedError('Not authorized to access this submission')
  }
  return submission
}

/**
 * Find the latest triageRunId for a submission.
 */
async function getLatestTriageRunId(
  ctx: QueryCtx,
  submissionId: Id<'submissions'>,
): Promise<string | null> {
  const reports = await ctx.db
    .query('triageReports')
    .withIndex('by_submissionId', (q) =>
      q.eq('submissionId', submissionId),
    )
    .order('desc')
    .collect()
  if (reports.length === 0) return null
  // Latest report by creation time has the latest triageRunId
  return reports[0].triageRunId
}

// ---------------------------------------------------------------------------
// Internal mutation: core triage trigger (called from submissions.create)
// ---------------------------------------------------------------------------

export const startTriageInternal = internalMutation({
  args: { submissionId: v.id('submissions') },
  returns: v.string(),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get('submissions', args.submissionId)
    if (!submission) throw notFoundError('Submission', args.submissionId)
    assertTransition(submission.status, 'TRIAGING')
    await ctx.db.patch('submissions', args.submissionId, {
      status: 'TRIAGING',
      updatedAt: Date.now(),
    })

    const triageRunId = crypto.randomUUID()
    const now = Date.now()

    for (const passName of PASS_NAMES) {
      await ctx.db.insert('triageReports', {
        submissionId: args.submissionId,
        triageRunId,
        passName,
        status: 'pending',
        idempotencyKey: `${args.submissionId}_${triageRunId}_${passName}`,
        attemptCount: 0,
        createdAt: now,
      })
    }

    if (!submission.pdfStorageId) {
      throw notFoundError('PDF storage ID')
    }

    await ctx.scheduler.runAfter(0, internal.triage.runScope, {
      submissionId: args.submissionId,
      triageRunId,
      pdfStorageId: submission.pdfStorageId,
    })

    return triageRunId
  },
})

// ---------------------------------------------------------------------------
// Public mutation: manual re-triage
// ---------------------------------------------------------------------------

export const startTriage = mutation({
  args: { submissionId: v.id('submissions') },
  returns: v.string(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      // Object-level authorization: author or privileged role
      const submission = await assertTriageAccess(ctx, args.submissionId)

      assertTransition(submission.status, 'TRIAGING')
      await ctx.db.patch('submissions', args.submissionId, {
        status: 'TRIAGING',
        updatedAt: Date.now(),
      })

      const triageRunId = crypto.randomUUID()
      const now = Date.now()

      for (const passName of PASS_NAMES) {
        await ctx.db.insert('triageReports', {
          submissionId: args.submissionId,
          triageRunId,
          passName,
          status: 'pending',
          idempotencyKey: `${args.submissionId}_${triageRunId}_${passName}`,
          attemptCount: 0,
          createdAt: now,
        })
      }

      if (!submission.pdfStorageId) {
        throw notFoundError('PDF storage ID')
      }

      await ctx.scheduler.runAfter(0, internal.triage.runScope, {
        submissionId: args.submissionId,
        triageRunId,
        pdfStorageId: submission.pdfStorageId,
      })

      return triageRunId
    },
  ),
})

// ---------------------------------------------------------------------------
// Internal mutations: result writes and status management
// ---------------------------------------------------------------------------

export const writeResult = internalMutation({
  args: {
    idempotencyKey: v.string(),
    result: triageResultValidator,
    completedAt: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query('triageReports')
      .withIndex('by_idempotencyKey', (q) =>
        q.eq('idempotencyKey', args.idempotencyKey),
      )
      .unique()
    if (!report) return false
    if (report.status === 'complete') return false
    await ctx.db.patch('triageReports', report._id, {
      status: 'complete',
      result: args.result,
      completedAt: args.completedAt,
    })
    return true
  },
})

export const markRunning = internalMutation({
  args: { idempotencyKey: v.string(), attemptCount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query('triageReports')
      .withIndex('by_idempotencyKey', (q) =>
        q.eq('idempotencyKey', args.idempotencyKey),
      )
      .unique()
    if (!report) return null
    // Guard: never overwrite a terminal state
    if (report.status === 'complete' || report.status === 'failed') return null
    await ctx.db.patch('triageReports', report._id, {
      status: 'running',
      attemptCount: args.attemptCount,
    })
    return null
  },
})

export const markFailed = internalMutation({
  args: {
    idempotencyKey: v.string(),
    lastError: v.string(),
    attemptCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query('triageReports')
      .withIndex('by_idempotencyKey', (q) =>
        q.eq('idempotencyKey', args.idempotencyKey),
      )
      .unique()
    if (!report) return null
    // Guard: never overwrite a completed report
    if (report.status === 'complete') return null
    await ctx.db.patch('triageReports', report._id, {
      status: 'failed',
      lastError: args.lastError,
      attemptCount: args.attemptCount,
    })
    return null
  },
})

export const completeTriageRun = internalMutation({
  args: {
    submissionId: v.id('submissions'),
    triageRunId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query('triageReports')
      .withIndex('by_submissionId', (q) =>
        q.eq('submissionId', args.submissionId),
      )
      .collect()
    const runReports = reports.filter(
      (r) => r.triageRunId === args.triageRunId,
    )
    if (runReports.length < 4) return null

    const allComplete = runReports.every((r) => r.status === 'complete')
    if (allComplete) {
      const submission = await ctx.db.get('submissions', args.submissionId)
      if (submission) {
        // Idempotent: if already TRIAGE_COMPLETE, skip transition
        if (submission.status === 'TRIAGE_COMPLETE') return null
        assertTransition(submission.status, 'TRIAGE_COMPLETE')
        await ctx.db.patch('submissions', args.submissionId, {
          status: 'TRIAGE_COMPLETE',
          updatedAt: Date.now(),
        })
      }
    }
    return null
  },
})

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
        await ctx.scheduler.runAfter(0, internal.triage.runFormatting, {
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
      await ctx.scheduler.runAfter(0, internal.triage.runFormatting, {
        submissionId: args.submissionId,
        triageRunId: args.triageRunId,
        extractedText: truncatedText,
      })
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        const delayMs = 1000 * Math.pow(2, attempt - 1)
        await ctx.scheduler.runAfter(delayMs, internal.triage.runScope, {
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
        await ctx.scheduler.runAfter(0, internal.triage.runFormatting, {
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

      await ctx.scheduler.runAfter(0, internal.triage.runCitations, {
        submissionId: args.submissionId,
        triageRunId: args.triageRunId,
        extractedText: args.extractedText,
      })
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        const delayMs = 1000 * Math.pow(2, attempt - 1)
        await ctx.scheduler.runAfter(delayMs, internal.triage.runFormatting, {
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
        await ctx.scheduler.runAfter(0, internal.triage.runCitations, {
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

      await ctx.scheduler.runAfter(0, internal.triage.runClaims, {
        submissionId: args.submissionId,
        triageRunId: args.triageRunId,
        extractedText: args.extractedText,
      })
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        const delayMs = 1000 * Math.pow(2, attempt - 1)
        await ctx.scheduler.runAfter(delayMs, internal.triage.runCitations, {
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
        await ctx.scheduler.runAfter(0, internal.triage.runClaims, {
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
        await ctx.scheduler.runAfter(delayMs, internal.triage.runClaims, {
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

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const PASS_ORDER: Record<string, number> = {
  scope: 0,
  formatting: 1,
  citations: 2,
  claims: 3,
}

export const getBySubmission = query({
  args: { submissionId: v.id('submissions') },
  returns: v.array(
    v.object({
      _id: v.id('triageReports'),
      passName: passNameValidator,
      status: triageStatusValidator,
      result: v.optional(triageResultValidator),
      lastError: v.optional(v.string()),
      attemptCount: v.number(),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
  ),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      // Object-level authorization
      await assertTriageAccess(ctx, args.submissionId)

      const reports = await ctx.db
        .query('triageReports')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .collect()

      // Filter to latest triage run only
      const latestRunId = await getLatestTriageRunId(ctx, args.submissionId)
      const latestReports = latestRunId
        ? reports.filter((r) => r.triageRunId === latestRunId)
        : reports

      const sorted = [...latestReports].sort(
        (a, b) => PASS_ORDER[a.passName] - PASS_ORDER[b.passName],
      )

      return sorted.map((r) => ({
        _id: r._id,
        passName: r.passName,
        status: r.status,
        result: r.result,
        lastError: r.lastError,
        attemptCount: r.attemptCount,
        completedAt: r.completedAt,
        createdAt: r.createdAt,
      }))
    },
  ),
})

export const getProgress = query({
  args: { submissionId: v.id('submissions') },
  returns: v.object({
    total: v.number(),
    complete: v.number(),
    running: v.number(),
    failed: v.number(),
    pending: v.number(),
  }),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      // Object-level authorization
      await assertTriageAccess(ctx, args.submissionId)

      const reports = await ctx.db
        .query('triageReports')
        .withIndex('by_submissionId', (q) =>
          q.eq('submissionId', args.submissionId),
        )
        .collect()

      // Filter to latest triage run only
      const latestRunId = await getLatestTriageRunId(ctx, args.submissionId)
      const latestReports = latestRunId
        ? reports.filter((r) => r.triageRunId === latestRunId)
        : reports

      // Always report total as 4 (the four-pass contract)
      return {
        total: PASS_NAMES.length,
        complete: latestReports.filter((r) => r.status === 'complete').length,
        running: latestReports.filter((r) => r.status === 'running').length,
        failed: latestReports.filter((r) => r.status === 'failed').length,
        pending: latestReports.filter((r) => r.status === 'pending').length,
      }
    },
  ),
})
