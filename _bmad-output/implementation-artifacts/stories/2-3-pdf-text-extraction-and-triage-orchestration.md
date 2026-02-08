# Story 2.3: PDF Text Extraction and Triage Orchestration

## Story

**As an** editor,
**I want** submitted papers to be automatically analyzed by the LLM triage pipeline,
**So that** I get structured, actionable intelligence without reading every paper.

## Status

**Epic:** 2 - Author Submission & LLM Triage Pipeline
**Status:** ready
**Priority:** Highest (enables FR9-14, required by stories 2.4, 3.1, 3.2)
**Depends on:** Story 2.1 (submission creation with `pdfStorageId`), Story 2.2 (submission detail page, status timeline), Story 1.2 (schema with `triageReports` table, transitions, error helpers)

## Context

This story implements the backend LLM triage pipeline — the automated intelligence that transforms raw PDF submissions into structured editorial reports. When an author submits a paper (story 2.1), the system automatically transitions the submission from `SUBMITTED → TRIAGING` and kicks off a chained sequence of four Convex Actions. Each pass (scope, formatting, citations, claims) extracts insight from the paper text, writes results to `triageReports` via internal mutations, and schedules the next pass. When all four complete, the submission transitions to `TRIAGE_COMPLETE`.

This is a **backend-only** story — no new frontend components. Story 2.4 builds the frontend display (triage progress indicator, report cards, staggered animations). The reactive queries that power the real-time progress display are defined here so 2.4 can consume them.

**Key architectural decisions:**

- **File structure:** Single `convex/triage.ts` file with `"use node";` directive. Contains 4 exported `internalAction` functions (one per pass), 2 `internalMutation` functions (write results, update submission status), and 2 exported queries (get triage reports by submission, get triage progress). The action entrypoint (`startTriage`) is a public mutation that validates the transition and schedules the first action.
- **Chained Actions with scheduling:** Each triage action writes its results via `ctx.runMutation(internal.triage.writeResult, ...)`, then schedules the next action via `ctx.scheduler.runAfter(0, internal.triage.runFormatting, ...)`. This pattern provides fault isolation (each pass is a separate execution), progress tracking (each write triggers reactive updates), and retry granularity (only the failed pass retries).
- **PDF text extraction:** The first action (`runScope`) fetches the PDF from Convex storage via `ctx.storage.getUrl()`, downloads it, and extracts text using `unpdf`'s `extractText`. The extracted text is passed to subsequent actions via arguments (not re-extracted per pass).
- **LLM calls via Vercel AI SDK:** Each pass uses `generateObject` from the `ai` package with `@ai-sdk/anthropic`'s Claude Sonnet 4.5 model, structured Zod output schemas, and pass-specific system prompts.
- **Idempotency:** Each pass uses `idempotencyKey = submissionId + triageRunId + passName`. Before writing results, the `writeResult` mutation checks if a complete result already exists for that key — if so, it no-ops. This makes retries safe.
- **Retry with backoff:** Each action catches errors, increments `attemptCount`, and re-schedules itself with exponential backoff (1s, 2s, 4s) up to 3 attempts. On terminal failure, it writes `status: "failed"` with a sanitized `lastError`.
- **Trigger mechanism:** The `submissions.create` mutation is modified to call `startTriage` automatically after inserting the submission record (via `ctx.scheduler.runAfter(0, internal.triage.startTriageInternal, { submissionId })`). The `startTriage` public mutation also exists for manual re-triage. Both transition `SUBMITTED → TRIAGING`, generate a `triageRunId`, create 4 pending `triageReports` records, and schedule the first action (`runScope`).

**Key architectural references:**
- Pipeline: architecture.md "LLM Pipeline Architecture" — chained Actions, `"use node"`, idempotency, retry, sanitization
- Schema: `convex/schema.ts` — `triageReports` table with `submissionId`, `triageRunId`, `passName`, `status`, `idempotencyKey`, `attemptCount`, `result`, `lastError`, `completedAt`, `createdAt`
- Transitions: `convex/helpers/transitions.ts` — `assertTransition`, `SUBMITTED → TRIAGING`, `TRIAGING → TRIAGE_COMPLETE`
- Errors: `convex/helpers/errors.ts` — `externalServiceError`, `notFoundError`
- Auth: `convex/helpers/auth.ts` — `withUser` for queries, no auth on internal functions
- Naming: architecture.md — `triage.runScope`, `internal.triage.writeResult`

## Acceptance Criteria

### AC1: Triage pipeline trigger on submission creation
**Given** a newly created submission in `SUBMITTED` status
**When** the `submissions.create` mutation completes
**Then:**
- It schedules `internal.triage.startTriageInternal` via `ctx.scheduler.runAfter(0, ...)` with the new submission's ID
- The `startTriageInternal` internalMutation transitions the submission from `SUBMITTED` to `TRIAGING` via `assertTransition`
- A unique `triageRunId` is generated (e.g., `crypto.randomUUID()`)
- Four `triageReports` records are created with `status: "pending"`, one for each `passName`: `scope`, `formatting`, `citations`, `claims`
- Each record has an `idempotencyKey` of `${submissionId}_${triageRunId}_${passName}`
- The first action (`runScope`) is scheduled via `ctx.scheduler.runAfter(0, ...)` with `{ submissionId, triageRunId, pdfStorageId }` from the submission record
- A public `startTriage` mutation also exists with `withUser` wrapper for manual re-triage scenarios (calls the same internal logic)

### AC2: PDF text extraction in first triage action
**Given** a scheduled `runScope` action with `pdfStorageId` in its args
**When** it executes
**Then:**
- The PDF is fetched from Convex storage using the `pdfStorageId` arg (passed directly from `startTriageInternal`, not re-queried)
- The binary content is converted to text using `unpdf`'s `extractText` function
- If the PDF has no extractable text, the pass writes a result with finding "No extractable text found in the PDF" and severity "high"
- The extracted text is passed to the LLM for scope analysis AND forwarded to subsequent actions as an argument (avoiding re-extraction)
- The action file begins with `"use node";` as the first line

### AC3: Four chained LLM triage passes execute in sequence
**Given** the triage pipeline is running
**When** each pass executes
**Then:**
- **Scope pass (`runScope`):** Analyzes text against the journal's focus areas (theoretical AI alignment, agency, understanding, asymptotic behavior of advanced synthetic agents). Uses `generateObject` with a Zod schema that returns `{ finding: string, severity: "low" | "medium" | "high", recommendation: string }`. Writes result via `internal.triage.writeResult`. Schedules `runFormatting` with the extracted text.
- **Formatting pass (`runFormatting`):** Checks for completeness (abstract present, sections structured, references section, page numbers). Uses `generateObject` with the same result schema. Writes result, schedules `runCitations`.
- **Citations pass (`runCitations`):** Extracts citations and flags formatting issues or potentially unresolvable references. Uses `generateObject` with the same result schema. Writes result, schedules `runClaims`.
- **Claims pass (`runClaims`):** Identifies key technical claims and assesses whether the paper provides supporting evidence or proofs. Uses `generateObject` with the same result schema. Writes result. After the final pass, transitions the submission to `TRIAGE_COMPLETE` via `internal.triage.completeTriageRun`.

### AC4: Idempotent result writes prevent duplicates
**Given** a triage pass completes
**When** `internal.triage.writeResult` is called
**Then:**
- It looks up the `triageReports` record by `idempotencyKey` index
- If the record already has `status: "complete"`, the mutation returns without modifying (no-op)
- If the record has `status: "pending"` or `status: "running"`, it updates with `status: "complete"`, the structured `result`, and `completedAt: Date.now()`
- This ensures retried passes don't overwrite existing results

### AC5: Retry with bounded exponential backoff
**Given** an LLM API call fails (network error, rate limit, timeout)
**When** the action catches the error
**Then:**
- The `attemptCount` is incremented on the `triageReports` record
- If `attemptCount < 3`, the same action is re-scheduled with `ctx.scheduler.runAfter(delayMs, ...)` where `delayMs = 1000 * Math.pow(2, attemptCount - 1)` (1s, 2s, 4s)
- If `attemptCount >= 3` (terminal failure), the record is updated with `status: "failed"` and `lastError` set to a sanitized error message (no raw API stack traces — map to a generic "LLM analysis failed" message)
- Terminal failures do NOT block other passes — the pipeline continues, and any pass can fail independently
- The submission does NOT transition to `TRIAGE_COMPLETE` if any pass has `status: "failed"` — it remains in `TRIAGING`

### AC6: Reactive queries for triage progress
**Given** the frontend needs to display triage progress
**When** triage queries are called
**Then:**
- `triage.getBySubmission` query returns all `triageReports` for a given `submissionId`, ordered by pass sequence (scope → formatting → citations → claims), using the `by_submissionId` index
- `triage.getProgress` query returns a summary: `{ total: 4, complete: number, running: number, failed: number, pending: number }` derived from the reports' statuses
- Both queries use `withUser` wrapper (any authenticated user — editors and authors both consume triage data)
- Both queries define `args` and `returns` validators

### AC7: External API response sanitization
**Given** any LLM API response
**When** results are written to `triageReports`
**Then:**
- Only the structured `result` object (`finding`, `severity`, `recommendation`) is stored — no raw API metadata, tokens, or model details
- Error messages written to `lastError` are sanitized: no raw stack traces, API keys, or model internals — just "LLM analysis failed for [passName] pass" or similar safe message
- The `result` fields are string-typed and bounded (no arbitrary HTML or script injection from LLM output)

## Technical Notes

### New files to create

```
convex/
  triage.ts              — "use node"; Actions + internalMutations + queries for triage pipeline
```

### Files to modify

```
convex/submissions.ts    — modify `create` mutation to schedule `internal.triage.startTriageInternal` after insert
```

### Implementation sequence

1. **Create `convex/triage.ts`** with `"use node";` as the first line. Define all triage functions in this single file:

2. **Define `startTriageInternal` internalMutation** — The core triage trigger (called automatically from `submissions.create`):
   - `args: { submissionId: v.id('submissions') }`
   - `returns: v.string()` (returns the `triageRunId`)
   - Fetches the submission via `ctx.db.get('submissions', args.submissionId)`, calls `assertTransition(submission.status, 'TRIAGING')`
   - Patches submission status to `TRIAGING` with `updatedAt: Date.now()`
   - Generates `triageRunId` via `crypto.randomUUID()`
   - Reads `pdfStorageId` from the submission record
   - Inserts 4 `triageReports` records with `status: 'pending'`, `attemptCount: 0`
   - Schedules `internal.triage.runScope` with `{ submissionId, triageRunId, pdfStorageId }`
   - Returns `triageRunId`

3. **Define `startTriage` public mutation** — Public wrapper for manual re-triage:
   - `args: { submissionId: v.id('submissions') }`
   - `returns: v.string()`
   - Uses `withUser` wrapper
   - Fetches the submission via `ctx.db.get('submissions', args.submissionId)`, validates it exists
   - Delegates to the same logic as `startTriageInternal` (or calls it directly via scheduler)

4. **Modify `convex/submissions.ts`** — Wire automatic triage trigger:
   - Import `internal` from `./_generated/api`
   - After `ctx.db.insert('submissions', ...)`, add: `await ctx.scheduler.runAfter(0, internal.triage.startTriageInternal, { submissionId })`
   - This ensures every new submission automatically enters the triage pipeline

5. **Define `writeResult` internalMutation** — Idempotent result writer:
   - `args: { idempotencyKey: v.string(), result: v.object({ finding: v.string(), severity: v.union(v.literal('low'), v.literal('medium'), v.literal('high')), recommendation: v.string() }), completedAt: v.number() }`
   - `returns: v.boolean()` (true if written, false if already complete)
   - Looks up record by `by_idempotencyKey` index
   - If already `complete`, returns false (no-op)
   - Otherwise, patches with `status: 'complete'`, `result`, `completedAt`
   - Returns true

6. **Define `markRunning` internalMutation** — Sets a report to `running` and updates attempt count:
   - `args: { idempotencyKey: v.string(), attemptCount: v.number() }`
   - `returns: v.null()`
   - Looks up by idempotency key, patches `status: 'running'`, `attemptCount`

7. **Define `markFailed` internalMutation** — Terminal failure handler:
   - `args: { idempotencyKey: v.string(), lastError: v.string(), attemptCount: v.number() }`
   - `returns: v.null()`
   - Patches `status: 'failed'`, `lastError`, `attemptCount`

8. **Define `completeTriageRun` internalMutation** — Checks if all 4 passes are complete:
   - `args: { submissionId: v.id('submissions'), triageRunId: v.string() }`
   - `returns: v.null()`
   - Queries all `triageReports` for this `submissionId` with matching `triageRunId`
   - If all 4 have `status: 'complete'`, transitions submission `TRIAGING → TRIAGE_COMPLETE` via `assertTransition` + `ctx.db.patch('submissions', submissionId, ...)`
   - If any have `status: 'failed'`, does not transition (remains `TRIAGING`)
   - Otherwise (still pending/running), does nothing

9. **Define `runScope` internalAction** — First triage pass:
   - `args: { submissionId: v.id('submissions'), triageRunId: v.string(), pdfStorageId: v.id('_storage'), attemptCount: v.optional(v.number()) }`
   - Fetches PDF from storage via `ctx.storage.getUrl(args.pdfStorageId)`
   - Downloads PDF content via `fetch`
   - Extracts text with `unpdf`'s `extractText(new Uint8Array(buffer))`
   - Marks the report as `running` via `markRunning` with current `attemptCount`
   - Calls `generateObject` with scope-analysis prompt and Zod schema
   - Writes result via `writeResult`
   - Schedules `runFormatting` with `{ submissionId, triageRunId, extractedText }`
   - On error: if `attemptCount < 3`, re-schedules self with incremented `attemptCount` and exponential delay; otherwise marks failed

10. **Define `runFormatting` internalAction** — Second triage pass:
    - `args: { submissionId: v.id('submissions'), triageRunId: v.string(), extractedText: v.string(), attemptCount: v.optional(v.number()) }`
    - Marks running, calls `generateObject` with formatting-check prompt
    - Writes result, schedules `runCitations` with `{ submissionId, triageRunId, extractedText }`
    - On error: retry or fail

11. **Define `runCitations` internalAction** — Third triage pass:
    - `args: { submissionId: v.id('submissions'), triageRunId: v.string(), extractedText: v.string(), attemptCount: v.optional(v.number()) }`
    - Marks running, calls `generateObject` with citation-analysis prompt
    - Writes result, schedules `runClaims` with `{ submissionId, triageRunId, extractedText }`
    - On error: retry or fail

12. **Define `runClaims` internalAction** — Fourth and final triage pass:
    - `args: { submissionId: v.id('submissions'), triageRunId: v.string(), extractedText: v.string(), attemptCount: v.optional(v.number()) }`
    - Marks running, calls `generateObject` with claims-analysis prompt
    - Writes result, calls `completeTriageRun` via `ctx.runMutation(internal.triage.completeTriageRun, ...)` to check if all passes finished
    - On error: retry or fail

13. **Define `getBySubmission` query** — Returns all triage reports for a submission:
    - `args: { submissionId: v.id('submissions') }`
    - Uses `withUser` wrapper
    - Returns ordered by pass sequence using client-side sort

14. **Define `getProgress` query** — Returns triage progress summary:
    - `args: { submissionId: v.id('submissions') }`
    - Uses `withUser` wrapper
    - Returns `{ total, complete, running, failed, pending }` counts

15. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Triage result Zod schema (for `generateObject`)

```typescript
import { z } from 'zod'

const triageResultSchema = z.object({
  finding: z.string().describe('A concise summary of the analysis finding'),
  severity: z.enum(['low', 'medium', 'high']).describe(
    'low = no issues, medium = minor issues, high = significant concerns'
  ),
  recommendation: z.string().describe(
    'Editor-facing recommendation based on the finding'
  ),
})
```

### LLM prompts (one per pass)

**Scope pass system prompt:**
```
You are a triage assistant for the Alignment Journal, a peer-reviewed journal focused on theoretical AI alignment research. Analyze the following paper text and assess its scope fit.

The journal's focus areas are:
- Theoretical AI alignment: agency, understanding, asymptotic behavior of advanced synthetic agents
- Conceptual and mathematically abstract ideas transcending contemporary architectures
- Empirical work is welcome but no emphasis on SOTA benchmarks
- Out of scope: AI governance, deployment, applied mechinterp, evaluations, societal impact

Assess whether the paper falls within scope. Consider the paper's core thesis, methodology, and contribution area.
```

**Formatting pass system prompt:**
```
You are a triage assistant for the Alignment Journal. Analyze the following paper text for formatting and completeness issues.

Check for:
- Abstract present and well-structured
- Clear section structure (introduction, related work, methodology, results/analysis, conclusion)
- References section present and formatted
- Page numbers present
- Author affiliations included
- Figures/tables referenced in text

Report any formatting or completeness issues found.
```

**Citations pass system prompt:**
```
You are a triage assistant for the Alignment Journal. Analyze the following paper text for citation quality.

Check for:
- Extract key citations referenced in the paper
- Flag any citations that appear incomplete (missing year, venue, or author)
- Identify citations that may be unresolvable (non-standard format, missing from common databases)
- Note the total approximate citation count

Report on citation quality and any issues found.
```

**Claims pass system prompt:**
```
You are a triage assistant for the Alignment Journal. Analyze the following paper text for technical claims and evidence quality.

Check for:
- Identify the key technical claims made by the paper (2-5 main claims)
- For each claim, assess whether the paper provides supporting evidence, proofs, or arguments
- Flag claims that appear unsupported or under-argued
- Note whether the methodology is clearly described and reproducible

Report on the quality of the paper's technical argumentation.
```

### Convex function signatures

```typescript
// convex/triage.ts
"use node";

import { v } from 'convex/values'
import { internalAction, internalMutation, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { withUser } from './helpers/auth'
import { assertTransition } from './helpers/transitions'
import { notFoundError } from './helpers/errors'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

// --- Internal mutation: core triage trigger (called from submissions.create) ---
export const startTriageInternal = internalMutation({
  args: { submissionId: v.id('submissions') },
  returns: v.string(),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get('submissions', args.submissionId)
    if (!submission) throw notFoundError('Submission', args.submissionId)
    assertTransition(submission.status, 'TRIAGING')
    await ctx.db.patch(args.submissionId, { status: 'TRIAGING', updatedAt: Date.now() })

    const triageRunId = crypto.randomUUID()
    const now = Date.now()
    const passes = ['scope', 'formatting', 'citations', 'claims'] as const
    for (const passName of passes) {
      await ctx.db.insert('triageReports', {
        submissionId: args.submissionId,
        triageRunId,
        passName,
        status: 'pending',
        idempotencyKey: `${args.submissionId}_${triageRunId}_${passName}`,
        attemptCount: 0,
        createdAt: now,
      })
    }

    if (!submission.pdfStorageId) throw notFoundError('PDF storage ID')
    await ctx.scheduler.runAfter(0, internal.triage.runScope, {
      submissionId: args.submissionId,
      triageRunId,
      pdfStorageId: submission.pdfStorageId,
    })
    return triageRunId
  },
})

// --- Public mutation: manual re-triage ---
export const startTriage = mutation({
  args: { submissionId: v.id('submissions') },
  returns: v.string(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      const submission = await ctx.db.get('submissions', args.submissionId)
      if (!submission) throw notFoundError('Submission', args.submissionId)
      assertTransition(submission.status, 'TRIAGING')
      await ctx.db.patch(args.submissionId, { status: 'TRIAGING', updatedAt: Date.now() })

      const triageRunId = crypto.randomUUID()
      const now = Date.now()
      const passes = ['scope', 'formatting', 'citations', 'claims'] as const
      for (const passName of passes) {
        await ctx.db.insert('triageReports', {
          submissionId: args.submissionId,
          triageRunId,
          passName,
          status: 'pending',
          idempotencyKey: `${args.submissionId}_${triageRunId}_${passName}`,
          attemptCount: 0,
          createdAt: now,
        })
      }

      if (!submission.pdfStorageId) throw notFoundError('PDF storage ID')
      await ctx.scheduler.runAfter(0, internal.triage.runScope, {
        submissionId: args.submissionId,
        triageRunId,
        pdfStorageId: submission.pdfStorageId,
      })
      return triageRunId
    },
  ),
})

// --- Internal mutations for result writes ---
export const writeResult = internalMutation({
  args: {
    idempotencyKey: v.string(),
    result: v.object({
      finding: v.string(),
      severity: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
      recommendation: v.string(),
    }),
    completedAt: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query('triageReports')
      .withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', args.idempotencyKey))
      .unique()
    if (!report) return false
    if (report.status === 'complete') return false
    await ctx.db.patch(report._id, {
      status: 'complete',
      result: args.result,
      completedAt: args.completedAt,
    })
    return true
  },
})

export const markRunning = internalMutation({
  args: { idempotencyKey: v.string(), attemptCount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query('triageReports')
      .withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', args.idempotencyKey))
      .unique()
    if (!report) return null
    await ctx.db.patch(report._id, { status: 'running', attemptCount: args.attemptCount })
    return null
  },
})

export const markFailed = internalMutation({
  args: { idempotencyKey: v.string(), lastError: v.string(), attemptCount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query('triageReports')
      .withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', args.idempotencyKey))
      .unique()
    if (!report) return null
    await ctx.db.patch(report._id, {
      status: 'failed',
      lastError: args.lastError,
      attemptCount: args.attemptCount,
    })
    return null
  },
})

export const completeTriageRun = internalMutation({
  args: { submissionId: v.id('submissions'), triageRunId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query('triageReports')
      .withIndex('by_submissionId', (q) => q.eq('submissionId', args.submissionId))
      .collect()
    const runReports = reports.filter((r) => r.triageRunId === args.triageRunId)
    if (runReports.length < 4) return null
    const allComplete = runReports.every((r) => r.status === 'complete')
    if (allComplete) {
      const submission = await ctx.db.get('submissions', args.submissionId)
      if (submission) {
        assertTransition(submission.status, 'TRIAGE_COMPLETE')
        await ctx.db.patch(args.submissionId, {
          status: 'TRIAGE_COMPLETE',
          updatedAt: Date.now(),
        })
      }
    }
    return null
  },
})

// --- Internal actions per triage pass ---
export const runScope = internalAction({
  args: {
    submissionId: v.id('submissions'),
    triageRunId: v.string(),
    pdfStorageId: v.id('_storage'),
    attemptCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = args.attemptCount ?? 1
    const idempotencyKey = `${args.submissionId}_${args.triageRunId}_scope`
    try {
      // 1. Fetch PDF and extract text
      const pdfUrl = await ctx.storage.getUrl(args.pdfStorageId)
      if (!pdfUrl) throw new Error('PDF not found in storage')
      const pdfResponse = await fetch(pdfUrl)
      const pdfBuffer = await pdfResponse.arrayBuffer()
      const { text: extractedText } = await extractText(new Uint8Array(pdfBuffer))

      // 2. Mark running
      await ctx.runMutation(internal.triage.markRunning, { idempotencyKey, attemptCount: attempt })

      // 3. Handle empty text
      if (!extractedText || extractedText.trim().length === 0) {
        await ctx.runMutation(internal.triage.writeResult, {
          idempotencyKey,
          result: { finding: 'No extractable text found in the PDF', severity: 'high' as const, recommendation: 'Request the author to resubmit with a text-based PDF' },
          completedAt: Date.now(),
        })
        await ctx.scheduler.runAfter(0, internal.triage.runFormatting, {
          submissionId: args.submissionId, triageRunId: args.triageRunId, extractedText: '',
        })
        return null
      }

      // 4. Call generateObject for scope analysis
      const truncatedText = extractedText.slice(0, 100_000)
      const { object: result } = await generateObject({
        model: anthropic('claude-sonnet-4-5-20250929'),
        schema: triageResultSchema,
        system: SCOPE_SYSTEM_PROMPT,
        prompt: `Analyze the following paper:\n\n${truncatedText}`,
      })

      // 5. Write result
      await ctx.runMutation(internal.triage.writeResult, {
        idempotencyKey, result, completedAt: Date.now(),
      })

      // 6. Schedule next pass
      await ctx.scheduler.runAfter(0, internal.triage.runFormatting, {
        submissionId: args.submissionId, triageRunId: args.triageRunId, extractedText: truncatedText,
      })
    } catch (error) {
      if (attempt < 3) {
        const delayMs = 1000 * Math.pow(2, attempt - 1)
        await ctx.scheduler.runAfter(delayMs, internal.triage.runScope, {
          ...args, attemptCount: attempt + 1,
        })
      } else {
        await ctx.runMutation(internal.triage.markFailed, {
          idempotencyKey, lastError: 'LLM analysis failed for scope pass', attemptCount: attempt,
        })
      }
    }
    return null
  },
})

// runFormatting, runCitations, runClaims follow the same pattern
// (receiving extractedText as arg, using their respective system prompts)

// --- Queries ---
export const getBySubmission = query({
  args: { submissionId: v.id('submissions') },
  returns: v.array(v.object({
    _id: v.id('triageReports'),
    passName: v.union(v.literal('scope'), v.literal('formatting'), v.literal('citations'), v.literal('claims')),
    status: v.union(v.literal('pending'), v.literal('running'), v.literal('complete'), v.literal('failed')),
    result: v.optional(v.object({
      finding: v.string(),
      severity: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
      recommendation: v.string(),
    })),
    lastError: v.optional(v.string()),
    attemptCount: v.number(),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      const reports = await ctx.db
        .query('triageReports')
        .withIndex('by_submissionId', (q) => q.eq('submissionId', args.submissionId))
        .collect()
      const passOrder = { scope: 0, formatting: 1, citations: 2, claims: 3 } as const
      const sorted = [...reports].sort(
        (a, b) => passOrder[a.passName] - passOrder[b.passName],
      )
      return sorted.map((r) => ({
        _id: r._id,
        passName: r.passName,
        status: r.status,
        result: r.result,
        lastError: r.lastError,
        attemptCount: r.attemptCount,
        completedAt: r.completedAt,
        createdAt: r.createdAt,
      }))
    },
  ),
})

export const getProgress = query({
  args: { submissionId: v.id('submissions') },
  returns: v.object({
    total: v.number(),
    complete: v.number(),
    running: v.number(),
    failed: v.number(),
    pending: v.number(),
  }),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { submissionId: Id<'submissions'> },
    ) => {
      const reports = await ctx.db
        .query('triageReports')
        .withIndex('by_submissionId', (q) => q.eq('submissionId', args.submissionId))
        .collect()
      return {
        total: reports.length,
        complete: reports.filter((r) => r.status === 'complete').length,
        running: reports.filter((r) => r.status === 'running').length,
        failed: reports.filter((r) => r.status === 'failed').length,
        pending: reports.filter((r) => r.status === 'pending').length,
      }
    },
  ),
})
```

### Modifications to `convex/submissions.ts`

```typescript
// Add to imports:
import { internal } from './_generated/api'

// In the `create` mutation handler, after the ctx.db.insert call:
const submissionId = await ctx.db.insert('submissions', { ... })

// Automatically trigger triage pipeline
await ctx.scheduler.runAfter(0, internal.triage.startTriageInternal, {
  submissionId,
})

return submissionId
```

### PDF text extraction pattern

```typescript
import { extractText } from 'unpdf'

// Inside runScope action (pdfStorageId is passed directly in args):
const pdfUrl = await ctx.storage.getUrl(args.pdfStorageId)
if (!pdfUrl) throw new Error('PDF not found in storage')
const pdfResponse = await fetch(pdfUrl)
const pdfBuffer = await pdfResponse.arrayBuffer()
const { text } = await extractText(new Uint8Array(pdfBuffer))
```

### LLM call pattern

```typescript
import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'

const triageResultSchema = z.object({
  finding: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  recommendation: z.string(),
})

const { object: result } = await generateObject({
  model: anthropic('claude-sonnet-4-5-20250929'),
  schema: triageResultSchema,
  system: SCOPE_SYSTEM_PROMPT,
  prompt: `Analyze the following paper:\n\n${extractedText.slice(0, 100_000)}`,
})
```

### Retry pattern

Each action tracks its own attempt count via args (not database state). On error, the action re-schedules itself with an incremented `attemptCount` arg. The `markRunning` mutation records the current attempt count. On terminal failure, `markFailed` writes the final count. This avoids the need for a separate `incrementAttempt` mutation.

```typescript
// Inside each triage action handler:
const attempt = args.attemptCount ?? 1
const idempotencyKey = `${args.submissionId}_${args.triageRunId}_${passName}`

try {
  await ctx.runMutation(internal.triage.markRunning, { idempotencyKey, attemptCount: attempt })
  const result = await analysisFn(args.extractedText)
  await ctx.runMutation(internal.triage.writeResult, {
    idempotencyKey,
    result,
    completedAt: Date.now(),
  })
  // Schedule next pass (or complete triage run for final pass)
  if (nextAction) {
    await ctx.scheduler.runAfter(0, nextAction, {
      submissionId: args.submissionId,
      triageRunId: args.triageRunId,
      extractedText: args.extractedText,
    })
  } else {
    // Final pass — check if all passes are complete
    await ctx.runMutation(internal.triage.completeTriageRun, {
      submissionId: args.submissionId,
      triageRunId: args.triageRunId,
    })
  }
} catch (error) {
  if (attempt < 3) {
    const delayMs = 1000 * Math.pow(2, attempt - 1)
    await ctx.scheduler.runAfter(delayMs, /* self action ref */, {
      ...args,
      attemptCount: attempt + 1,
    })
  } else {
    const safeMessage = `LLM analysis failed for ${passName} pass after 3 attempts`
    await ctx.runMutation(internal.triage.markFailed, {
      idempotencyKey,
      lastError: safeMessage,
      attemptCount: attempt,
    })
  }
}
```

### Environment variables required

| Variable | Where | Purpose |
|----------|-------|---------|
| `ANTHROPIC_API_KEY` | Convex Dashboard env vars | API key for Claude Sonnet 4.5 via `@ai-sdk/anthropic` |

The `@ai-sdk/anthropic` provider reads `ANTHROPIC_API_KEY` from `process.env` automatically. No additional configuration needed.

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM API rate limits or timeouts | Pipeline stalls on a pass | Bounded exponential backoff (3 attempts, 1s/2s/4s) with terminal failure handling |
| PDF has no extractable text (scanned images) | Scope pass produces empty analysis | Detect empty text and write a "high" severity finding; continue pipeline |
| Large PDFs exceed LLM context window | Truncated or failed analysis | Truncate extracted text to 100K characters before sending to LLM |
| `unpdf` extraction fails on malformed PDFs | Pipeline crashes | Catch extraction errors, write "failed" with sanitized error message |
| Duplicate triage triggers | Double-writes, wasted API calls | Idempotency keys prevent duplicate result writes; `assertTransition` prevents re-triggering from non-SUBMITTED status |
| Raw API errors leak to client tables | Security/UX issue | Sanitize all error messages before writing to `lastError`; only structured results go to `result` |
| Actions exceed 10min Convex timeout | Pass times out | Each pass is a separate action with its own 10min budget; paper text is truncated to prevent oversized prompts |
| `"use node"` directive missing | Runtime crash in Convex | Enforced as first line of `triage.ts`; lint check in dev notes |

### Dependencies on this story

- **Story 2.4 (Real-Time Triage Progress and Report Display):** Consumes `getBySubmission` and `getProgress` queries to show progress indicator and report cards
- **Story 3.1 (Editor Pipeline Dashboard):** Shows triage status per submission in the pipeline view
- **Story 3.2 (Submission Detail View with Triage Results):** Displays full triage report cards on the editor's submission detail page

### What "done" looks like

- A `convex/triage.ts` file exists with `"use node";` as the first line
- `startTriage` mutation: validates SUBMITTED status, transitions to TRIAGING, creates 4 pending triage report records, schedules the first action
- 4 `internalAction` functions (`runScope`, `runFormatting`, `runCitations`, `runClaims`): each extracts insight via `generateObject`, writes results, and schedules the next
- `runScope` fetches PDF from Convex storage and extracts text via `unpdf`
- All LLM calls use `@ai-sdk/anthropic` with Claude Sonnet 4.5 and structured Zod output
- Results are written idempotently via `idempotencyKey` index — retried passes don't overwrite
- Failed passes retry with exponential backoff (max 3 attempts) and write sanitized `lastError` on terminal failure
- `completeTriageRun` transitions `TRIAGING → TRIAGE_COMPLETE` only when all 4 passes are complete
- `getBySubmission` and `getProgress` queries are exported for the frontend (story 2.4)
- Both queries use `withUser` wrapper and define `args` and `returns` validators
- External API responses are sanitized — no raw API errors in client-visible fields
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The `"use node";` directive MUST be the first line of `convex/triage.ts` — not after imports, not after comments. This enables the Node.js runtime required by `unpdf`, `ai`, and `@ai-sdk/anthropic`.
- `startTriage` uses `withUser` (not `withAuthor`) because the submission creation flow may be extended in the future to allow editors to trigger re-triage. The `assertTransition` call is the real guard.
- Internal functions (`internalAction`, `internalMutation`) do NOT use auth wrappers — they are only callable from server-side code, never from the client.
- The `extractedText` is passed between actions as a string argument. This is acceptable because Convex action arguments are serialized via the same transport as regular function args. For very large papers, the text is truncated to 100K characters.
- The Zod schema for `generateObject` is defined inline in the action (not imported from a shared file) because it's Vercel AI SDK-specific and only used server-side.
- Import conventions: value imports before type imports, separate `import type` statements, `Array<T>` syntax.
- The `crypto.randomUUID()` function is available in the Node.js runtime enabled by `"use node";`.
- Pass sequence is fixed: scope → formatting → citations → claims. This ordering is intentional — scope analysis first provides early signal to editors whether the paper even fits the journal, before spending time on formatting/citations/claims.
- Each triage action should be independently testable — they take explicit args and return via mutations. Integration testing can mock the LLM calls.
- The `getBySubmission` query sorts by pass order client-side because the `by_submissionId` index doesn't include `passName`. This is acceptable at 4 records per submission.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 2 spec | Sprint Agent |
| 2026-02-08 | Fix: add `startTriageInternal` internalMutation + wire automatic trigger from `submissions.create`; pass `pdfStorageId` directly in `runScope` args (avoid non-existent internal query); add `attemptCount` to `markRunning` args (replace missing `incrementAttempt` mutation); track attempts via action args; standardize `ctx.db.get('submissions', id)` 2-arg pattern; add explicit `submissions.ts` modification to wire trigger; add typed handler signatures on public mutations/queries | Sprint Agent |
