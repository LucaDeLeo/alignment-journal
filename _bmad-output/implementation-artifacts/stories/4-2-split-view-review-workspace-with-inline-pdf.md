# Story 4.2: Split-View Review Workspace with Inline PDF

## Story

**As a** reviewer,
**I want** to read the paper inline alongside my review form in a split-view workspace,
**So that** I can read and write without switching between contexts.

## Status

**Epic:** 4 - Review Process & Semi-Confidential Discussion
**Status:** ready
**Priority:** High (delivers FR28, foundation for FR29)
**Depends on:** Story 4.1 (reviewer invitation acceptance, reviewer role in system, review record with status `assigned`), Story 2.1 (PDF upload with `pdfStorageId` on submissions), Story 2.3 (PDF text extraction via unpdf in triage pipeline — confirms text extraction works), Story 1.2 (schema with `reviews` table indexes `by_reviewerId`, `by_submissionId_reviewerId`), Story 1.4 (review route layout at `/review/` with role guard, `RouteSkeleton`, `ErrorBoundary`)

## Context

This story builds the primary review workspace — a split-view layout where reviewers read the paper on the left and see review form tabs on the right. After Story 4.1 accepted an invitation and upgraded the user to `reviewer` role, they land on `/review` which currently shows "No reviews assigned." This story replaces that placeholder with a functional review list and individual review workspace.

**What exists today:**
- `app/routes/review/route.tsx` — layout with `data-mode="reviewer"`, role guard for `reviewer` and `admin`, bypass for `/review/accept/*`
- `app/routes/review/index.tsx` — placeholder "No reviews assigned" empty state
- `app/routes/review/accept/$token.tsx` — invitation acceptance page (Story 4.1)
- `convex/schema.ts` — `reviews` table with `by_reviewerId`, `by_submissionId`, `by_submissionId_reviewerId` indexes; `submissions` table with `pdfStorageId`
- `convex/submissions.ts` — `getByIdForEditor` query (editor-only, includes `pdfUrl` via `ctx.storage.getUrl`)
- `convex/helpers/auth.ts` — `withUser`, `withReviewer` (assignment-aware: requires reviewer role + matching `reviews` record)
- `convex/triage.ts` — uses `unpdf` `extractText` for PDF text extraction (demonstrates the pattern)
- `app/components/ui/badge.tsx` — Badge component already installed
- No `ResizablePanelGroup`, `ScrollArea`, or `Tabs` components installed yet

**What this story builds:**
1. New Convex query `listByReviewer` in `convex/reviews.ts` — returns all reviews assigned to the current reviewer with submission title/abstract
2. New Convex query `getSubmissionForReviewer` in `convex/reviews.ts` — returns submission data + PDF URL + review record for a specific submission, gated by reviewer assignment
3. New Convex action `extractPdfText` in `convex/pdfExtraction.ts` (separate `"use node"` file) — extracts text from a PDF for inline rendering (reuses unpdf pattern from triage)
4. New route `app/routes/review/$submissionId.tsx` — the split-view review workspace page
5. Updated `app/routes/review/index.tsx` — review list showing assigned submissions
6. New feature folder `app/features/review/` with workspace components
7. Install shadcn/ui components: `resizable`, `scroll-area`, `tabs`

**Key architectural decisions:**

- **PDF text extraction for inline rendering:** The UX spec explicitly states "web-native rendering, NOT PDF embed." The triage pipeline already extracts text via `unpdf` but doesn't persist it. This story adds a Convex action that extracts text on-demand and stores it on the submission record as `extractedText`. Subsequent loads read the cached text directly. This avoids re-extracting on every page load.
- **New `extractedText` field on submissions:** Add an optional `extractedText: v.optional(v.string())` field to the `submissions` table schema. The extraction action writes it once; the reviewer query reads it. This is a schema migration but Convex handles adding optional fields without migration scripts.
- **`withReviewer` wrapper:** The `getSubmissionForReviewer` query uses the existing `withReviewer` HOF from `convex/helpers/auth.ts`, which requires reviewer role AND a matching `reviews` record for the `submissionId`. This enforces assignment-level access control.
- **Split-view via `ResizablePanelGroup`:** Uses shadcn/ui's `ResizablePanelGroup` (wraps `react-resizable-panels`) for the split layout. Paper panel defaults to 55%, review panel to 45%. Min sizes enforced via percentage-based constraints.
- **Review panel tabs are placeholder:** Story 4.2 renders the tab structure (Write Review / Discussion / Guidelines) but the actual review form content is built in Story 4.3. The Write tab shows a placeholder. The Discussion tab is built in Story 4.4. The Guidelines tab shows static guidance text.
- **Responsive fallback at <880px:** Below 880px viewport width, the split-view collapses to a tabbed full-width view with Paper and Review as tabs. Detected via a `useMediaQuery` hook or CSS container query.
- **Confidentiality badge:** A persistent green badge in the workspace header reading "Hidden from authors" — reinforces the semi-confidential model (FR31). Not dismissible.
- **Review status transition:** When a reviewer first opens the workspace, if the review status is `assigned`, automatically transition it to `in_progress` via a mutation. This tracks engagement.

**Key architectural references:**
- UX spec: Split-view layout — paper 55% left, review 45% right, resizable, min widths 480px/360px
- UX spec: Newsreader serif 18px, 1.7 line height, 75ch max-width for paper content
- UX spec: ConfidentialityBadge — green pill, persistent, "Hidden from authors"
- UX spec: ProgressRing — 28px SVG, "N/5" center text (placeholder for Story 4.3)
- UX spec: Breadcrumb — "Reviews / [Paper Title]"
- Architecture: `withReviewer` HOF for assignment-aware auth
- Architecture: `unpdf` `extractText` for PDF-to-text conversion
- FR28: Reviewers can view assigned papers with inline PDF reading
- FR31: Reviewer identities are hidden from authors

## Acceptance Criteria

### AC1: Review list page shows assigned submissions
**Given** an authenticated reviewer who has accepted one or more invitations
**When** they navigate to `/review/`
**Then:**
- A list displays all submissions assigned to this reviewer
- Each item shows: paper title, submission status, review status (assigned/in_progress/submitted/locked), and creation date
- Clicking a submission navigates to `/review/$submissionId`
- If no reviews are assigned, the existing empty state ("No reviews assigned") is shown
- The Convex query `listByReviewer` uses `withUser` + manual reviewer role check (not `withReviewer` since no `submissionId` arg)
- The query returns submission title and review status by joining `reviews` with `submissions`
- The query defines both `args` and `returns` validators

### AC2: Split-view layout with paper panel and review panel
**Given** the review workspace at `/review/$submissionId`
**When** it loads for a reviewer assigned to this submission
**Then:**
- A `ResizablePanelGroup` displays two panels side-by-side
- Left panel (paper): defaults to 55% width, minimum 30% (ensures ~480px at 1280px viewport)
- Right panel (review): defaults to 45% width, minimum 25% (ensures ~360px at 1280px viewport)
- A vertical resize handle separates the panels with a subtle dot indicator on hover
- Both panels scroll independently via `ScrollArea`
- The panels fill the available viewport height below the workspace header

### AC3: Paper panel renders submission content inline
**Given** the paper panel on the left
**When** the submission data loads
**Then:**
- The paper renders as web content (NOT a PDF embed/iframe)
- Typography: Newsreader serif font, `text-lg` (18px), `leading-[1.7]` line height, `max-w-prose` (75ch) container
- Content includes: title (h1), authors with affiliations, abstract, and extracted body text
- The abstract is displayed with a labeled section header
- Body text is extracted from the PDF via the `extractPdfText` action (triggered automatically if `extractedText` is not yet cached on the submission)
- While text extraction is in progress, a loading skeleton is shown with "Extracting paper text..." message
- The paper panel background is `surface-elevated` (white)
- Internal padding: `p-6` with `space-y-6` between major sections

### AC4: Workspace header with breadcrumb and confidentiality badge
**Given** the review workspace
**When** it renders
**Then:**
- A header bar spans the full width above the split-view panels
- Left side: breadcrumb "Reviews / [Paper Title]" — "Reviews" is a link to `/review/`
- Right side: ConfidentialityBadge — a green pill badge reading "Hidden from authors" with a green dot indicator
- The badge uses `role="status"` and `aria-live="polite"` for accessibility
- The badge is NOT dismissible
- The header has `surface-elevated` background with `border-b`

### AC5: Review panel with tab navigation (placeholder content)
**Given** the review panel on the right
**When** it renders
**Then:**
- A `Tabs` component displays three tabs: "Write Review", "Discussion", "Guidelines"
- "Write Review" tab (default active): shows a placeholder card — "Review form coming in the next update" with a ProgressRing showing "0/5" sections completed
- "Discussion" tab: shows a placeholder — "Discussion will be available after you submit your review"
- "Guidelines" tab: shows static review guidelines text (a brief paragraph about what makes a good review for this journal)
- The review panel background is `bg-muted/50` (cool gray tint per reviewer mode)
- Internal padding: `p-4` with `space-y-4` between sections

### AC6: Review status auto-transition to in_progress
**Given** a reviewer opens a workspace for a review with status `assigned`
**When** the workspace component mounts
**Then:**
- A mutation `startReview` is called that transitions the review status from `assigned` to `in_progress`
- The mutation sets `updatedAt` to `Date.now()`
- The mutation only transitions if the current status is `assigned` (idempotent — no error if already `in_progress`)
- The mutation uses `withReviewer` wrapper for assignment-aware auth
- The mutation defines both `args` and `returns` validators

### AC7: PDF text extraction and caching
**Given** a submission whose `extractedText` field is not yet populated
**When** the reviewer opens the workspace
**Then:**
- A Convex action `extractPdfText` is triggered (called from the frontend via `useAction` or auto-scheduled)
- The action fetches the PDF from Convex storage via `ctx.storage.getUrl(pdfStorageId)`
- The action extracts text using `unpdf`'s `extractText` with `{ mergePages: true }`
- The action writes the extracted text to the submission's `extractedText` field via an internal mutation
- On subsequent loads, the cached `extractedText` is returned directly without re-extraction
- Text is truncated to 200,000 characters maximum to prevent excessive storage
- If extraction fails, an error message is shown: "Unable to extract paper text. Please download the PDF to read offline."
- A PDF download link (using `ctx.storage.getUrl`) is always available as a fallback in the paper panel header

### AC8: Responsive collapse below 880px
**Given** a viewport width below 880px
**When** the workspace renders
**Then:**
- The split-view collapses to a tabbed full-width layout
- Two top-level tabs: "Paper" and "Review"
- "Paper" tab shows the full-width paper content
- "Review" tab shows the review panel (with its own nested Write/Discussion/Guidelines tabs)
- The layout switches dynamically when the viewport is resized across the 880px threshold

## Technical Notes

### Schema change: add `extractedText` to submissions

Add `extractedText: v.optional(v.string())` to the `submissions` table in `convex/schema.ts`. This is a non-breaking addition (optional field).

### New Convex functions in `convex/reviews.ts`

Create a new file `convex/reviews.ts` (default Convex runtime, NO `"use node"`) with:

1. **`listByReviewer` query** (uses `withUser` + manual role check):
   - Args: `{}` (empty — reviewer determined from auth)
   - Queries `reviews` table with `by_reviewerId` index for current user
   - For each review, joins with `submissions` table to get title and status
   - Returns: `v.array(v.object({ _id: v.id('reviews'), submissionId: v.id('submissions'), title: v.string(), submissionStatus: <submissionStatusValidator>, reviewStatus: v.union(v.literal('assigned'), ...), createdAt: v.number() }))`
   - Ordered by `createdAt` descending

2. **`getSubmissionForReviewer` query** (uses `withReviewer`):
   - Args: `{ submissionId: v.id('submissions') }`
   - Returns submission data (title, authors, abstract, keywords, extractedText, pdfStorageId) + review record (status, sections, revision)
   - Generates a PDF URL via `ctx.storage.getUrl(pdfStorageId)` for the download fallback
   - Does NOT return author identity beyond what's on the paper itself (no authorId, no user lookup)

3. **`startReview` mutation** (uses `withReviewer`):
   - Args: `{ submissionId: v.id('submissions') }`
   - Looks up the review record via `by_submissionId_reviewerId` index
   - If `status === 'assigned'`, patches to `{ status: 'in_progress', updatedAt: Date.now() }`
   - If status is already `in_progress` or later, no-op (returns null)
   - Returns: `v.null()`

### New Convex action in `convex/pdfExtraction.ts`

Create a new file `convex/pdfExtraction.ts` with `"use node"` at the top (required for `unpdf`):

1. **`extractPdfText` action** (uses `withUser` + manual role check):
   - Args: `{ submissionId: v.id('submissions') }`
   - Fetches submission via internal query to check if `extractedText` already exists
   - If cached, returns early
   - Fetches PDF from storage, extracts text via `unpdf` `extractText`
   - Writes text to submission via internal mutation (patches `extractedText`)
   - Returns: `v.null()`
   - Error handling: catches extraction errors, does NOT throw to the client — frontend detects missing text via the query

2. **`getSubmissionInternal` internalQuery** — reads submission by ID (for the action to check cached text and get `pdfStorageId`)

3. **`writeExtractedText` internalMutation** — patches `extractedText` on submission (for the action to persist results)

**Why a separate file:** Convex's `"use node"` directive is file-level — all exports in the file run in the Node.js runtime. Keeping queries and mutations in `convex/reviews.ts` (default runtime) avoids unnecessary Node.js overhead for simple DB operations. This matches the existing pattern where `convex/triage.ts` is a dedicated `"use node"` file for actions.

### Install shadcn/ui components

```bash
bunx --bun shadcn@latest add resizable scroll-area tabs
```

These install to `app/components/ui/resizable.tsx`, `scroll-area.tsx`, `tabs.tsx`.

### New route: `app/routes/review/$submissionId.tsx`

File-based route at `/review/:submissionId`. Uses TanStack Router's `createFileRoute('/review/$submissionId')`.

**Component structure:**
```
ReviewWorkspacePage
  ├─ Route.useParams() → { submissionId }
  ├─ useQuery(api.reviews.getSubmissionForReviewer, { submissionId })
  ├─ Viewport width check for responsive layout
  ├─ Loading: <RouteSkeleton variant="sidebar" />
  ├─ Error: submission not found → navigate to /review
  └─ Loaded:
       ├─ <WorkspaceHeader title={...} />
       ├─ <ReviewWorkspace submission={...} review={...} />
       │    ├─ Wide viewport (≥880px): <SplitViewLayout />
       │    │    ├─ ResizablePanelGroup direction="horizontal"
       │    │    │    ├─ ResizablePanel (55%, min 30%) → <PaperPanel />
       │    │    │    ├─ ResizableHandle />
       │    │    │    └─ ResizablePanel (45%, min 25%) → <ReviewPanel />
       │    │    └─ Auto-trigger startReview mutation
       │    └─ Narrow viewport (<880px): <TabbedLayout />
       │         ├─ Tab "Paper" → <PaperPanel />
       │         └─ Tab "Review" → <ReviewPanel />
       └─ useEffect: trigger api.pdfExtraction.extractPdfText if extractedText is undefined
```

### New feature folder: `app/features/review/`

Create `app/features/review/` with:

1. **`workspace-header.tsx`** — breadcrumb + confidentiality badge
2. **`paper-panel.tsx`** — paper content rendered as web typography
3. **`review-panel.tsx`** — tabbed review form placeholder
4. **`confidentiality-badge.tsx`** — green pill badge component
5. **`progress-ring.tsx`** — SVG circular progress indicator (placeholder, wired in Story 4.3)
6. **`index.ts`** — barrel export

### Update `app/routes/review/index.tsx`

Replace the placeholder with a functional review list:
- Uses `useQuery(api.reviews.listByReviewer)` to fetch assigned reviews
- Shows a card for each review with title, status badge, and link to workspace
- Retains the empty state for no assigned reviews

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`, `useMutation`, `useAction`
- Import from `@tanstack/react-router` for `createFileRoute`, `useNavigate`, `Link`
- Import from `~/components/ui/` for shadcn components
- Import from `~/features/review` for feature components

### shadcn/ui components to use

- `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` — split-view layout (to install)
- `ScrollArea` — independent panel scrolling (to install)
- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` — review panel tabs (to install)
- `Badge` — confidentiality badge, review status (already installed)
- `Card`, `CardContent`, `CardHeader`, `CardTitle` — review list items (already installed)
- `Separator` — section dividers (already installed)
- `Skeleton` — loading states (already installed)
- lucide-react icons: `ChevronRightIcon`, `ShieldCheckIcon`, `FileTextIcon`, `DownloadIcon`, `BookOpenIcon`, `MessageSquareIcon`, `InfoIcon`

### Files to create

```
convex/reviews.ts                              — NEW: listByReviewer, getSubmissionForReviewer, startReview queries/mutations
convex/pdfExtraction.ts                        — NEW: extractPdfText action + internal helpers ("use node")
app/features/review/workspace-header.tsx       — NEW: breadcrumb + confidentiality badge
app/features/review/paper-panel.tsx            — NEW: inline paper content rendering
app/features/review/review-panel.tsx           — NEW: tabbed review form placeholder
app/features/review/confidentiality-badge.tsx  — NEW: green pill badge
app/features/review/progress-ring.tsx          — NEW: SVG progress ring (placeholder)
app/features/review/index.ts                   — NEW: barrel export
app/routes/review/$submissionId.tsx            — NEW: review workspace route
```

### Files to modify

```
convex/schema.ts                               — MODIFY: add extractedText to submissions
app/routes/review/index.tsx                    — MODIFY: replace placeholder with review list
```

### Implementation sequence

1. **Add `extractedText` to submissions schema** in `convex/schema.ts` — single field addition.

2. **Create `convex/reviews.ts`** — `listByReviewer` query, `getSubmissionForReviewer` query, `startReview` mutation (default runtime, no `"use node"`).

3. **Create `convex/pdfExtraction.ts`** — `extractPdfText` action + `getSubmissionInternal` internalQuery + `writeExtractedText` internalMutation (`"use node"` runtime).

4. **Install shadcn/ui components** — `bunx --bun shadcn@latest add resizable scroll-area tabs`.

5. **Create `app/features/review/` feature folder** — all components + barrel export.

6. **Create `app/routes/review/$submissionId.tsx`** — workspace route wiring components together.

7. **Update `app/routes/review/index.tsx`** — replace placeholder with review list.

8. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Responsive behavior detail

The 880px breakpoint is detected via a custom hook:

```typescript
function useIsNarrow(breakpoint = 880) {
  const [isNarrow, setIsNarrow] = React.useState(false)
  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    setIsNarrow(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsNarrow(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])
  return isNarrow
}
```

This hook lives in the workspace route file (not extracted — single use).

### ConfidentialityBadge specification

```
┌─────────────────────────────┐
│  ● Hidden from authors      │
└─────────────────────────────┘
```

- Green-tinted background: `bg-emerald-50 text-emerald-700 border-emerald-200`
- Green dot: `bg-emerald-500` 6px circle
- Text: Satoshi `text-xs font-semibold`
- ARIA: `role="status"` `aria-live="polite"`
- Not dismissible — no close button

### ProgressRing specification (placeholder)

28px SVG circle. Background track is `stroke-muted`. Progress arc is `stroke-primary`. Center text "0/5" in Satoshi `text-[10px] font-bold`. For Story 4.2 this shows "0/5" statically. Story 4.3 wires it to actual section completion.

### Paper content rendering

The paper panel renders content in this order:
1. **Title** — `font-serif text-2xl font-semibold leading-tight`
2. **Authors** — `font-sans text-sm text-muted-foreground` with affiliations
3. **Abstract** — labeled section, `font-serif text-lg leading-[1.7]` with `italic` styling
4. **Body text** — `font-serif text-lg leading-[1.7]` for the extracted text content
5. **PDF download link** — always present at the bottom as a fallback

The extracted text from unpdf is plain text (no HTML/markdown). It's rendered as paragraphs split by double newlines. Single newlines within a paragraph are preserved as line breaks.

### `withReviewer` wrapper note

The existing `withReviewer` wrapper in `convex/helpers/auth.ts` enforces `role === 'reviewer'`. However, admin users should also be able to access review workspaces (for support/debugging). For `getSubmissionForReviewer` and `startReview`, use `withUser` + manual check that allows both `reviewer` and `admin` roles, plus the assignment check (admin bypasses assignment). Alternatively, keep `withReviewer` for strict assignment-level access and add a separate admin-accessible query later. For this story, use `withReviewer` strictly — admin access can be added in a future story.

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PDF text extraction produces garbled output for some PDFs | Paper unreadable inline | Always show PDF download link as fallback; extraction is best-effort |
| `extractedText` field bloats submission documents | Convex document size limits | Truncate to 200K chars; large papers still have download fallback |
| `ResizablePanelGroup` doesn't support percentage-based min widths well | Panels can be resized too small | Use `minSize` prop (percentage) calibrated to enforce min pixel widths at target viewport |
| Slow PDF extraction blocks the reviewer | Poor UX on first load | Show skeleton with "Extracting..." message; extraction runs as a Convex action asynchronously |
| `withReviewer` is too strict (only `reviewer` role) | Admins can't debug review workspaces | Acceptable for prototype scope; admin access is a future enhancement |
| Schema change adding `extractedText` | Existing submissions lack the field | Field is optional; query handles `undefined` gracefully by triggering extraction |

### Dependencies on this story

- **Story 4.3 (Structured Review Form):** Replaces the "Write Review" tab placeholder with the actual form. Uses the workspace layout and `getSubmissionForReviewer` query built here.
- **Story 4.4 (Semi-Confidential Discussion):** Replaces the "Discussion" tab placeholder with threaded comments. Uses the workspace layout.

### What "done" looks like

- `convex/schema.ts` has `extractedText: v.optional(v.string())` on submissions table
- `convex/reviews.ts` exists with `listByReviewer`, `getSubmissionForReviewer`, `startReview` (default runtime)
- `convex/pdfExtraction.ts` exists with `extractPdfText` action + `getSubmissionInternal` + `writeExtractedText` (`"use node"` runtime)
- All Convex functions define `args` and `returns` validators
- `app/routes/review/index.tsx` shows a list of assigned reviews with links to workspaces
- `app/routes/review/$submissionId.tsx` renders the split-view workspace
- `app/features/review/` folder exists with workspace-header, paper-panel, review-panel, confidentiality-badge, progress-ring, and barrel export
- Paper content renders inline with Newsreader serif typography (not a PDF embed)
- ConfidentialityBadge persists in the header, not dismissible
- Review panel shows three tabs (Write/Discussion/Guidelines) with placeholder content
- Split-view is resizable with minimum width constraints
- Below 880px, layout collapses to tabbed full-width view
- Review status transitions from `assigned` to `in_progress` on first workspace load
- PDF text extraction runs on first load and caches the result
- PDF download link is always available as a fallback
- shadcn/ui components `resizable`, `scroll-area`, `tabs` are installed
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The `withReviewer` wrapper already exists in `convex/helpers/auth.ts` and handles both the role check (`reviewer`) and the assignment check (matching `reviews` record via `by_submissionId_reviewerId` index). Reuse it directly for `getSubmissionForReviewer` and `startReview`.
- For `listByReviewer`, use `withUser` instead of `withReviewer` because there's no `submissionId` argument — just check that the user's role is `reviewer` or `admin`.
- The `extractText` function from `unpdf` requires `"use node"` runtime. The `extractPdfText` action lives in `convex/pdfExtraction.ts` (with `"use node"` at the top), separate from `convex/reviews.ts` (default runtime for queries/mutations). This matches the project pattern where `convex/triage.ts` is a dedicated `"use node"` file. The frontend calls it via `api.pdfExtraction.extractPdfText`.
- The `ResizablePanelGroup` from shadcn/ui wraps `react-resizable-panels`. The `minSize` prop is percentage-based (not pixel-based). At 1280px viewport, 30% ≈ 384px and 25% ≈ 320px — close to the desired 480px/360px minimums. Fine-tune these values during implementation.
- The `ScrollArea` component provides custom scrollbars that match the design system. Use it for both panels to ensure consistent scroll behavior.
- For the paper content, split the extracted plain text by `\n\n` for paragraph breaks. Within paragraphs, preserve `\n` as `<br />` for line breaks. This is a simple heuristic that works well for academic papers.
- The ProgressRing SVG uses `stroke-dasharray` and `stroke-dashoffset` for the arc animation. In Story 4.2 it's static at 0/5. Story 4.3 will animate it based on completed sections.
- The `Tabs` component from shadcn/ui uses Radix UI under the hood. It handles keyboard navigation (arrow keys between tabs) and ARIA attributes automatically.
- When extracting text, the `mergePages: true` option concatenates all pages into a single string. This is the same approach used by `convex/triage.ts`.
- The workspace header breadcrumb truncates long paper titles with `truncate` class (ellipsis) to prevent header overflow.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 4 spec | Sprint Agent |
| 2026-02-08 | Fixed: Reconciled extractPdfText file location — action lives in `convex/pdfExtraction.ts` (`"use node"`), queries/mutations in `convex/reviews.ts` (default runtime). Updated Technical Notes, Files to create/modify, implementation sequence, What done looks like, Dev Notes, and component structure. Fixed AC7 `useMutation` → `useAction` for action call. | Sprint Agent |
