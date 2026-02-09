import { v } from 'convex/values'

import {
  internalMutation,
  mutation,
  query,
} from './_generated/server'
import { internal } from './_generated/api'
import { withAuthor, withUser } from './helpers/auth'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

// ---------------------------------------------------------------------------
// Convex validators
// ---------------------------------------------------------------------------

const metadataResultValidator = v.object({
  title: v.string(),
  authors: v.array(v.object({ name: v.string(), affiliation: v.string() })),
  abstract: v.string(),
  keywords: v.array(v.string()),
})

const metadataStatusValidator = v.union(
  v.literal('pending'),
  v.literal('running'),
  v.literal('complete'),
  v.literal('failed'),
)

// ---------------------------------------------------------------------------
// Public mutation: start metadata extraction
// ---------------------------------------------------------------------------

export const startExtraction = mutation({
  args: { pdfStorageId: v.id('_storage') },
  returns: v.null(),
  handler: withAuthor(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { pdfStorageId: Id<'_storage'> },
    ) => {
      // Idempotent: check if extraction already exists for this user + PDF
      const existing = await ctx.db
        .query('pdfMetadata')
        .withIndex('by_userId_pdfStorageId', (q) =>
          q
            .eq('userId', ctx.user._id)
            .eq('pdfStorageId', args.pdfStorageId),
        )
        .first()

      if (existing) {
        return null
      }

      await ctx.db.insert('pdfMetadata', {
        userId: ctx.user._id,
        pdfStorageId: args.pdfStorageId,
        status: 'pending',
        createdAt: Date.now(),
      })

      await ctx.scheduler.runAfter(
        0,
        internal.preCheckActions.extractMetadata,
        {
          userId: ctx.user._id,
          pdfStorageId: args.pdfStorageId,
        },
      )

      return null
    },
  ),
})

// ---------------------------------------------------------------------------
// Public query: get metadata extraction result
// ---------------------------------------------------------------------------

export const get = query({
  args: { pdfStorageId: v.id('_storage') },
  returns: v.union(
    v.object({
      status: metadataStatusValidator,
      result: v.optional(metadataResultValidator),
    }),
    v.null(),
  ),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { pdfStorageId: Id<'_storage'> },
    ) => {
      const row = await ctx.db
        .query('pdfMetadata')
        .withIndex('by_userId_pdfStorageId', (q) =>
          q
            .eq('userId', ctx.user._id)
            .eq('pdfStorageId', args.pdfStorageId),
        )
        .first()

      if (!row) return null

      return {
        status: row.status,
        result: row.result,
      }
    },
  ),
})

// ---------------------------------------------------------------------------
// Internal mutations
// ---------------------------------------------------------------------------

export const markRunning = internalMutation({
  args: {
    userId: v.id('users'),
    pdfStorageId: v.id('_storage'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('pdfMetadata')
      .withIndex('by_userId_pdfStorageId', (q) =>
        q
          .eq('userId', args.userId)
          .eq('pdfStorageId', args.pdfStorageId),
      )
      .first()

    if (row && row.status === 'pending') {
      await ctx.db.patch(row._id, { status: 'running' })
    }
    return null
  },
})

export const writeResult = internalMutation({
  args: {
    userId: v.id('users'),
    pdfStorageId: v.id('_storage'),
    result: metadataResultValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('pdfMetadata')
      .withIndex('by_userId_pdfStorageId', (q) =>
        q
          .eq('userId', args.userId)
          .eq('pdfStorageId', args.pdfStorageId),
      )
      .first()

    if (row && row.status !== 'complete') {
      await ctx.db.patch(row._id, {
        status: 'complete',
        result: args.result,
      })
    }
    return null
  },
})

export const markFailed = internalMutation({
  args: {
    userId: v.id('users'),
    pdfStorageId: v.id('_storage'),
    lastError: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('pdfMetadata')
      .withIndex('by_userId_pdfStorageId', (q) =>
        q
          .eq('userId', args.userId)
          .eq('pdfStorageId', args.pdfStorageId),
      )
      .first()

    if (row && row.status !== 'complete') {
      await ctx.db.patch(row._id, {
        status: 'failed',
        lastError: args.lastError,
      })
    }
    return null
  },
})
