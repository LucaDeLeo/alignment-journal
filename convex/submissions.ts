import { v } from 'convex/values'

import { mutation, query } from './_generated/server'
import { withAuthor, withUser } from './helpers/auth'
import { notFoundError, unauthorizedError } from './helpers/errors'
import { submissionStatusValidator } from './helpers/transitions'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

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
      return await ctx.db.insert('submissions', {
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
