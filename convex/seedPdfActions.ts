"use node";

import { v } from 'convex/values'
import { parse } from 'node-html-parser'
import { extractText } from 'unpdf'

import { internalAction } from './_generated/server'
import { internal } from './_generated/api'

const MAX_EXTRACTED_TEXT_LENGTH = 200_000

/** Tags to strip from ar5iv HTML body. */
const STRIP_TAGS = [
  'script',
  'style',
  'nav',
  'header',
  'footer',
  'aside',
  'button',
  'form',
  'noscript',
  'iframe',
]

/** Attributes to keep on elements; all others are removed. */
const KEEP_ATTRS = new Set(['href', 'src', 'alt', 'colspan', 'rowspan'])

/**
 * Fetches the ar5iv HTML rendering for an arXiv paper and returns cleaned
 * semantic HTML (headings, paragraphs, lists, tables, math).
 */
async function fetchAr5ivHtml(arxivId: string): Promise<string | undefined> {
  try {
    const response = await fetch(`https://ar5iv.labs.arxiv.org/html/${arxivId}`)
    if (!response.ok) {
      console.warn(
        `[seedPdf] Failed to fetch ar5iv HTML for ${arxivId}: ${response.status}`,
      )
      return undefined
    }

    const html = await response.text()
    const root = parse(html)

    // Find the article body — ar5iv uses <article> or .ltx_document
    let body = root.querySelector('article')
      ?? root.querySelector('.ltx_document')
      ?? root.querySelector('.ltx_page_main')
    if (!body) {
      console.warn(`[seedPdf] No article body found in ar5iv HTML for ${arxivId}`)
      return undefined
    }

    // Strip unwanted elements
    for (const tag of STRIP_TAGS) {
      body.querySelectorAll(tag).forEach((el) => el.remove())
    }
    // Strip banner/navigation/chrome divs
    body.querySelectorAll('.ltx_page_header, .ltx_page_footer, .ltx_page_logo, .ltx_dates, .ltx_role_affiliationtext').forEach((el) => el.remove())

    // Strip title, authors, abstract (already shown in page header)
    body.querySelectorAll('.ltx_title_document, .ltx_creator, .ltx_authors, .ltx_abstract').forEach((el) => el.remove())

    // Strip bibliography and appendices
    body.querySelectorAll('.ltx_bibliography, .ltx_appendix').forEach((el) => el.remove())

    // Strip leading non-section children (LaTeX preamble, macro defs)
    // These appear as divs/paragraphs before the first <section> containing
    // raw LaTeX like \NewEnviron, \BODY, etc.
    const topChildren = body.childNodes
    for (let i = topChildren.length - 1; i >= 0; i--) {
      const child = topChildren[i]
      if (child.nodeType === 1) {
        const el = child as unknown as ReturnType<typeof root.querySelector>
        if (!el) continue
        // Keep section elements (the actual paper content)
        if (el.rawTagName?.toLowerCase() === 'section') continue
        // Remove elements before first section that look like preamble
        const text = el.textContent.trim()
        if (text.length === 0 || /^[\\{}a-zA-Z\s]*$/.test(text)) {
          el.remove()
        }
      } else if (child.nodeType === 3) {
        // Remove bare text nodes with LaTeX commands
        const text = (child as unknown as { rawText: string }).rawText?.trim() ?? ''
        if (text.length === 0 || /^[\\{}a-zA-Z\s]*$/.test(text)) {
          child.remove()
        }
      }
    }

    // Also strip sections whose heading contains "Appendix" (some papers
    // use a regular section instead of \appendix)
    for (const section of body.querySelectorAll('section')) {
      const heading = section.querySelector('h1, h2, h3, h4, h5, h6')
      if (heading && /\bappendix\b/i.test(heading.textContent)) {
        section.remove()
      }
    }

    // Rewrite relative image src to absolute ar5iv URLs
    const ar5ivBase = `https://ar5iv.labs.arxiv.org`
    for (const img of body.querySelectorAll('img')) {
      const src = img.getAttribute('src')
      if (src && src.startsWith('/')) {
        img.setAttribute('src', `${ar5ivBase}${src}`)
      } else if (src && !src.startsWith('http')) {
        img.setAttribute('src', `${ar5ivBase}/html/${arxivId}/${src}`)
      }
    }

    // Strip class/id/data-* attributes, keep only semantic ones
    for (const el of body.querySelectorAll('*')) {
      const attrs = el.attributes
      for (const key of Object.keys(attrs)) {
        if (!KEEP_ATTRS.has(key)) {
          el.removeAttribute(key)
        }
      }
    }

    let cleaned = body.innerHTML.trim()

    cleaned = cleaned.trim()
    if (cleaned.length < 100) {
      console.warn(`[seedPdf] ar5iv HTML too short for ${arxivId} (${cleaned.length} chars)`)
      return undefined
    }

    console.log(`[seedPdf] Fetched ar5iv HTML for ${arxivId} (${(cleaned.length / 1024).toFixed(0)} KB)`)
    return cleaned
  } catch (err) {
    console.warn(`[seedPdf] ar5iv HTML fetch failed for ${arxivId}:`, err)
    return undefined
  }
}

/**
 * Fetches real arXiv PDFs, stores them in Convex storage, extracts text,
 * and patches submission records with PDF metadata.
 */
export const uploadArxivPdfs = internalAction({
  args: {
    entries: v.array(
      v.object({
        submissionId: v.id('submissions'),
        arxivId: v.string(),
        fileName: v.string(),
      }),
    ),
  },
  returns: v.number(),
  handler: async (ctx, { entries }) => {
    let successCount = 0

    for (const entry of entries) {
      try {
        // Fetch PDF from arXiv
        const response = await fetch(
          `https://arxiv.org/pdf/${entry.arxivId}.pdf`,
        )
        if (!response.ok) {
          console.warn(
            `[seedPdf] Failed to fetch arXiv PDF ${entry.arxivId}: ${response.status}`,
          )
          continue
        }

        const pdfBytes = new Uint8Array(await response.arrayBuffer())
        const pdfFileSize = pdfBytes.length

        // Store in Convex file storage
        const blob = new Blob([pdfBytes], { type: 'application/pdf' })
        const storageId = await ctx.storage.store(blob)

        // Extract text
        let extractedText = ''
        let pageCount = 0
        try {
          const result = await extractText(pdfBytes, { mergePages: true })
          extractedText = result.text.slice(0, MAX_EXTRACTED_TEXT_LENGTH)
          pageCount = result.totalPages
        } catch (extractErr) {
          console.warn(
            `[seedPdf] Text extraction failed for ${entry.arxivId}, storing PDF without text`,
          )
        }

        // Fetch ar5iv HTML rendering
        const extractedHtml = await fetchAr5ivHtml(entry.arxivId)

        // Patch the submission record
        await ctx.runMutation(internal.seed.patchSubmissionPdf, {
          submissionId: entry.submissionId,
          pdfStorageId: storageId,
          pdfFileName: entry.fileName,
          pdfFileSize,
          pageCount,
          extractedText,
          extractedHtml,
        })

        successCount++
        console.log(
          `[seedPdf] Uploaded ${entry.fileName} (${(pdfFileSize / 1024 / 1024).toFixed(1)} MB, ${pageCount} pages)`,
        )

        // Small delay between fetches to be polite to arXiv
        if (entries.indexOf(entry) < entries.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      } catch (err) {
        console.warn(
          `[seedPdf] Failed to process arXiv PDF ${entry.arxivId}:`,
          err,
        )
      }
    }

    return successCount
  },
})
