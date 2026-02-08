# ATDD Checklist: 5-3 Published Article Page with Dual Abstracts

## AC1: Published article page at `/article/$articleId` with no auth required

- [x] `convex/articles.ts` `getPublishedArticle` query exists with no auth wrapper (public)
- [x] Query validates `status === 'PUBLISHED'` — throws `notFoundError('Article')` if not published
- [x] Query returns submission data: `_id`, `title`, `authors`, `abstract`, `keywords`
- [x] Query generates PDF URL via `ctx.storage.getUrl(pdfStorageId)` if available
- [x] Route `app/routes/article/$articleId.tsx` renders `ArticlePage` with `articleId` param
- [x] Article layout applies `data-mode="reader"` for warm cream background

## AC2: DualAbstractDisplay with reviewer abstract first

- [x] `DualAbstractDisplay` component renders reviewer abstract first when available
- [x] Reviewer abstract section has left border accent (`border-l-4 border-primary/40`) and elevated surface (`bg-accent/50`)
- [x] Reviewer abstract text uses `font-serif text-lg leading-[1.7]`
- [x] Reviewer attribution displayed below abstract text
- [x] Author abstract rendered in second section on neutral surface
- [x] Each section uses `<section>` with `aria-labelledby` pointing to its heading
- [x] When no reviewer abstract, only author abstract section is rendered

## AC3: Article metadata (authors, date, DOI, CC-BY badge)

- [x] `ArticleMetadata` component renders authors with names and affiliations
- [x] Publication date shows `decidedAt` timestamp, falls back to `createdAt`
- [x] DOI placeholder displays "DOI: 10.xxxx/aj.2026.001"
- [x] CC-BY 4.0 badge displayed
- [x] Metadata section appears below the title, before the abstracts

## AC4: PDF download with no login required

- [x] PDF download button rendered when `pdfUrl` is available
- [x] Button uses `<a href={pdfUrl} download={pdfFileName}>` for direct download
- [x] File name and size shown on button when available

## AC5: Reviewer attribution (signed or anonymous)

- [x] `getPublishedArticle` returns `reviewerName` as actual name when `isSigned: true`
- [x] `getPublishedArticle` returns `reviewerName` as "Anonymous Reviewer" when `isSigned: false`
- [x] Reviewer abstract only included when `status === 'approved' && authorAccepted === true`

## AC6: Article body typography

- [x] Article title uses `font-serif text-3xl font-bold tracking-tight`
- [x] Abstracts render at `text-lg` with `leading-[1.7]`
- [x] Content area has `max-w-[75ch]` for optimal reading width
- [x] Page uses generous margins `py-16 px-6`

## Article Index Page

- [x] `convex/articles.ts` `listPublished` query exists with no auth wrapper (public)
- [x] `listPublished` filters by `PUBLISHED` status via `by_status` index
- [x] Article index shows paginated list of published articles
- [x] Each article card shows: title, first 2 authors, publication date, abstract preview
- [x] Empty state preserved when no published articles
- [x] "Load more" button shown when more articles available

## Build Verification

- [x] `bunx convex dev --once` succeeds
- [x] `bun run typecheck` passes with zero errors
- [x] `bun run lint` passes with zero errors
- [x] `bun run test` passes (73 tests)
