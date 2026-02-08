# Story 3.5: Intelligent Reviewer Matching with Explainable Rationale

## Story

**As an** action editor,
**I want** the system to suggest matched reviewers for a submission with specific rationale for each match,
**So that** I can assign the most qualified reviewers with confidence.

## Status

**Epic:** 3 - Editor Dashboard & Reviewer Assignment
**Status:** ready
**Priority:** High (fifth story of Epic 3, delivers FR16, FR17, FR18)
**Depends on:** Story 3.4 (reviewer profiles with embeddings in `convex/matching.ts`, `reviewerProfiles` table with `by_embedding` vector index), Story 3.2 (submission detail view at `/editor/$submissionId`), Story 1.2 (schema with `submissions` table including `abstract`, `title`, `keywords`)

## Context

This story adds intelligent reviewer-paper matching using Convex vector search and LLM-generated explainable rationale. It builds on the reviewer profile and embedding infrastructure from Story 3.4 to suggest the top 5 reviewers for a given submission, each with a human-readable explanation of why they're a good match.

**What exists today:**
- `convex/matching.ts` — `"use node";` file with `createOrUpdateProfile`, `getProfileByUserId`, `listProfiles`, `listReviewerUsers`, `generateEmbedding`, `saveEmbedding`, `getProfileInternal`
- `convex/schema.ts` — `reviewerProfiles` table with `embedding: v.optional(v.array(v.float64()))`, vector index `by_embedding` (1536 dimensions); `submissions` table with `title`, `abstract`, `keywords`, `status`
- `app/features/editor/submission-detail-editor.tsx` — editor's submission detail view with triage results, action editor selector, audit timeline
- `app/features/editor/index.ts` — barrel exports for editor feature components
- `app/features/editor/editor-constants.ts` — `EDITOR_ROLES` constant
- OpenAI package installed (`openai`)
- Existing embedding generation pattern: text-embedding-3-large with explicit `dimensions: 1536`

**What this story builds:**
1. New Convex functions in `convex/matching.ts`:
   - `findMatches` action — generates a paper embedding from submission title + abstract + keywords, runs `ctx.vectorSearch()` against `reviewerProfiles`, then calls an LLM to generate rationale for each match
   - `getSubmissionInternal` internalQuery — reads submission data for the matching action
   - `saveMatchResults` internalMutation — persists match results for reactive display
2. New schema addition: `matchResults` table to store matching results per submission for reactive queries
3. New UI components in `app/features/editor/`:
   - `reviewer-match-panel.tsx` — panel showing match suggestions with trigger button, loading state, and results
   - `reviewer-match-card.tsx` — individual match card with reviewer info, rationale, confidence, and select/dismiss actions
4. Updated `app/features/editor/submission-detail-editor.tsx` — integrates the reviewer match panel
5. Updated `app/features/editor/index.ts` — adds new exports

**Key architectural decisions:**

- **Vector search in actions only:** Convex `ctx.vectorSearch()` is only available in actions, not queries or mutations. The `findMatches` function must be an action. Results are written back to a `matchResults` table via internalMutation so the UI can reactively subscribe to results.
- **Paper embedding generation:** The submission's title, abstract, and keywords are concatenated into text, then embedded using the same OpenAI text-embedding-3-large model (dimensions: 1536) that was used for reviewer profiles. This ensures consistent embedding space for cosine similarity search.
- **LLM rationale generation:** After vector search returns the top matches, a follow-up LLM call (using Vercel AI SDK with `generateObject`) produces a 1-2 sentence rationale per match explaining the specific paper-expertise overlap. This uses the submission abstract + reviewer research areas + publication titles as context.
- **Match result persistence:** Results are stored in a `matchResults` table so the UI can use reactive `useQuery` to display them. The action writes results via `saveMatchResults` internalMutation. This also means results persist across page reloads.
- **Editor interaction model:** Editors can select reviewers (for invitation in Story 3.6), dismiss them (moved to bottom, muted), or trigger a manual search. Selection state is stored locally in React state for now — actual invitation happens in Story 3.6.
- **Performance target:** NFR3 requires results within 30 seconds. The pipeline is: generate paper embedding (~1s) → vector search (~0.5s) → LLM rationale for 5 matches (~5-10s) → save results (~0.5s). Well within budget.

**Key architectural references:**
- Architecture: `convex/matching.ts` — `"use node";` Actions for vector search and embedding
- Architecture: Convex vector search for reviewer-paper matching using OpenAI text-embedding-3-large
- Architecture: External API response sanitization before writing to client-visible tables
- Architecture: Vercel AI SDK `generateObject` for structured LLM output
- FR16: System generates ranked reviewer match suggestions for a given submission based on expertise overlap
- FR17: Each match suggestion includes explainable rationale (research area alignment, relevant publications)
- FR18: Editors can accept, reject, or manually override match suggestions
- NFR3: Reviewer matching returns results within 30 seconds

## Acceptance Criteria

### AC1: Paper embedding and vector search
**Given** a submission in `TRIAGE_COMPLETE` or `UNDER_REVIEW` status
**When** the editor triggers reviewer matching via the UI
**Then:**
- The `findMatches` action reads the submission via `ctx.runQuery(internal.matching.getSubmissionInternal, { submissionId })`
- It generates a paper embedding from the concatenation of title, abstract, and keywords using OpenAI text-embedding-3-large with explicit `dimensions: 1536`
- It runs `ctx.vectorSearch('reviewerProfiles', 'by_embedding', { vector: paperEmbedding, limit: 10 })` to find the closest reviewer profiles
- It filters results to only include profiles where `embedding` exists (non-null)
- It resolves each matched profile to include: reviewer name, affiliation, research areas, publication titles
- The action defines both `args` and `returns` validators
- The file retains `"use node";` as the first line (already present)

### AC2: Explainable rationale generation
**Given** the top vector search matches
**When** rationale is generated
**Then:**
- A follow-up LLM call using Vercel AI SDK `generateObject` produces structured rationale for each match
- Each rationale is 1-2 sentences explaining the specific paper-expertise overlap (e.g., "Published on corrigibility, which is the paper's core framework")
- The LLM receives context: submission title, abstract, and for each reviewer their research areas and publication titles
- A confidence score (0-1 float) is generated per match based on the vector similarity score and LLM assessment
- The LLM prompt instructs the model to focus on specific publication/research area overlap with the paper
- API responses are sanitized before writing to client-visible tables — no raw error messages
- If the LLM call fails, the action falls back to a simple rationale derived from overlapping research area keywords (graceful degradation)

### AC3: Match results persistence and reactive display
**Given** the `findMatches` action completes
**When** results are saved
**Then:**
- Results are written to a `matchResults` table via `saveMatchResults` internalMutation
- Each `matchResults` document stores: `submissionId`, `matches` (array of up to 5 ranked results, each with `profileId`, `userId`, `reviewerName`, `affiliation`, `researchAreas`, `publicationTitles`, `rationale`, `confidence`), `status` (`pending` | `running` | `complete` | `failed`), `error` (optional), `createdAt`
- The schema addition includes an index `by_submissionId` on the `matchResults` table
- The UI subscribes to match results via `useQuery(api.matching.getMatchResults, { submissionId })` for reactive updates
- A new `getMatchResults` query (editor-gated) reads from the `matchResults` table
- `getSubmissionInternal` (internalQuery) and `saveMatchResults` (internalMutation) are internal functions — not exposed to client code
- All new Convex functions define both `args` and `returns` validators

### AC4: ReviewerMatchCard component
**Given** a match result renders
**When** it displays as a ReviewerMatchCard
**Then:**
- It shows: reviewer name (Satoshi font, medium weight), affiliation (muted text), expertise tags (small Badge pills for research areas), match rationale (1-2 sentences, Satoshi text-sm muted), and a confidence indicator (horizontal progress bar segment, colored by confidence level)
- Confidence indicator colors: >= 0.8 green, >= 0.5 amber, < 0.5 muted
- Each card has "Select" and "Dismiss" action buttons
- Selected state: accent border highlight, checkmark icon on the card
- Dismissed state: reduced opacity (opacity-50), card moves to bottom of list
- The component uses shadcn `Card`, `Badge`, `Button`, and lucide icons (`CheckIcon`, `XIcon`, `UserIcon`)

### AC5: Reviewer match panel integration
**Given** the editor submission detail page (`/editor/$submissionId`)
**When** the submission is in a matchable status (`TRIAGE_COMPLETE`, `UNDER_REVIEW`)
**Then:**
- A "Find Reviewers" section appears below the triage display and above the pipeline progress section
- A "Run Matching" button triggers the `findMatches` action via `useAction(api.matching.findMatches)`
- While matching is running: a loading skeleton with "Finding matched reviewers..." text is shown
- On completion: up to 5 ReviewerMatchCards render in ranked order
- If results already exist for this submission, they display immediately on page load (persisted in `matchResults`)
- If no reviewer profiles have embeddings, a helpful empty state appears: "No reviewer profiles with embeddings available. Add profiles in the Admin panel."
- The match panel does NOT appear for submissions in terminal statuses (ACCEPTED, REJECTED, DESK_REJECTED, PUBLISHED)

### AC6: Editor interaction with matches
**Given** the match results are displayed
**When** the editor interacts
**Then:**
- Clicking "Select" on a card marks it with accent border and checkmark (local state)
- Clicking "Dismiss" on a card reduces its opacity and moves it to the bottom of the list (local state)
- A "Re-run Matching" button allows triggering a fresh match (overwrites previous results)
- Selection/dismissal state is local to the session — actual invitation workflow deferred to Story 3.6
- A summary line shows "N reviewers selected" above the match cards when selections exist

### AC7: Performance and error handling
**Given** the matching pipeline
**When** it executes
**Then:**
- Results return within 30 seconds of the match request (NFR3)
- If `OPENAI_API_KEY` is not configured, the action returns an error status with a clear message
- If the vector search returns zero results (no profiles with embeddings), the action returns an empty matches array with a descriptive status message
- If the LLM rationale call fails, the action falls back to keyword-overlap rationale (no full failure)
- The action sanitizes all external API error messages — no raw OpenAI/Anthropic errors written to client-visible fields
- All errors are logged server-side via `console.error` with `[matching]` prefix for debugging

## Technical Notes

### Schema addition

Add `matchResults` table to `convex/schema.ts`:

```typescript
matchResults: defineTable({
  submissionId: v.id('submissions'),
  status: v.union(
    v.literal('pending'),
    v.literal('running'),
    v.literal('complete'),
    v.literal('failed'),
  ),
  matches: v.array(
    v.object({
      profileId: v.id('reviewerProfiles'),
      userId: v.id('users'),
      reviewerName: v.string(),
      affiliation: v.string(),
      researchAreas: v.array(v.string()),
      publicationTitles: v.array(v.string()),
      rationale: v.string(),
      confidence: v.float64(),
    }),
  ),
  error: v.optional(v.string()),
  createdAt: v.number(),
}).index('by_submissionId', ['submissionId']),
```

### New files to create

```
app/features/editor/reviewer-match-panel.tsx    — match panel with trigger, loading, and results
app/features/editor/reviewer-match-card.tsx     — individual match card component
```

### Files to modify

```
convex/schema.ts                                — add matchResults table
convex/matching.ts                              — add findMatches action, getSubmissionInternal, saveMatchResults, getMatchResults
app/features/editor/submission-detail-editor.tsx — integrate ReviewerMatchPanel
app/features/editor/index.ts                    — add new exports
```

### Implementation sequence

1. **Add `matchResults` table to `convex/schema.ts`** — schema must deploy before functions that reference the table can run.

2. **Add new Convex functions to `convex/matching.ts`** (add `action` to the existing import from `./_generated/server`):

   **Internal helpers:**
   - `getSubmissionInternal` internalQuery — reads submission by ID (title, abstract, keywords) for the matching action
   - `saveMatchResults` internalMutation — upserts match results for a submission (creates or replaces existing)

   **Public functions:**
   - `findMatches` action:
     - Args: `submissionId: v.id('submissions')`
     - Uses `withUser` (action overload) + `EDITOR_ROLES` check
     - Flow:
       1. Set status to `running` via `saveMatchResults`
       2. Read submission via `getSubmissionInternal`
       3. Build paper text: `"Title: ${title}. Abstract: ${abstract}. Keywords: ${keywords.join(', ')}"`
       4. Call OpenAI text-embedding-3-large with dimensions: 1536
       5. Run `ctx.vectorSearch('reviewerProfiles', 'by_embedding', { vector: paperEmbedding, limit: 10 })`
       6. For each result, read profile + user data via `getProfileInternal` + `ctx.runQuery`
       7. Filter to top 5 with valid embeddings
       8. Generate rationale via Vercel AI SDK `generateObject` with a structured schema
       9. Save results via `saveMatchResults` with status `complete`
       10. On any error: save with status `failed` + sanitized error message
     - Returns: `v.null()`

   - `getMatchResults` query:
     - Args: `submissionId: v.id('submissions')`
     - Uses `withUser` + `EDITOR_ROLES` check
     - Reads the most recent `matchResults` for the submission via `by_submissionId` index
     - Returns match results or null

   **LLM rationale prompt structure:**
   ```
   You are an academic journal editor assistant. For each reviewer candidate,
   explain in 1-2 sentences why they are a good match for the given paper.
   Focus on specific overlap between the reviewer's publications/research areas
   and the paper's topic. Also assign a confidence score (0-1) where 1 means
   near-perfect expertise match.

   Paper: {title} - {abstract}

   Candidates:
   1. {name} - Research areas: {areas}. Publications: {titles}
   ...
   ```

   **Rationale response schema (Vercel AI SDK `generateObject`):**
   ```typescript
   z.object({
     matches: z.array(z.object({
       index: z.number(),
       rationale: z.string(),
       confidence: z.number().min(0).max(1),
     })),
   })
   ```

3. **Create `app/features/editor/reviewer-match-card.tsx`**:
   - Props: `match` (match data), `isSelected: boolean`, `isDismissed: boolean`, `onSelect: () => void`, `onDismiss: () => void`
   - Card displays: name, affiliation, research areas as Badge pills, rationale text, confidence bar
   - Uses shadcn `Card`, `Badge`, `Button`, `Progress`
   - Uses lucide icons: `CheckIcon`, `XIcon`, `UserIcon`, `SparklesIcon`

4. **Create `app/features/editor/reviewer-match-panel.tsx`**:
   - Props: `submissionId`
   - Uses `useQuery(api.matching.getMatchResults, { submissionId })` for reactive results
   - Uses `useAction(api.matching.findMatches)` for triggering
   - Manages local selection/dismissal state with `useState`
   - Shows: trigger button, loading skeleton, results list, empty state, error state
   - Sorts cards: selected first, then unselected, then dismissed

5. **Update `app/features/editor/submission-detail-editor.tsx`**:
   - Add `<ReviewerMatchPanel submissionId={submissionId} />` between the triage display and pipeline progress sections
   - Only render when submission status is in matchable statuses (`TRIAGE_COMPLETE`, `UNDER_REVIEW`)

6. **Update `app/features/editor/index.ts`**:
   - Add exports: `ReviewerMatchPanel`, `ReviewerMatchCard`

7. **Install `@ai-sdk/openai` provider** (not yet in package.json; `ai` and `zod` are already installed):
   - `bun add @ai-sdk/openai`

8. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`, `useAction`
- Import from `~/components/ui/` for shadcn components
- Import from relative paths for sibling feature components

### shadcn/ui components to use

- `Card`, `CardContent`, `CardHeader` — match card container (already installed)
- `Badge` — expertise area tags, confidence level (already installed)
- `Button` — select, dismiss, run matching (already installed)
- `Progress` — confidence indicator bar (may need install: `bunx --bun shadcn@latest add progress`)
- `Separator` — section dividers (already installed)
- lucide-react icons: `CheckIcon`, `XIcon`, `UserIcon`, `SparklesIcon`, `RefreshCwIcon`, `SearchIcon`

### Component data flow

```
EditorSubmissionDetail (features/editor/submission-detail-editor.tsx)
  └─ ReviewerMatchPanel (features/editor/reviewer-match-panel.tsx)
       ├─ useQuery(api.matching.getMatchResults)  — persisted match results
       ├─ useAction(api.matching.findMatches)     — trigger matching
       ├─ useState for local selection/dismissal
       ├─ "Run Matching" / "Re-run Matching" button
       ├─ Loading skeleton while status === 'running'
       ├─ Error state if status === 'failed'
       └─ ReviewerMatchCard[] (features/editor/reviewer-match-card.tsx)
            ├─ Reviewer name, affiliation
            ├─ Research area Badge pills
            ├─ Rationale text (1-2 sentences)
            ├─ Confidence progress bar
            └─ Select / Dismiss buttons
```

### Matching pipeline flow

```
findMatches action (triggered by editor)
  ├─ saveMatchResults({ status: 'running' })
  ├─ getSubmissionInternal({ submissionId }) → { title, abstract, keywords }
  ├─ OpenAI text-embedding-3-large → paperEmbedding (1536 dims)
  ├─ ctx.vectorSearch('reviewerProfiles', 'by_embedding', { vector, limit: 10 })
  ├─ For each result: getProfileInternal + resolve user → enriched match data
  ├─ Filter to top 5 with valid data
  ├─ Vercel AI SDK generateObject → rationale + confidence per match
  └─ saveMatchResults({ status: 'complete', matches: [...] })
       │
       ▼
  getMatchResults query (reactive subscription)
       │
       ▼
  ReviewerMatchPanel re-renders with results
```

### Convex environment variables required

- `OPENAI_API_KEY` — already required by Story 3.4 for embedding generation

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| No reviewer profiles have embeddings | Vector search returns empty results | Show helpful empty state directing editors to admin panel; action sets status `complete` with empty matches array |
| OpenAI API key not configured | Embedding generation fails | Action checks for key, returns `failed` status with clear message |
| LLM rationale call fails | No explainable rationale | Fallback to keyword-overlap rationale computed locally (compare submission keywords with reviewer research areas) |
| Vector search returns fewer than 5 results | Fewer match cards shown | Display whatever results exist; inform editor of pool size |
| Slow LLM response exceeds 30s | NFR3 violation | Generate rationale for all matches in a single batch call, not individual calls; text-embedding is fast (~1s); vector search is fast (~0.5s); batch LLM call should complete in 5-10s |
| Concurrent match requests for same submission | Duplicate results | `saveMatchResults` uses upsert semantics (query by submissionId, replace if exists) |
| Large submission abstract exceeds token limit | Embedding generation fails | Truncate paper text to 8000 characters before embedding (well within text-embedding-3-large's 8191 token limit) |
| Vercel AI SDK or zod not installed | Import error | Step 7 installs dependencies |

### Dependencies on this story

- **Story 3.6 (Reviewer Invitation and Progress Monitoring):** Uses the match results and selection state to send actual reviewer invitations. Will read from `matchResults` table and create `reviewInvites` records.
- **Story 7.2 (Seed Reviewer Pool):** Match quality depends on reviewer profiles having embeddings. Seed data must generate embeddings for realistic matching demo.

### What "done" looks like

- `convex/schema.ts` has a `matchResults` table with `by_submissionId` index
- `convex/matching.ts` has new functions: `findMatches` action, `getSubmissionInternal` internalQuery, `saveMatchResults` internalMutation, `getMatchResults` query
- All new Convex functions define both `args` and `returns` validators
- `getSubmissionInternal` and `saveMatchResults` are internal functions (not exposed to client)
- Paper embedding uses text-embedding-3-large with explicit `dimensions: 1536`
- Vector search uses `ctx.vectorSearch('reviewerProfiles', 'by_embedding', ...)` with limit 10, filtered to top 5
- LLM rationale is generated via Vercel AI SDK `generateObject` with structured zod schema
- Fallback rationale works when LLM call fails
- `ReviewerMatchCard` component renders with name, affiliation, expertise tags, rationale, and confidence indicator
- `ReviewerMatchPanel` integrates into the editor submission detail page with trigger button, loading state, and results
- Selection and dismissal interactions work (local state, visual feedback)
- Empty state shown when no profiles have embeddings
- Error state shown when matching fails with sanitized message
- Results persist in `matchResults` table and display reactively on page load
- Match panel only appears for submissions in `TRIAGE_COMPLETE` or `UNDER_REVIEW` status
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- `ctx.vectorSearch()` is only available in Convex actions — not in queries or mutations. The result is an array of `{ _id, _score }` objects. We need to fetch the full profile document separately via `ctx.runQuery`.
- The vector search `_score` from Convex is a cosine similarity score (0-1 range). We can pass this as a baseline to the LLM and ask it to refine the confidence based on semantic analysis.
- Vercel AI SDK `generateObject` should use `@ai-sdk/openai` provider with `gpt-4o-mini` for cost efficiency on the rationale generation (the rationale doesn't need the most powerful model). Import: `import { openai } from '@ai-sdk/openai'` and use `openai('gpt-4o-mini')`.
- The matching action needs both OpenAI (for embeddings) and Vercel AI SDK (for rationale). Both are imported in the same `"use node";` file.
- The `matchResults` table uses a flat structure rather than separate documents per match to keep the reactive query simple — one document per submission with all matches in an array.
- For the fallback rationale (when LLM fails), compute keyword overlap: find common words between submission keywords and reviewer research areas, then format as "Expertise in {overlapping areas} aligns with this paper's focus on {topic}."
- The `saveMatchResults` mutation should query for existing results by submissionId and either update or create, providing upsert semantics.
- When the submission abstract is very long, truncate the text for embedding at 8000 characters (text-embedding-3-large supports up to 8191 tokens, and characters are a safe proxy at the lengths we're dealing with).
- The `Progress` shadcn component may not be installed yet. Check with `ls app/components/ui/progress.tsx` and install if needed.
- The match panel placement in the submission detail view should be between the triage display (`<TriageDisplay>`) and the pipeline progress section, matching the editorial workflow (triage → matching → review).

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 3 spec | Sprint Agent |
