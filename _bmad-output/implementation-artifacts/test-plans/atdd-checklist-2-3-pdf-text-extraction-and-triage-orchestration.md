# ATDD Checklist: Story 2.3 - PDF Text Extraction and Triage Orchestration

## Story Reference
- **Story:** 2-3-pdf-text-extraction-and-triage-orchestration
- **Epic:** 2 - Author Submission & LLM Triage Pipeline

## Test Strategy

This story is backend-only (Convex functions). Testing strategy:
- **Unit tests** for pure helper logic (retry delay calculation, sanitization)
- **Integration behavior** verified via typecheck + lint (Convex functions can't be unit-tested without the Convex runtime)
- **Runtime verification** deferred to dev environment (LLM calls, PDF extraction, scheduler)

## Acceptance Criteria Checklist

### AC1: Triage pipeline trigger on submission creation
- [ ] `startTriageInternal` internalMutation exists with `args: { submissionId: v.id('submissions') }`
- [ ] `startTriageInternal` calls `assertTransition(submission.status, 'TRIAGING')`
- [ ] `startTriageInternal` patches submission status to `TRIAGING`
- [ ] `startTriageInternal` generates a unique `triageRunId` via `crypto.randomUUID()`
- [ ] `startTriageInternal` creates 4 `triageReports` records (scope, formatting, citations, claims) with `status: 'pending'`
- [ ] Each record has `idempotencyKey` of `${submissionId}_${triageRunId}_${passName}`
- [ ] `startTriageInternal` schedules `runScope` via `ctx.scheduler.runAfter(0, ...)`
- [ ] `startTriage` public mutation exists with `withUser` wrapper
- [ ] `submissions.create` schedules `internal.triage.startTriageInternal` after insert

### AC2: PDF text extraction in first triage action
- [ ] `runScope` action fetches PDF via `ctx.storage.getUrl(args.pdfStorageId)`
- [ ] PDF content extracted via `unpdf`'s `extractText`
- [ ] Empty text case writes high-severity finding and continues pipeline
- [ ] Extracted text truncated to 100K characters before LLM call
- [ ] `triage.ts` begins with `"use node";` as first line

### AC3: Four chained LLM triage passes execute in sequence
- [ ] `runScope` calls `generateObject` with scope-analysis prompt
- [ ] `runScope` schedules `runFormatting` with extractedText
- [ ] `runFormatting` calls `generateObject` with formatting prompt
- [ ] `runFormatting` schedules `runCitations` with extractedText
- [ ] `runCitations` calls `generateObject` with citations prompt
- [ ] `runCitations` schedules `runClaims` with extractedText
- [ ] `runClaims` calls `generateObject` with claims prompt
- [ ] `runClaims` calls `completeTriageRun` after writing result

### AC4: Idempotent result writes prevent duplicates
- [ ] `writeResult` looks up record by `by_idempotencyKey` index
- [ ] `writeResult` returns false (no-op) if record already `complete`
- [ ] `writeResult` patches with `status: 'complete'`, `result`, `completedAt` otherwise

### AC5: Retry with bounded exponential backoff
- [ ] Each action tracks `attemptCount` via args (default 1)
- [ ] On error with `attemptCount < 3`, re-schedules with `delayMs = 1000 * Math.pow(2, attempt - 1)`
- [ ] On terminal failure (`attemptCount >= 3`), calls `markFailed` with sanitized error
- [ ] `markRunning` mutation updates status and attempt count
- [ ] `markFailed` mutation updates status, lastError, and attempt count

### AC6: Reactive queries for triage progress
- [ ] `getBySubmission` query returns reports ordered by pass sequence
- [ ] `getBySubmission` uses `withUser` wrapper and defines `args`/`returns` validators
- [ ] `getProgress` query returns `{ total, complete, running, failed, pending }` counts
- [ ] `getProgress` uses `withUser` wrapper and defines `args`/`returns` validators

### AC7: External API response sanitization
- [ ] Only structured `result` object stored (finding, severity, recommendation)
- [ ] Error messages sanitized: "LLM analysis failed for [passName] pass"
- [ ] No raw API metadata, tokens, or model details in stored results

## Verification Commands
```bash
bun run typecheck  # TypeScript compilation
bun run lint       # ESLint
bun run test       # Vitest
```

## Notes
- Convex internal functions cannot be directly unit-tested without the Convex test framework
- LLM integration verified in dev environment via manual trigger
- All function signatures verified via TypeScript type checking
