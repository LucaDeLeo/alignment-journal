import { v } from 'convex/values'

import {
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

    await ctx.scheduler.runAfter(0, internal.triageActions.runScope, {
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

      await ctx.scheduler.runAfter(0, internal.triageActions.runScope, {
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
