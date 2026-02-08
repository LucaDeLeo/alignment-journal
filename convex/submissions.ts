import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'

import { mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { withAuthor, withUser } from './helpers/auth'
import { notFoundError, unauthorizedError } from './helpers/errors'
import { submissionStatusValidator } from './helpers/transitions'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { SubmissionStatus } from './helpers/transitions'

const EDITOR_ROLES = ['editor_in_chief', 'action_editor', 'admin'] as const

/**
 * Creates a new submission with status SUBMITTED.
 * Requires author role — enforced by withAuthor wrapper.
 */
export const create = mutation({
  args: {
    title: v.string(),
    authors: v.array(v.object({ name: v.string(), affiliation: v.string() })),
    abstract: v.string(),
    keywords: v.array(v.string()),
    pdfStorageId: v.id('_storage'),
    pdfFileName: v.string(),
    pdfFileSize: v.number(),
  },
  returns: v.id('submissions'),
  handler: withAuthor(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: {
        title: string
        authors: Array<{ name: string; affiliation: string }>
        abstract: string
        keywords: Array<string>
        pdfStorageId: Id<'_storage'>
        pdfFileName: string
        pdfFileSize: number
      },
    ) => {
      // Server-side field constraints (mirrors client-side Zod schema)
      if (args.title.length < 10 || args.title.length > 300) {
        throw new Error('Title must be between 10 and 300 characters')
      }
      if (args.abstract.length < 100 || args.abstract.length > 5000) {
        throw new Error('Abstract must be between 100 and 5,000 characters')
      }
      if (args.authors.length < 1) {
        throw new Error('At least one author is required')
      }
      for (const author of args.authors) {
        if (!author.name.trim()) {
          throw new Error('Author name is required')
        }
        if (!author.affiliation.trim()) {
          throw new Error('Author affiliation is required')
        }
      }
      if (args.keywords.length < 1 || args.keywords.length > 10) {
        throw new Error('Between 1 and 10 keywords are required')
      }
      for (const keyword of args.keywords) {
        if (keyword.length < 2 || keyword.length > 50) {
          throw new Error('Each keyword must be between 2 and 50 characters')
        }
      }

      // Validate PDF storage metadata
      const fileMeta = await ctx.storage.getMetadata(args.pdfStorageId)
      if (!fileMeta) {
        throw new Error('PDF file not found in storage')
      }
      if (fileMeta.contentType !== 'application/pdf') {
        throw new Error('Uploaded file must be a PDF')
      }
      const maxSize = 50 * 1024 * 1024 // 50 MB
      if (fileMeta.size > maxSize) {
        throw new Error('PDF file must be under 50MB')
      }

      const now = Date.now()
      const submissionId = await ctx.db.insert('submissions', {
        authorId: ctx.user._id,
        title: args.title,
        authors: args.authors,
        abstract: args.abstract,
        keywords: args.keywords,
        status: 'SUBMITTED',
        pdfStorageId: args.pdfStorageId,
        pdfFileName: args.pdfFileName,
        pdfFileSize: args.pdfFileSize,
        createdAt: now,
        updatedAt: now,
      })

      // Automatically trigger triage pipeline
      await ctx.scheduler.runAfter(
        0,
        internal.triage.startTriageInternal,
        { submissionId },
      )

      return submissionId
    },
  ),
})

/**
 * Lists submissions for the current user, ordered by creation date descending.
 * Uses withUser (not withAuthor) so admin users can also view the page
 * without getting UNAUTHORIZED.
 */
export const listByAuthor = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('submissions'),
      _creationTime: v.number(),
      title: v.string(),
      status: submissionStatusValidator,
      createdAt: v.number(),
    }),
  ),
  handler: withUser(async (ctx: QueryCtx & { user: Doc<'users'> }) => {
    const submissions = await ctx.db
      .query('submissions')
      .withIndex('by_authorId', (q) => q.eq('authorId', ctx.user._id))
      .order('desc')
      .collect()
    return submissions.map((s) => ({
      _id: s._id,
      _creationTime: s._creationTime,
      title: s.title,
      status: s.status,
      createdAt: s.createdAt,
    }))
  }),
})

/**
 * Fetches a single submission by ID with author ownership enforcement.
 * Uses withUser (not withAuthor) so admin users can also access the page.
 */
export const getById = query({
  args: {
    submissionId: v.id('submissions'),
  },
  returns: v.object({
    _id: v.id('submissions'),
    _creationTime: v.number(),
    title: v.string(),
    authors: v.array(v.object({ name: v.string(), affiliation: v.string() })),
    abstract: v.string(),
    keywords: v.array(v.string()),
    status: submissionStatusValidator,
    pdfFileName: v.optional(v.string()),
    pdfFileSize: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      const submission = await ctx.db.get('submissions', args.submissionId)
      if (!submission) {
        throw notFoundError('Submission', args.submissionId)
      }
      if (submission.authorId !== ctx.user._id) {
        throw unauthorizedError('You can only view your own submissions')
      }
      return {
        _id: submission._id,
        _creationTime: submission._creationTime,
        title: submission.title,
        authors: submission.authors,
        abstract: submission.abstract,
        keywords: submission.keywords,
        status: submission.status,
        pdfFileName: submission.pdfFileName,
        pdfFileSize: submission.pdfFileSize,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
      }
    },
  ),
})

/**
 * Lists all submissions for editors with pagination and optional status filter.
 * Enriches each submission with reviewer summary and triage severity.
 * Requires editor_in_chief, action_editor, or admin role.
 */
export const listForEditor = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(submissionStatusValidator),
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id('submissions'),
        _creationTime: v.number(),
        title: v.string(),
        status: submissionStatusValidator,
        authorId: v.id('users'),
        actionEditorId: v.optional(v.id('users')),
        updatedAt: v.number(),
        createdAt: v.number(),
        reviewerSummary: v.union(
          v.null(),
          v.object({
            total: v.number(),
            accepted: v.number(),
            submitted: v.number(),
            overdue: v.number(),
          }),
        ),
        highestTriageSeverity: v.union(
          v.null(),
          v.literal('low'),
          v.literal('medium'),
          v.literal('high'),
        ),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: {
        paginationOpts: { numItems: number; cursor: string | null }
        status?: SubmissionStatus
      },
    ) => {
      if (
        !EDITOR_ROLES.includes(
          ctx.user.role as (typeof EDITOR_ROLES)[number],
        )
      ) {
        throw unauthorizedError(
          'Requires editor, action editor, or admin role',
        )
      }

      const baseQuery = ctx.db.query('submissions')
      const results = args.status
        ? await baseQuery
            .withIndex('by_status', (idx) =>
              idx.eq('status', args.status!),
            )
            .paginate(args.paginationOpts)
        : await baseQuery
            .paginate(args.paginationOpts)

      const SEVERITY_ORDER = { high: 3, medium: 2, low: 1 } as const

      // Sort page by updatedAt descending (most recently changed first)
      const sortedPage = [...results.page].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      )

      const enrichedPage = await Promise.all(
        sortedPage.map(async (s) => {
          // Reviewer summary
          const reviews = await ctx.db
            .query('reviews')
            .withIndex('by_submissionId', (idx) =>
              idx.eq('submissionId', s._id),
            )
            .collect()
          const reviewerSummary =
            reviews.length > 0
              ? {
                  total: reviews.length,
                  accepted: reviews.filter((r) => r.status !== 'assigned')
                    .length,
                  submitted: reviews.filter(
                    (r) =>
                      r.status === 'submitted' || r.status === 'locked',
                  ).length,
                  overdue: reviews.filter(
                    (r) =>
                      r.status === 'in_progress' &&
                      Date.now() - r.createdAt > 28 * 24 * 60 * 60 * 1000,
                  ).length,
                }
              : null

          // Triage severity (highest across complete reports)
          const triageReports = await ctx.db
            .query('triageReports')
            .withIndex('by_submissionId', (idx) =>
              idx.eq('submissionId', s._id),
            )
            .collect()
          const completedReports = triageReports.filter(
            (r) => r.status === 'complete' && r.result,
          )
          let highestTriageSeverity: 'low' | 'medium' | 'high' | null =
            null
          for (const report of completedReports) {
            const sev = report.result!.severity
            if (
              !highestTriageSeverity ||
              SEVERITY_ORDER[sev] >
                SEVERITY_ORDER[highestTriageSeverity]
            ) {
              highestTriageSeverity = sev
            }
          }

          return {
            _id: s._id,
            _creationTime: s._creationTime,
            title: s.title,
            status: s.status,
            authorId: s.authorId,
            actionEditorId: s.actionEditorId,
            updatedAt: s.updatedAt,
            createdAt: s.createdAt,
            reviewerSummary,
            highestTriageSeverity,
          }
        }),
      )

      return {
        ...results,
        page: enrichedPage,
      }
    },
  ),
})
