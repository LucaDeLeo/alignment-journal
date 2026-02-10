import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'

import { query } from './_generated/server'
import { notFoundError } from './helpers/errors'

/**
 * Fetches a single published article by submission ID.
 * Public query — no auth wrapper (Diamond Open Access, CC-BY 4.0).
 * Rejects non-PUBLISHED submissions with notFoundError.
 */
export const getPublishedArticle = query({
  args: { articleId: v.id('submissions') },
  returns: v.object({
    _id: v.id('submissions'),
    title: v.string(),
    authors: v.array(v.object({ name: v.string(), affiliation: v.string() })),
    abstract: v.string(),
    keywords: v.array(v.string()),
    extractedText: v.optional(v.string()),
    extractedHtml: v.optional(v.string()),
    pdfUrl: v.union(v.null(), v.string()),
    pdfFileName: v.optional(v.string()),
    pdfFileSize: v.optional(v.number()),
    decidedAt: v.optional(v.number()),
    createdAt: v.number(),
    reviewerAbstract: v.union(
      v.null(),
      v.object({
        content: v.string(),
        reviewerName: v.string(),
        isSigned: v.boolean(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get('submissions', args.articleId)
    if (!submission || submission.status !== 'PUBLISHED') {
      throw notFoundError('Article')
    }

    const pdfUrl = submission.pdfStorageId
      ? await ctx.storage.getUrl(submission.pdfStorageId)
      : null

    // Fetch reviewer abstract — only include if approved AND author-accepted
    let reviewerAbstract: {
      content: string
      reviewerName: string
      isSigned: boolean
    } | null = null

    const abstract = await ctx.db
      .query('reviewerAbstracts')
      .withIndex('by_submissionId', (q) =>
        q.eq('submissionId', args.articleId),
      )
      .unique()

    if (
      abstract &&
      abstract.status === 'approved' &&
      abstract.authorAccepted === true
    ) {
      const reviewer = await ctx.db.get('users', abstract.reviewerId)
      reviewerAbstract = {
        content: abstract.content,
        reviewerName: abstract.isSigned
          ? (reviewer?.name ?? 'Unknown')
          : 'Anonymous Reviewer',
        isSigned: abstract.isSigned,
      }
    }

    return {
      _id: submission._id,
      title: submission.title,
      authors: submission.authors,
      abstract: submission.abstract,
      extractedText: submission.extractedText,
      extractedHtml: submission.extractedHtml,
      keywords: submission.keywords,
      pdfUrl,
      pdfFileName: submission.pdfFileName,
      pdfFileSize: submission.pdfFileSize,
      decidedAt: submission.decidedAt,
      createdAt: submission.createdAt,
      reviewerAbstract,
    }
  },
})

/**
 * Lists published articles with pagination.
 * Public query — no auth wrapper (Diamond Open Access, CC-BY 4.0).
 */
export const listPublished = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id('submissions'),
        title: v.string(),
        authors: v.array(
          v.object({ name: v.string(), affiliation: v.string() }),
        ),
        abstractPreview: v.string(),
        decidedAt: v.optional(v.number()),
        createdAt: v.number(),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
    pageStatus: v.optional(
      v.union(
        v.literal('SplitRecommended'),
        v.literal('SplitRequired'),
        v.null(),
      ),
    ),
    splitCursor: v.optional(v.union(v.string(), v.null())),
  }),
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query('submissions')
      .withIndex('by_status', (idx) => idx.eq('status', 'PUBLISHED'))
      .paginate(args.paginationOpts)

    const page = results.page.map((s) => ({
      _id: s._id,
      title: s.title,
      authors: s.authors,
      abstractPreview: s.abstract.slice(0, 300),
      decidedAt: s.decidedAt,
      createdAt: s.createdAt,
    }))

    return {
      ...results,
      page,
    }
  },
})
