# Story 5.3: Published Article Page with Dual Abstracts

## Story

**As a** public reader,
**I want** to read published articles with both author and reviewer abstracts in clean, web-first typography,
**So that** I can quickly assess whether the paper is worth reading.

## Status

**Epic:** 5 - Reviewer Abstract & Publication
**Status:** ready
**Priority:** High (delivers FR39, FR40, FR41, FR42, FR43 — published article page with dual abstracts, metadata, PDF download, reviewer attribution)
**Depends on:** Story 5.2 (author acceptance of reviewer abstract — provides `authorAccepted` flag that determines publication readiness), Story 5.1 (reviewer abstract drafting — provides `reviewerAbstracts` module and abstract content), Story 3.7 (editorial decisions — ACCEPTED/PUBLISHED status on submissions)

## Context

This story creates the public-facing published article page at `/article/$articleId`. It is the culmination of the editorial pipeline — the final output readers encounter. The page requires no authentication (Diamond Open Access, CC-BY 4.0) and displays the article with web-first typography, dual abstracts (reviewer abstract positioned prominently alongside the author abstract), full metadata, reviewer attribution, and PDF download.

**What exists today:**
- `convex/schema.ts` — `submissions` table with all needed fields (`title`, `authors`, `abstract`, `keywords`, `status`, `pdfStorageId`, `pdfFileName`, `pdfFileSize`, `decidedAt`, `createdAt`, `updatedAt`); `reviewerAbstracts` table with `content`, `wordCount`, `isSigned`, `status`, `authorAccepted`, `authorAcceptedAt`, `reviewerId`, indexes `by_submissionId`, `by_submissionId_reviewerId`
- `convex/submissions.ts` — `getByIdForEditor` query (shows pattern for `ctx.storage.getUrl` to generate PDF serving URL); `listForEditor` query with pagination and status filter; `getById` (author-only query)
- `convex/reviewerAbstracts.ts` — `getBySubmission` query (returns `reviewerName`, `isSigned`, `authorAccepted`, etc. — requires auth, uses `withUser` wrapper)
- `convex/invitations.ts` — `getInviteStatus` query pattern for public queries (no auth wrapper, direct handler)
- `convex/helpers/transitions.ts` — `submissionStatusValidator` including `PUBLISHED`; PUBLISHED is a terminal state reachable only from ACCEPTED
- `convex/helpers/errors.ts` — `notFoundError` helper
- `app/routes/article/route.tsx` — layout applying `data-mode="reader"` (warm cream background), `ErrorBoundary` + `Suspense` with `<RouteSkeleton variant="centered" />`
- `app/routes/article/index.tsx` — placeholder "No published articles yet" empty state
- `app/features/submissions/submission-detail.tsx` — author's submission detail with abstract, authors, keywords (layout pattern reference)
- `app/features/submissions/abstract-review-panel.tsx` — author abstract review panel (layout pattern reference for displaying reviewer abstract)
- `app/features/submissions/status-utils.ts` — `formatDate` utility (reusable)
- `app/components/ui/badge.tsx`, `button.tsx`, `separator.tsx` — shadcn/ui components (all installed)
- `app/styles/globals.css` — `[data-mode="reader"]` CSS overrides for warm cream palette

**What this story builds:**
1. New `convex/articles.ts` module — public queries for listing and fetching published articles (no auth wrappers)
2. `getPublishedArticle` query — fetches a single published article with submission data, reviewer abstract, reviewer name, and PDF serving URL
3. `listPublished` query — fetches paginated list of published articles for the index page
4. New `app/features/article/` feature folder with barrel export
5. New `app/features/article/article-page.tsx` — `ArticlePage` component with full article layout
6. New `app/features/article/dual-abstract-display.tsx` — `DualAbstractDisplay` component for reviewer + author abstracts
7. New `app/features/article/article-metadata.tsx` — `ArticleMetadata` component for authors, date, DOI placeholder, CC-BY badge, PDF download
8. New `app/routes/article/$articleId.tsx` — route for individual published article pages
9. Updated `app/routes/article/index.tsx` — replace empty state with paginated list of published articles

**Key architectural decisions:**

- **New `convex/articles.ts` module with public queries:** Published article queries do NOT use any auth wrapper (`withUser`, etc.). They use a direct handler: `handler: async (ctx, args) => { ... }`, matching the `getInviteStatus` pattern in `convex/invitations.ts`. This is the only Convex file with unauthenticated queries — justified because published articles are Diamond Open Access (CC-BY 4.0, no login required).

- **Single query for article data:** The `getPublishedArticle` query fetches the submission, the reviewer abstract (if approved + author-accepted), and the PDF serving URL in one round-trip. This avoids multiple client-side queries and ensures the page renders in a single reactive subscription. The query validates `status === 'PUBLISHED'` server-side — if the submission exists but isn't published, it throws `notFoundError`.

- **Reviewer abstract display condition:** The reviewer abstract is displayed only when `abstract.status === 'approved' && abstract.authorAccepted === true`. If the abstract exists but doesn't meet both conditions, it's omitted from the public page. The `DualAbstractDisplay` component handles both the `full` state (both abstracts) and `author-only` state (no reviewer abstract yet).

- **DualAbstractDisplay as a standalone component:** Matches the UX spec's `DualAbstractDisplay` component definition. The reviewer abstract is positioned first with elevated surface and subtle left border accent. The author abstract follows on a neutral surface. Both use Newsreader serif font.

- **Reader mode typography:** Article body renders at `text-lg` (18px) with `leading-[1.7]` (1.7 line height) and `max-w-prose` (75ch max-width). The entire page uses Newsreader serif (`font-serif`) for content, and the `data-mode="reader"` attribute on the layout provides the warm cream background.

- **PDF download without login:** The `getPublishedArticle` query generates a PDF serving URL via `ctx.storage.getUrl(pdfStorageId)`. The download button renders as a simple `<a href={pdfUrl} download>` link. No authentication check — published PDFs are publicly accessible.

- **Feature folder pattern:** New `app/features/article/` folder with `article-page.tsx`, `dual-abstract-display.tsx`, `article-metadata.tsx`, and `index.ts` barrel export. This follows the established pattern (`app/features/submissions/`, `app/features/editor/`, etc.).

- **No separate `publishedAt` schema field:** The `decidedAt` timestamp on the submission serves as the publication date (the decision to accept is the effective publication milestone). No schema change is needed.

**Key architectural references:**
- UX spec: DualAbstractDisplay — reviewer abstract positioned first or equally prominent, elevated surface with left border accent
- UX spec: Reader mode — warmest palette, cream/ivory background, Newsreader serif, minimal chrome
- UX spec: Typography — text-lg (18px), leading-relaxed (1.7), max 75ch per line
- FR39: Web-first article pages with serif body font, 16px+ base size, 1.5+ line height, max 75 characters per line
- FR40: Published articles display both author abstract and reviewer abstract
- FR41: Published articles show metadata: authors, publication date, DOI placeholder, CC-BY badge
- FR42: Published articles offer PDF download
- FR43: Published articles display reviewer attribution (signed or anonymous)
- Architecture: No unauthenticated Convex functions except published article queries

## Acceptance Criteria

### AC1: Published article page at `/article/$articleId` with no auth required
**Given** a published article (submission with status `PUBLISHED`)
**When** a reader navigates to `/article/$articleId`
**Then:**
- The page renders in reader mode with warm cream background (via `data-mode="reader"` on the article layout)
- No authentication is required — the page is publicly accessible
- If the article ID doesn't exist or the submission is not in `PUBLISHED` status, a "not found" error is displayed
- The article route uses `$articleId` as the parameter name, where the value is a Convex submission `_id`

### AC2: DualAbstractDisplay with reviewer abstract first
**Given** a published article with an approved, author-accepted reviewer abstract
**When** the page renders
**Then:**
- A `DualAbstractDisplay` component shows two stacked sections
- The reviewer abstract is positioned first, labeled "Reviewer Abstract" with a subtle left border accent on an elevated surface (`bg-accent/50` or similar)
- The reviewer abstract text is rendered in Newsreader serif font (`font-serif text-lg leading-[1.7]`)
- Reviewer attribution shows below: the reviewer's name if signed, or "Anonymous Reviewer" if unsigned
- The author abstract follows, labeled "Abstract" on a neutral surface
- The author abstract text is rendered in the same serif font
- Each abstract section uses `<section>` with `aria-labelledby` pointing to its heading for accessibility

### AC3: Article metadata (authors, date, DOI, CC-BY badge)
**Given** the article page
**When** metadata renders
**Then:**
- Authors are displayed with names and affiliations
- Publication date shows the `decidedAt` timestamp formatted as a readable date (falls back to `createdAt` if `decidedAt` is not set)
- A DOI placeholder shows: "DOI: 10.xxxx/aj.2026.001" (static placeholder text - not per-article DOI generation)
- A CC-BY 4.0 badge is displayed with appropriate text
- The metadata section appears below the title, before the abstracts

### AC4: PDF download with no login required
**Given** the article page
**When** the reader wants the PDF
**Then:**
- A "Download PDF" button is prominently displayed
- The button links directly to the Convex storage URL for the PDF
- Clicking downloads the PDF immediately with no login required
- The button shows the file name and size if available

### AC5: Reviewer attribution (signed or anonymous)
**Given** a published article with a reviewer abstract
**When** the reviewer attribution renders
**Then:**
- If the reviewer chose to sign (`isSigned: true`), their name is displayed
- If the reviewer chose to remain anonymous (`isSigned: false`), "Anonymous Reviewer" is shown
- The attribution appears below the reviewer abstract text

### AC6: Article body typography
**Given** the article page
**When** the content renders
**Then:**
- The article title uses `font-serif text-3xl font-bold tracking-tight`
- The article body (abstracts) render at `text-lg` (18px) with `leading-[1.7]` (1.7 line height)
- The content area has `max-w-prose` (approximately 75ch max-width) for optimal reading
- The overall page uses generous margins (`py-16 px-6` on the main content area)

## Technical Notes

### New `convex/articles.ts` module

Create a new file (default runtime, no `"use node"`):

1. **`getPublishedArticle` query** (NO auth wrapper — public):
   - Args: `{ articleId: v.id('submissions') }`
   - Fetches the submission by ID
   - Validates `submission.status === 'PUBLISHED'` — throws `notFoundError('Article')` if not published
   - Generates PDF URL via `ctx.storage.getUrl(submission.pdfStorageId)` if storageId exists
   - Fetches the reviewer abstract via `by_submissionId` index — only includes it if `status === 'approved'` AND `authorAccepted === true`
   - If abstract meets display criteria, fetches the reviewer user record for the name
   - Returns: `v.object({ ... })` with submission data, optional reviewer abstract, PDF URL
   - Return type:
     ```
     {
       _id: Id<'submissions'>
       title: string
       authors: Array<{ name: string; affiliation: string }>
       abstract: string
       keywords: Array<string>
       pdfUrl: string | null
       pdfFileName: string | undefined
       pdfFileSize: number | undefined
       decidedAt: number | undefined  // Primary publication date
       createdAt: number               // Fallback if decidedAt not set
       reviewerAbstract: {
         content: string
         reviewerName: string
         isSigned: boolean
       } | null
     }
     ```

2. **`listPublished` query** (NO auth wrapper — public):
   - Args: `{ paginationOpts: paginationOptsValidator }`
   - Queries `submissions` with `by_status` index filtering for `PUBLISHED`
   - Returns paginated results with: `_id`, `title`, `authors`, `abstract` (first 300 chars for preview), `decidedAt`, `createdAt`
   - No reviewer abstract data in list view (fetched per-article)

### New `app/features/article/` feature folder

1. **`dual-abstract-display.tsx`** — `DualAbstractDisplay` component:
   - Props: `{ authorAbstract: string; reviewerAbstract?: { content: string; reviewerName: string; isSigned: boolean } | null }`
   - If `reviewerAbstract` is provided:
     - First section: "Reviewer Abstract" with left border accent, elevated background
     - Attribution: reviewer name or "Anonymous Reviewer"
     - Second section: "Abstract" (author) on neutral background
   - If no `reviewerAbstract`:
     - Single section: "Abstract" (author only)
   - Both abstracts use `font-serif text-lg leading-[1.7]`
   - Each section uses `<section aria-labelledby={headingId}>` for accessibility

2. **`article-metadata.tsx`** — `ArticleMetadata` component:
   - Props: `{ authors: Array<{ name: string; affiliation: string }>; decidedAt?: number; pdfUrl: string | null; pdfFileName?: string; pdfFileSize?: number }`
   - Displays:
     - Authors with names and affiliations
     - Publication date (formatted from `decidedAt`)
     - DOI placeholder: "DOI: 10.xxxx/aj.2026.001"
     - CC-BY 4.0 badge (text)
     - PDF download button (if `pdfUrl` is available)

3. **`article-page.tsx`** — `ArticlePage` component:
   - Props: `{ articleId: Id<'submissions'> }`
   - Calls `useQuery(api.articles.getPublishedArticle, { articleId })`
   - Renders: title, metadata, dual abstract display, keywords
   - Layout: `<main className="mx-auto max-w-prose px-6 py-16">`
   - If query returns `undefined`, returns `null` (Suspense handles loading)

4. **`index.ts`** — barrel exports

### New route `app/routes/article/$articleId.tsx`

- Creates the TanStack Router file route: `createFileRoute('/article/$articleId')`
- Renders `<ArticlePage articleId={params.articleId as Id<'submissions'>} />`
- The `articleId` param is the Convex submission `_id` string

### Updated `app/routes/article/index.tsx`

- Replace the empty state with a live list of published articles
- Use `usePaginatedQuery(api.articles.listPublished, {}, { initialNumItems: 10 })`
- Show each article as a clickable card/link to `/article/$articleId`
- If no published articles, show the existing empty state
- Each card shows: title, first 2 authors, publication date, abstract preview (first 200 chars)

### Files to create

```
convex/articles.ts                               — NEW: public queries for published articles
app/features/article/dual-abstract-display.tsx   — NEW: dual abstract display component
app/features/article/article-metadata.tsx        — NEW: article metadata (authors, date, DOI, CC-BY, PDF)
app/features/article/article-page.tsx            — NEW: full article page component
app/features/article/index.ts                    — NEW: barrel exports
app/routes/article/$articleId.tsx                 — NEW: article detail route
```

### Files to modify

```
app/routes/article/index.tsx                     — MODIFY: replace empty state with published article list
```

### Implementation sequence

1. **Create `convex/articles.ts`** — `getPublishedArticle` and `listPublished` queries with public access (no auth wrapper).

2. **Create `app/features/article/dual-abstract-display.tsx`** — the `DualAbstractDisplay` component with reviewer-first layout, elevated surface, left border accent, and accessibility sections.

3. **Create `app/features/article/article-metadata.tsx`** — the `ArticleMetadata` component with authors, publication date, DOI placeholder, CC-BY badge, PDF download button.

4. **Create `app/features/article/article-page.tsx`** — the `ArticlePage` component composing DualAbstractDisplay, ArticleMetadata, and article content with reader-mode typography.

5. **Create `app/features/article/index.ts`** — barrel exports for all article components.

6. **Create `app/routes/article/$articleId.tsx`** — the TanStack Router route rendering `ArticlePage`.

7. **Update `app/routes/article/index.tsx`** — replace empty state with paginated list using `usePaginatedQuery(api.articles.listPublished)`.

8. **Verify typecheck, lint, and build** — `bun run typecheck`, `bun run lint`, `bun run build`.

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`, `usePaginatedQuery`
- Import from `~/components/ui/` for shadcn components
- Import from `~/features/article` for feature components (barrel export)
- Import from `convex/_generated/api` for API references
- Import `formatDate` from `~/features/submissions/status-utils` (cross-feature, already established)

### shadcn/ui components to use

- `Button` — PDF download action (already installed)
- `Badge` — keywords, CC-BY badge (already installed)
- `Separator` — section dividers (already installed)
- lucide-react icons: `Download`, `Calendar`, `Users`, `Tag`, `FileText`, `ExternalLink`, `Scale` (note: lucide-react exports without "Icon" suffix)

### Component data flow

```
$articleId.tsx (route)
  └─ <ArticlePage articleId={params.articleId} />
       ├─ useQuery(api.articles.getPublishedArticle, { articleId })
       │    → { title, authors, abstract, keywords, pdfUrl, pdfFileName,
       │        pdfFileSize, decidedAt, createdAt, reviewerAbstract }
       ├─ Title (font-serif text-3xl)
       ├─ <ArticleMetadata
       │    authors={data.authors}
       │    decidedAt={data.decidedAt}
       │    pdfUrl={data.pdfUrl}
       │    pdfFileName={data.pdfFileName}
       │    pdfFileSize={data.pdfFileSize}
       │  />
       │    ├─ Author list with affiliations
       │    ├─ Publication date
       │    ├─ DOI placeholder
       │    ├─ CC-BY 4.0 badge
       │    └─ PDF download button
       ├─ <DualAbstractDisplay
       │    authorAbstract={data.abstract}
       │    reviewerAbstract={data.reviewerAbstract}
       │  />
       │    ├─ Section "Reviewer Abstract" (elevated, left border, reviewer name)
       │    └─ Section "Abstract" (neutral surface, author names)
       └─ Keywords section
```

### Article index data flow

```
/article/index.tsx (route)
  ├─ usePaginatedQuery(api.articles.listPublished)
  │    → { page: [{ _id, title, authors, abstractPreview, decidedAt }], isDone, ... }
  ├─ Article list (cards/links)
  │    └─ <Link to="/article/$articleId" params={{ articleId: article._id }}>
  │         ├─ Title
  │         ├─ Authors (first 2)
  │         ├─ Publication date
  │         └─ Abstract preview (200 chars)
  └─ "Load more" button if !isDone
```

### Public query pattern (from `getInviteStatus`)

```typescript
// NO auth wrapper — public query
export const getPublishedArticle = query({
  args: { articleId: v.id('submissions') },
  returns: v.object({ ... }),
  handler: async (ctx, args) => {
    // Direct handler, no withUser wrapper
    const submission = await ctx.db.get('submissions', args.articleId)
    if (!submission || submission.status !== 'PUBLISHED') {
      throw notFoundError('Article')
    }
    // ... fetch PDF URL, reviewer abstract, etc.
  },
})
```

### PDF serving URL pattern (from `getByIdForEditor`)

```typescript
const pdfUrl = submission.pdfStorageId
  ? await ctx.storage.getUrl(submission.pdfStorageId)
  : null
```

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Unpublished submission accessed via direct URL | Data leak | `getPublishedArticle` validates `status === 'PUBLISHED'` server-side; throws notFoundError otherwise |
| Reviewer abstract displayed before author acceptance | Premature disclosure | Query only includes abstract when `status === 'approved' && authorAccepted === true` |
| PDF storage URL expired or unavailable | Broken download | `ctx.storage.getUrl` generates temporary URLs; Convex handles URL refreshing via reactive query |
| No published articles in the system | Empty article index | Existing empty state preserved as fallback when `page.length === 0` |
| `decidedAt` not set on PUBLISHED submissions | Missing publication date | Falls back to `createdAt` if `decidedAt` is undefined |
| `articleId` param type mismatch | Runtime error | TanStack Router provides `articleId` as string; Convex `v.id('submissions')` accepts string — validated server-side |

### Dependencies on this story

- **Story 7.3 (Seed Data):** Seeds at least 1 published article viewable at `/article/$id`.

### What "done" looks like

- `convex/articles.ts` exists with `getPublishedArticle` and `listPublished` queries — both public (no auth wrapper)
- All new Convex functions define `args` and `returns` validators
- `app/features/article/` folder created with `dual-abstract-display.tsx`, `article-metadata.tsx`, `article-page.tsx`, `index.ts`
- `app/routes/article/$articleId.tsx` renders the article page
- `app/routes/article/index.tsx` lists published articles with pagination
- Published article page renders with:
  - Reader mode warm cream background
  - Newsreader serif typography throughout
  - `text-lg` (18px) with `leading-[1.7]` line height and `max-w-prose` (75ch) width
  - DualAbstractDisplay with reviewer abstract first (elevated surface, left border accent) and author abstract second (neutral surface)
  - Article metadata: authors, publication date, DOI placeholder, CC-BY 4.0 badge
  - PDF download button (no login required)
  - Reviewer attribution: signed name or "Anonymous Reviewer"
  - Keywords displayed as badges
- No authentication required for any article page
- `getPublishedArticle` rejects non-PUBLISHED submissions with notFoundError
- Reviewer abstract only displayed when `status === 'approved' && authorAccepted === true`
- `bunx convex dev --once` succeeds
- `bun run build` succeeds
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- **Public queries are the exception:** Only `convex/articles.ts` and `convex/invitations.ts` (`getInviteStatus`) have public queries. Every other Convex module uses auth wrappers.
- **`decidedAt` as publication date:** There's no `publishedAt` field in the schema. The `decidedAt` timestamp (set when the editor accepts) is the closest available. Use `decidedAt ?? createdAt` as a fallback for display.
- **`max-w-prose` vs. spec requirement:** The Tailwind `max-w-prose` utility sets `max-width: 65ch` by default, but the spec requires 75ch for optimal reading. Use `max-w-[75ch]` instead to match the spec exactly.
- **Convex storage URLs:** `ctx.storage.getUrl()` returns a temporary signed URL that Convex auto-refreshes via reactive queries. The URL doesn't need to be cached or managed by the client.
- **PDF download link:** Use `<a href={pdfUrl} download={pdfFileName}>` for direct download behavior. Wrap in a `Button` component for consistent styling.
- **Reviewer abstract display logic:** The `getPublishedArticle` query handles the filtering — if the abstract doesn't meet both conditions (`approved` + `authorAccepted`), the `reviewerAbstract` field is `null` in the response. The frontend simply checks `if (data.reviewerAbstract)`.
- **Article index pagination:** Use `usePaginatedQuery` from `convex/react` with `initialNumItems: 10`. Show a "Load more" button when `!isDone`. The article index is a light list — no need for complex card layouts.
- **Cross-feature import:** Import `formatDate` from `~/features/submissions/status-utils` — this is a shared utility already used across features.
- **Accessibility:** Each abstract section uses `<section aria-labelledby={id}>` with a heading. The page should have a clear heading hierarchy: `<h1>` for the article title, `<h2>` for section headings (Reviewer Abstract, Abstract, Keywords, etc.).
- **No article body content:** The published article page shows metadata, abstracts, and keywords — NOT the full paper text. The full paper is available via PDF download. This matches the typical academic journal pattern where the web page serves as a landing page with abstracts and metadata.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 5 spec | Sprint Agent |
