# ATDD Checklist: 3.5 Intelligent Reviewer Matching with Explainable Rationale

## AC1: Paper embedding and vector search
- [ ] `findMatches` action reads submission via `getSubmissionInternal`
- [ ] Paper embedding generated from title + abstract + keywords concatenation
- [ ] Uses text-embedding-3-large with explicit `dimensions: 1536`
- [ ] Runs `ctx.vectorSearch('reviewerProfiles', 'by_embedding', ...)` with limit 10
- [ ] Filters results to only include profiles where embedding exists
- [ ] Resolves matched profiles with reviewer name, affiliation, research areas, publication titles
- [ ] Action defines both `args` and `returns` validators
- [ ] File retains `"use node";` as first line

## AC2: Explainable rationale generation
- [ ] LLM call uses Vercel AI SDK `generateObject` with structured zod schema
- [ ] Each rationale is 1-2 sentences about paper-expertise overlap
- [ ] LLM receives context: submission title, abstract, reviewer research areas, publication titles
- [ ] Confidence score (0-1 float) generated per match
- [ ] LLM prompt focuses on publication/research area overlap
- [ ] API responses sanitized before writing to client-visible tables
- [ ] Fallback rationale from keyword overlap when LLM call fails

## AC3: Match results persistence and reactive display
- [ ] `matchResults` table added to schema with correct fields
- [ ] Each document stores: submissionId, matches array (up to 5), status, error, createdAt
- [ ] Schema includes `by_submissionId` index
- [ ] `getMatchResults` query (editor-gated) reads from matchResults table
- [ ] `getSubmissionInternal` and `saveMatchResults` are internal functions
- [ ] All new Convex functions define both `args` and `returns` validators

## AC4: ReviewerMatchCard component
- [ ] Shows reviewer name (Satoshi font, medium weight)
- [ ] Shows affiliation (muted text)
- [ ] Shows expertise tags (Badge pills for research areas)
- [ ] Shows match rationale (1-2 sentences, text-sm muted)
- [ ] Shows confidence indicator (progress bar, colored by level)
- [ ] Confidence colors: >= 0.8 green, >= 0.5 amber, < 0.5 muted
- [ ] Has Select and Dismiss action buttons
- [ ] Selected state: accent border, checkmark icon
- [ ] Dismissed state: reduced opacity (opacity-50)
- [ ] Uses shadcn Card, Badge, Button, and lucide icons

## AC5: Reviewer match panel integration
- [ ] "Find Reviewers" section appears below triage display, above pipeline progress
- [ ] "Run Matching" button triggers findMatches action
- [ ] Loading skeleton with "Finding matched reviewers..." text while running
- [ ] Up to 5 ReviewerMatchCards render in ranked order on completion
- [ ] Persisted results display immediately on page load
- [ ] Empty state when no reviewer profiles have embeddings
- [ ] Match panel does NOT appear for terminal statuses

## AC6: Editor interaction with matches
- [ ] "Select" marks card with accent border and checkmark (local state)
- [ ] "Dismiss" reduces opacity and moves to bottom (local state)
- [ ] "Re-run Matching" button allows fresh match
- [ ] Summary line shows "N reviewers selected" when selections exist

## AC7: Performance and error handling
- [ ] If OPENAI_API_KEY not configured, returns error status with clear message
- [ ] Zero vector search results returns empty matches array with descriptive message
- [ ] LLM rationale failure falls back to keyword-overlap rationale
- [ ] All external API error messages sanitized
- [ ] Errors logged server-side with `[matching]` prefix

## Unit Tests
- [ ] `convex/__tests__/matching-utils.test.ts` — keyword overlap fallback rationale generation
- [ ] `convex/__tests__/matching-utils.test.ts` — paper text truncation at 8000 chars
- [ ] `convex/__tests__/matching-utils.test.ts` — paper text building from submission data
- [ ] `convex/__tests__/matching-utils.test.ts` — API error message sanitization
