"use node";

import { v } from 'convex/values'
import { extractText } from 'unpdf'

import { action } from './_generated/server'
import { internal } from './_generated/api'
import { withUser } from './helpers/auth'
import { unauthorizedError } from './helpers/errors'

import type { Doc, Id } from './_generated/dataModel'
import type { ActionCtx } from './_generated/server'

const MAX_EXTRACTED_TEXT_LENGTH = 200_000

/** Roles allowed to trigger PDF text extraction. */
const EXTRACTION_ROLES = ['reviewer', 'admin'] as const

/**
 * Extracts text from a submission's PDF and caches it on the submission record.
 * Uses withUser + manual role check (actions can't use withReviewer).
 * Errors are caught — frontend detects missing text via the query.
 */
export const extractPdfText = action({
  args: { submissionId: v.id('submissions') },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: ActionCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      if (
        !EXTRACTION_ROLES.includes(
          ctx.user.role as (typeof EXTRACTION_ROLES)[number],
        )
      ) {
        throw unauthorizedError('Requires reviewer or admin role')
      }

      try {
        const submission = await ctx.runQuery(
          internal.pdfExtraction.getSubmissionInternal,
          { submissionId: args.submissionId },
        )

        if (!submission) return null

        // Already cached — skip extraction
        if (submission.extractedText) return null

        if (!submission.pdfStorageId) return null

        const pdfUrl = await ctx.storage.getUrl(submission.pdfStorageId)
        if (!pdfUrl) return null

        const pdfResponse = await fetch(pdfUrl)
        const pdfBuffer = await pdfResponse.arrayBuffer()
        const { text } = await extractText(new Uint8Array(pdfBuffer), {
          mergePages: true,
        })

        if (!text || text.trim().length === 0) return null

        const truncatedText = text.slice(0, MAX_EXTRACTED_TEXT_LENGTH)

        await ctx.runMutation(
          internal.pdfExtraction.writeExtractedText,
          {
            submissionId: args.submissionId,
            extractedText: truncatedText,
          },
        )
      } catch {
        // Errors are silently caught — frontend detects missing text
        // and shows the download fallback
        console.error(
          `PDF extraction failed for submission ${args.submissionId}`,
        )
      }

      return null
    },
  ),
})
