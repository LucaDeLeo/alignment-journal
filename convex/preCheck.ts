import { v } from 'convex/values'

import {
  internalMutation,
  mutation,
  query,
} from './_generated/server'
import { internal } from './_generated/api'
import { withAuthor, withUser } from './helpers/auth'
import { unauthorizedError } from './helpers/errors'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PASS_NAMES = ['scope', 'formatting', 'citations', 'claims'] as const

// ---------------------------------------------------------------------------
// Convex validators
// ---------------------------------------------------------------------------

const preCheckResultValidator = v.object({
  feedback: v.string(),
  status: v.union(
    v.literal('good'),
    v.literal('needs_attention'),
    v.literal('concern'),
  ),
  suggestion: v.string(),
})

const passNameValidator = v.union(
  v.literal('scope'),
  v.literal('formatting'),
  v.literal('citations'),
  v.literal('claims'),
)

const preCheckStatusValidator = v.union(
  v.literal('pending'),
  v.literal('running'),
  v.literal('complete'),
  v.literal('failed'),
)

// ---------------------------------------------------------------------------
// Public mutation: start a pre-check run
// ---------------------------------------------------------------------------

export const start = mutation({
  args: { pdfStorageId: v.id('_storage') },
  returns: v.string(),
  handler: withAuthor(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { pdfStorageId: Id<'_storage'> },
    ) => {
      // Idempotent: check if a run already exists for this user + PDF
      const existing = await ctx.db
        .query('preCheckReports')
        .withIndex('by_userId_pdfStorageId', (q) =>
          q
            .eq('userId', ctx.user._id)
            .eq('pdfStorageId', args.pdfStorageId),
        )
        .first()

      if (existing) {
        return existing.checkRunId
      }

      // Create new run
      const checkRunId = crypto.randomUUID()
      const now = Date.now()

      for (const passName of PASS_NAMES) {
        await ctx.db.insert('preCheckReports', {
          userId: ctx.user._id,
          pdfStorageId: args.pdfStorageId,
          checkRunId,
          passName,
          status: 'pending',
          createdAt: now,
        })
      }

      await ctx.scheduler.runAfter(
        0,
        internal.preCheckActions.runPreCheck,
        {
          userId: ctx.user._id,
          pdfStorageId: args.pdfStorageId,
          checkRunId,
        },
      )

      return checkRunId
    },
  ),
})

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export const getResults = query({
  args: { checkRunId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id('preCheckReports'),
      passName: passNameValidator,
      status: preCheckStatusValidator,
      result: v.optional(preCheckResultValidator),
      lastError: v.optional(v.string()),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
  ),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { checkRunId: string },
    ) => {
      const reports = await ctx.db
        .query('preCheckReports')
        .withIndex('by_checkRunId', (q) =>
          q.eq('checkRunId', args.checkRunId),
        )
        .collect()

      // Verify ownership
      if (reports.length > 0 && reports[0].userId !== ctx.user._id) {
        throw unauthorizedError('Not authorized to view these results')
      }

      const PASS_ORDER: Record<string, number> = {
        scope: 0,
        formatting: 1,
        citations: 2,
        claims: 3,
      }

      const sorted = [...reports].sort(
        (a, b) => PASS_ORDER[a.passName] - PASS_ORDER[b.passName],
      )

      return sorted.map((r) => ({
        _id: r._id,
        passName: r.passName,
        status: r.status,
        result: r.result,
        lastError: r.lastError,
        completedAt: r.completedAt,
        createdAt: r.createdAt,
      }))
    },
  ),
})

export const getProgress = query({
  args: { checkRunId: v.string() },
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
      args: { checkRunId: string },
    ) => {
      const reports = await ctx.db
        .query('preCheckReports')
        .withIndex('by_checkRunId', (q) =>
          q.eq('checkRunId', args.checkRunId),
        )
        .collect()

      // Verify ownership
      if (reports.length > 0 && reports[0].userId !== ctx.user._id) {
        throw unauthorizedError('Not authorized to view these results')
      }

      return {
        total: PASS_NAMES.length,
        complete: reports.filter((r) => r.status === 'complete').length,
        running: reports.filter((r) => r.status === 'running').length,
        failed: reports.filter((r) => r.status === 'failed').length,
        pending: reports.filter((r) => r.status === 'pending').length,
      }
    },
  ),
})

// ---------------------------------------------------------------------------
// Internal mutations
// ---------------------------------------------------------------------------

export const markAllRunning = internalMutation({
  args: { checkRunId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query('preCheckReports')
      .withIndex('by_checkRunId', (q) =>
        q.eq('checkRunId', args.checkRunId),
      )
      .collect()

    for (const report of reports) {
      if (report.status === 'complete' || report.status === 'failed') continue
      await ctx.db.patch(report._id, {
        status: 'running',
      })
    }
    return null
  },
})

export const writeAllResults = internalMutation({
  args: {
    checkRunId: v.string(),
    results: v.object({
      scope: preCheckResultValidator,
      formatting: preCheckResultValidator,
      citations: preCheckResultValidator,
      claims: preCheckResultValidator,
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now()
    const reports = await ctx.db
      .query('preCheckReports')
      .withIndex('by_checkRunId', (q) =>
        q.eq('checkRunId', args.checkRunId),
      )
      .collect()

    for (const report of reports) {
      if (report.status === 'complete') continue
      await ctx.db.patch(report._id, {
        status: 'complete',
        result: args.results[report.passName],
        completedAt: now,
      })
    }
    return null
  },
})

export const markAllFailed = internalMutation({
  args: {
    checkRunId: v.string(),
    lastError: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query('preCheckReports')
      .withIndex('by_checkRunId', (q) =>
        q.eq('checkRunId', args.checkRunId),
      )
      .collect()

    for (const report of reports) {
      if (report.status === 'complete') continue
      await ctx.db.patch(report._id, {
        status: 'failed',
        lastError: args.lastError,
      })
    }
    return null
  },
})
