# ATDD Checklist: 4-2 Split-View Review Workspace with Inline PDF

## AC1: Review list page shows assigned submissions
- [ ] `listByReviewer` query returns reviews for authenticated reviewer with submission title and status
- [ ] Each item includes: paper title, submission status, review status, creation date
- [ ] Empty state shown when no reviews assigned
- [ ] Query uses `withUser` + manual reviewer role check
- [ ] Query defines both `args` and `returns` validators

## AC2: Split-view layout with paper panel and review panel
- [ ] `ResizablePanelGroup` renders two panels side-by-side
- [ ] Left panel defaults to 55% width, minimum 30%
- [ ] Right panel defaults to 45% width, minimum 25%
- [ ] Vertical resize handle present between panels
- [ ] Both panels scroll independently via `ScrollArea`

## AC3: Paper panel renders submission content inline
- [ ] Paper renders as web content (NOT PDF embed/iframe)
- [ ] Typography: Newsreader serif, text-lg, leading-[1.7], max-w-prose
- [ ] Content includes title (h1), authors, abstract, body text
- [ ] Body text from extracted PDF via `extractPdfText` action
- [ ] Loading skeleton shown during extraction
- [ ] PDF download link always available as fallback

## AC4: Workspace header with breadcrumb and confidentiality badge
- [ ] Breadcrumb: "Reviews / [Paper Title]" with link to `/review/`
- [ ] ConfidentialityBadge: green pill "Hidden from authors" with green dot
- [ ] Badge has `role="status"` and `aria-live="polite"`
- [ ] Badge is NOT dismissible

## AC5: Review panel with tab navigation (placeholder content)
- [ ] Three tabs: "Write Review", "Discussion", "Guidelines"
- [ ] Write Review (default): placeholder with ProgressRing showing "0/5"
- [ ] Discussion: placeholder message
- [ ] Guidelines: static review guidelines text

## AC6: Review status auto-transition to in_progress
- [ ] `startReview` mutation transitions from `assigned` to `in_progress`
- [ ] Sets `updatedAt` to `Date.now()`
- [ ] No-op if already `in_progress` (idempotent)
- [ ] Uses `withReviewer` wrapper for assignment-aware auth
- [ ] Defines both `args` and `returns` validators

## AC7: PDF text extraction and caching
- [ ] `extractPdfText` action fetches PDF from Convex storage
- [ ] Extracts text via `unpdf` `extractText` with `{ mergePages: true }`
- [ ] Writes extracted text to submission's `extractedText` field
- [ ] Subsequent loads use cached `extractedText`
- [ ] Text truncated to 200,000 characters maximum
- [ ] Error shown if extraction fails with download fallback

## AC8: Responsive collapse below 880px
- [ ] Below 880px: tabbed full-width layout with "Paper" and "Review" tabs
- [ ] Above 880px: split-view side-by-side layout
- [ ] Layout switches dynamically on resize

## Schema
- [ ] `extractedText: v.optional(v.string())` added to `submissions` table

## Convex Functions
- [ ] `convex/reviews.ts` created with `listByReviewer`, `getSubmissionForReviewer`, `startReview`
- [ ] `convex/pdfExtraction.ts` created with `extractPdfText` action + internal helpers
- [ ] All functions define `args` and `returns` validators

## Components
- [ ] `app/features/review/` folder created with barrel export
- [ ] shadcn/ui `resizable`, `scroll-area`, `tabs` installed
- [ ] Typecheck passes
- [ ] Lint passes
