# Epic 5 Traceability Matrix: Reviewer Abstract & Publication

**Generated:** 2026-02-08
**Epic:** 5 - Reviewer Abstract & Publication
**Stories:** 3 (5-1, 5-2, 5-3)
**Status:** All stories marked `done` in sprint-status.yaml

---

## Story 5-1: Reviewer Abstract Drafting and Signing

### AC1: Abstract drafting interface for selected reviewer

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1.1 | "Abstract" tab appears in ReviewPanel when `submissionStatus === 'ACCEPTED'` | PASS | `app/features/review/review-panel.tsx:45` - `const showAbstractTab = submissionStatus === 'ACCEPTED'`; line 60-65 conditionally renders the tab trigger |
| 1.2 | ReviewPanel accepts `submissionStatus` prop | PASS | `app/features/review/review-panel.tsx:35,43` - `submissionStatus: string` in props; `app/routes/review/$submissionId.tsx:109` passes `submissionStatus={submission.status}` |
| 1.3 | AbstractDraftForm renders in the Abstract tab | PASS | `app/features/review/review-panel.tsx:90-93` - `<AbstractDraftForm submissionId={submissionId} />` inside conditional TabsContent |
| 1.4 | AbstractDraftForm shows loading state while query is pending | PASS | `app/features/review/abstract-draft-form.tsx:72-78` - shows "Loading..." when `abstractData === undefined` |
| 1.5 | AbstractDraftForm shows "No abstract assignment" when `getBySubmission` returns null | PASS | `app/features/review/abstract-draft-form.tsx:80-88` - "No abstract assignment for this submission yet." |
| 1.6 | AbstractDraftForm shows read-only view for non-assigned viewers | PASS | `app/features/review/abstract-draft-form.tsx:90-113` - renders read-only card when `!abstractData.isOwnAbstract` |
| 1.7 | Prestigious header: "You've been selected to write the published abstract for this paper" | PASS | `app/features/review/abstract-draft-form.tsx:348-350` - exact text in header |
| 1.8 | Guidance text: "Write the abstract a potential reader would most want to read..." | PASS | `app/features/review/abstract-draft-form.tsx:352-356` - guidance text with word count range |
| 1.9 | Textarea uses `font-serif` class for Newsreader serif font | PASS | `app/features/review/abstract-draft-form.tsx:409` - `className="min-h-[200px] font-serif text-base leading-[1.6]"` |
| 1.10 | AwardIcon present in header | PASS | `app/features/review/abstract-draft-form.tsx:343-345` - `<AwardIcon className="mt-0.5 size-5 shrink-0 text-primary">` |

### AC2: Auto-save with 500ms debounce

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 2.1 | 500ms debounce timer before triggering save | PASS | `app/features/review/abstract-draft-form.tsx:41` - `const DEBOUNCE_MS = 500`; lines 257-261 `setTimeout(..., DEBOUNCE_MS)` |
| 2.2 | SaveIndicator component reused from review feature | PASS | `app/features/review/abstract-draft-form.tsx:20` - imports `SaveIndicator`; line 374 renders `<SaveIndicator state={saveState} />` |
| 2.3 | Optimistic concurrency via `revision` field | PASS | `convex/reviewerAbstracts.ts:257-258` - checks `abstract.revision !== args.expectedRevision`, throws `versionConflictError()` |
| 2.4 | Mutex serializes concurrent saves (`saveMutexRef`) | PASS | `app/features/review/abstract-draft-form.tsx:151` - `saveMutexRef`; line 213-220 awaits previous mutex before save |
| 2.5 | `pendingSaveRef` prevents server sync from overwriting in-flight edits | PASS | `app/features/review/abstract-draft-form.tsx:152` - `pendingSaveRef`; line 161 checks it in sync effect |
| 2.6 | Version conflict detection shows reload/keep options | PASS | `app/features/review/abstract-draft-form.tsx:379-401` - conflict banner with "Reload server version" and "Keep my version" buttons |
| 2.7 | Optimistic update via `.withOptimisticUpdate()` on `updateContent` mutation | PASS | `app/features/review/abstract-draft-form.tsx:183-202` - `useMutation(...).withOptimisticUpdate()` with `localStore.setQuery` |
| 2.8 | `wordCount` computed server-side on each save | PASS | `convex/reviewerAbstracts.ts:26-28` - `countWords()` function; lines 268,276 - `wordCount: countWords(args.content)` in `updateContent` patch |
| 2.9 | `updateContent` mutation defines `args` and `returns` validators | PASS | `convex/reviewerAbstracts.ts:213-218` - `args: { submissionId, content, expectedRevision }`, `returns: v.object({ revision: v.number() })` |
| 2.10 | Content length validation <= 5000 characters | PASS | `convex/reviewerAbstracts.ts:251-255` - `args.content.length > 5000` check |

### AC3: Word count validation

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 3.1 | Live word counter shows current count | PASS | `app/features/review/abstract-draft-form.tsx:43-60` - `WordCounter` component; line 375 renders `<WordCounter count={wordCount} />` |
| 3.2 | Counter shows amber color when below 150 words | PASS | `app/features/review/abstract-draft-form.tsx:44` - `let colorClass = 'text-amber-500'` (default); line 45 - `hint = '150 min'` |
| 3.3 | Counter shows green color when between 150-500 words | PASS | `app/features/review/abstract-draft-form.tsx:47-49` - `colorClass = 'text-green-600 dark:text-green-400'` when in range |
| 3.4 | Counter shows red color when above 500 words | PASS | `app/features/review/abstract-draft-form.tsx:50-52` - `colorClass = 'text-red-500'`, `hint = '500 max'` |
| 3.5 | "Submit Abstract" button disabled when word count outside 150-500 range | PASS | `app/features/review/abstract-draft-form.tsx:157` - `isWordCountValid` check; line 454 - `disabled={!isWordCountValid}` on submit button |
| 3.6 | `submitAbstract` mutation validates word count server-side | PASS | `convex/reviewerAbstracts.ts:385-392` - `abstract.wordCount < ABSTRACT_MIN_WORDS || abstract.wordCount > ABSTRACT_MAX_WORDS` validation |
| 3.7 | Word count algorithm consistent: `text.trim().split(/\s+/).filter(Boolean).length` | PASS | `convex/reviewerAbstracts.ts:26-28` - server-side `countWords`; client imports `countWords` from `review-section-field.tsx` (same algorithm) |

### AC4: Signing choice

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 4.1 | Switch toggle with label: "Sign this abstract with your name" | PASS | `app/features/review/abstract-draft-form.tsx:419-431` - `<Switch>` with `<Label>` "Sign this abstract with your name" |
| 4.2 | Default is off (anonymous) -- `isSigned: false` in `createDraft` | PASS | `convex/reviewerAbstracts.ts:186` - `isSigned: false` in initial record |
| 4.3 | When on, preview shows: "Published as: [Reviewer Name]" | PASS | `app/features/review/abstract-draft-form.tsx:434-436` - `Published as: {reviewerName}` when `localSigned` is true |
| 4.4 | When off, preview shows: "Published as: Anonymous Reviewer" | PASS | `app/features/review/abstract-draft-form.tsx:439-441` - `Published as: Anonymous Reviewer` when `localSigned` is false |
| 4.5 | Toggle calls `updateSigning` mutation immediately (no debounce) | PASS | `app/features/review/abstract-draft-form.tsx:276-279` - `handleSigningToggle` calls `updateSigningMutation` directly |
| 4.6 | Signing toggle disabled when abstract is approved | PASS | `app/features/review/abstract-draft-form.tsx:423` - `disabled={!isEditable}` where `isEditable = status !== 'approved'` (line 155) |
| 4.7 | `updateSigning` validates status is not `approved` | PASS | `convex/reviewerAbstracts.ts:320-324` - `if (abstract.status === 'approved') throw validationError(...)` |
| 4.8 | `updateSigning` defines `args` and `returns` validators | PASS | `convex/reviewerAbstracts.ts:293-297` - both defined |

### AC5: Abstract submission

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 5.1 | "Submit Abstract" button visible in `drafting` status | PASS | `app/features/review/abstract-draft-form.tsx:450-458` - button only renders when `status === 'drafting'` |
| 5.2 | AlertDialog confirmation with expected text | PASS | `app/features/review/abstract-draft-form.tsx:462-484` - "Submit your abstract for editor review? You can continue editing until the editor approves it." |
| 5.3 | `submitAbstract` mutation transitions from `drafting` to `submitted` | PASS | `convex/reviewerAbstracts.ts:375-379` - validates `status === 'drafting'`, patches `status: 'submitted'` at line 396 |
| 5.4 | Success banner: "Submitted -- awaiting editor approval. You can still make edits." | PASS | `app/features/review/abstract-draft-form.tsx:362-370` - shown when `submitSuccess || status === 'submitted'` with the exact text |
| 5.5 | Form remains editable after submission (Tier 2) | PASS | `app/features/review/abstract-draft-form.tsx:155` - `isEditable = status !== 'approved'` (submitted is editable) |
| 5.6 | Audit trail: `abstract_submitted` logged | PASS | `convex/reviewerAbstracts.ts:402-407` - `scheduler.runAfter(0, internal.audit.logAction, { action: 'abstract_submitted' })` |
| 5.7 | `submitAbstract` is idempotent if already `submitted` | PASS | `convex/reviewerAbstracts.ts:371-373` - `if (abstract.status === 'submitted') return null` |
| 5.8 | `submitAbstract` checks optimistic concurrency | PASS | `convex/reviewerAbstracts.ts:381-383` - `abstract.revision !== args.expectedRevision` check |
| 5.9 | `submitAbstract` defines `args` and `returns` validators | PASS | `convex/reviewerAbstracts.ts:343-347` - both defined |

### AC6: Editable until editor approval

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 6.1 | Submitted abstract content is still fully editable | PASS | `app/features/review/abstract-draft-form.tsx:155` - `isEditable = status !== 'approved'`; textarea `disabled={!isEditable}` at line 410 |
| 6.2 | SaveIndicator and auto-save continue to function in submitted state | PASS | Architecture: auto-save logic has no status guard other than `isEditable`; `updateContent` mutation allows `submitted` status (line 245-249 only blocks `approved`) |
| 6.3 | Signing toggle continues to function in submitted state | PASS | `convex/reviewerAbstracts.ts:320` - only blocks `approved`, allows `submitted` |
| 6.4 | Status banner shows for submitted state | PASS | `app/features/review/abstract-draft-form.tsx:362` - `status === 'submitted'` triggers the submitted banner |
| 6.5 | Once approved, form becomes read-only with "Approved" badge and lock indicator | PASS | `app/features/review/abstract-draft-form.tsx:298-335` - approved state renders read-only view with Badge "Approved" + CheckIcon and LockIcon "Locked -- approved by editor" |

### AC7: Editor abstract approval

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 7.1 | `approveAbstract` requires editor-level role (`EDITOR_ROLES`) | PASS | `convex/reviewerAbstracts.ts:426-432` - `EDITOR_ROLES.includes()` check, throws `unauthorizedError` |
| 7.2 | Transitions from `submitted` to `approved` | PASS | `convex/reviewerAbstracts.ts:445-449` - validates `status !== 'submitted'` throws; line 451-453 patches `status: 'approved'` |
| 7.3 | Rejects if status is not `submitted` | PASS | `convex/reviewerAbstracts.ts:445-449` - `if (abstract.status !== 'submitted') throw validationError(...)` |
| 7.4 | Audit trail: `abstract_approved` logged | PASS | `convex/reviewerAbstracts.ts:457-462` - `scheduler.runAfter(0, internal.audit.logAction, { action: 'abstract_approved' })` |
| 7.5 | Read-only view shows "Approved" badge with CheckIcon | PASS | `app/features/review/abstract-draft-form.tsx:306-309` - `<Badge>` with `<CheckIcon>` "Approved" |
| 7.6 | `approveAbstract` defines `args` and `returns` validators | PASS | `convex/reviewerAbstracts.ts:419-420` - both defined |

### AC8: Create draft (editor action)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 8.1 | `createDraft` requires editor-level role | PASS | `convex/reviewerAbstracts.ts:125-131` - `EDITOR_ROLES.includes()` check |
| 8.2 | Creates record with correct initial values | PASS | `convex/reviewerAbstracts.ts:181-191` - `content: ''`, `wordCount: 0`, `isSigned: false`, `status: 'drafting'`, `revision: 0` |
| 8.3 | Validates submission status is `ACCEPTED` | PASS | `convex/reviewerAbstracts.ts:141-145` - `submission.status !== 'ACCEPTED'` check |
| 8.4 | Validates reviewer has submitted or locked review | PASS | `convex/reviewerAbstracts.ts:148-165` - queries review record, validates `status === 'submitted' || status === 'locked'` |
| 8.5 | Validates no abstract already exists for this submission | PASS | `convex/reviewerAbstracts.ts:168-178` - queries existing, throws if found |
| 8.6 | Audit trail: `abstract_assigned` with reviewer name | PASS | `convex/reviewerAbstracts.ts:194-201` - `action: 'abstract_assigned'`, `details: 'Reviewer: ${reviewer?.name}'` |
| 8.7 | Returns `{ _id }` of created record | PASS | `convex/reviewerAbstracts.ts:203` - `return { _id: id }` |
| 8.8 | `createDraft` defines `args` and `returns` validators | PASS | `convex/reviewerAbstracts.ts:114-118` - both defined |

### Schema & Infrastructure

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| S1 | `by_submissionId_reviewerId` composite index on `reviewerAbstracts` | PASS | `convex/schema.ts:146` - `.index('by_submissionId_reviewerId', ['submissionId', 'reviewerId'])` |
| S2 | `authorAccepted` and `authorAcceptedAt` optional fields on schema | PASS | `convex/schema.ts:139-140` - `authorAccepted: v.optional(v.boolean())`, `authorAcceptedAt: v.optional(v.number())` |
| S3 | `AbstractDraftForm` exported from barrel | PASS | `app/features/review/index.ts:1` - `export { AbstractDraftForm } from './abstract-draft-form'` |
| S4 | `convex/reviewerAbstracts.ts` created with all 6 functions | PASS | File exists with: `getBySubmission`, `createDraft`, `updateContent`, `updateSigning`, `submitAbstract`, `approveAbstract`, `authorAcceptAbstract` (7 functions total, 6 from 5-1 + 1 from 5-2) |
| S5 | `getBySubmission` query returns `authorAccepted` and `authorAcceptedAt` | PASS | `convex/reviewerAbstracts.ts:45-46` - both in return validator; lines 97-98 in response object |

**Story 5-1 Summary: 8 ACs + schema, 46 sub-criteria -- ALL PASS**

---

## Story 5-2: Author Acceptance of Reviewer Abstract

### AC1: Author sees reviewer abstract for comparison

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1.1 | "Reviewer Abstract" section appears below submission's own abstract for ACCEPTED submissions | PASS | `app/features/submissions/submission-detail.tsx:65-67` - `{submission.status === 'ACCEPTED' && (<AbstractReviewPanel submissionId={submissionId} />)}` placed after the Abstract section (lines 55-62) |
| 1.2 | `AbstractReviewPanel` renders nothing when no abstract exists | PASS | `app/features/submissions/abstract-review-panel.tsx:40-42` - returns `null` when `abstractData === undefined || abstractData === null` |
| 1.3 | `AbstractReviewPanel` renders nothing when abstract status is `drafting` | PASS | `app/features/submissions/abstract-review-panel.tsx:45-47` - returns `null` when `abstractData.status === 'drafting'` |
| 1.4 | Reviewer abstract content rendered in serif font | PASS | `app/features/submissions/abstract-review-panel.tsx:82-84` - `<p className="font-serif text-base leading-relaxed text-foreground">` |
| 1.5 | Reviewer attribution shows real name when signed | PASS | `app/features/submissions/abstract-review-panel.tsx:93-98` - `abstractData.isSigned ? abstractData.reviewerName : 'Anonymous Reviewer'` |
| 1.6 | Reviewer attribution shows "Anonymous Reviewer" when unsigned | PASS | Same line: `'Anonymous Reviewer'` when `!abstractData.isSigned` |
| 1.7 | Abstract status badge shown (Submitted / Approved) | PASS | `app/features/submissions/abstract-review-panel.tsx:75-77` - `<Badge variant="outline">` showing `'Approved'` or `'Submitted'` |
| 1.8 | Word count metadata displayed | PASS | `app/features/submissions/abstract-review-panel.tsx:100` - `<span>{abstractData.wordCount} words</span>` |
| 1.9 | `getBySubmission` returns `authorAccepted` and `authorAcceptedAt` | PASS | `convex/reviewerAbstracts.ts:45-46` - in return validator; lines 97-98 in response |

### AC2: Author accepts the reviewer abstract

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 2.1 | "Accept Abstract" button visible when `authorAccepted` is false/undefined | PASS | `app/features/submissions/abstract-review-panel.tsx:110-145` - renders when `!isAccepted` where `isAccepted = abstractData.authorAccepted === true` (line 60) |
| 2.2 | Clicking opens confirmation AlertDialog | PASS | `app/features/submissions/abstract-review-panel.tsx:112-138` - `AlertDialog` with `AlertDialogTrigger` wrapping the button |
| 2.3 | Confirmation text matches spec | PASS | `app/features/submissions/abstract-review-panel.tsx:124-127` - "Accept this reviewer abstract for publication? This confirms you're satisfied with how your work is represented." |
| 2.4 | Confirming sets `authorAccepted: true` and `authorAcceptedAt` | PASS | `convex/reviewerAbstracts.ts:520-524` - `db.patch` with `authorAccepted: true`, `authorAcceptedAt: Date.now()` |
| 2.5 | After acceptance, green "Accepted" badge with checkmark shown | PASS | `app/features/submissions/abstract-review-panel.tsx:69-74` - green `Badge` with `<CheckIcon>` "Accepted" when `isAccepted` |
| 2.6 | "Accept Abstract" button replaced by accepted confirmation | PASS | `app/features/submissions/abstract-review-panel.tsx:60,110` - `isAccepted` flag controls which section renders; accepted shows badge and timestamp (lines 103-107) |
| 2.7 | `authorAcceptAbstract` validates caller is submission author | PASS | `convex/reviewerAbstracts.ts:490-494` - `submission.authorId !== ctx.user._id` throws `unauthorizedError` |
| 2.8 | `authorAcceptAbstract` rejects if abstract status is `drafting` | PASS | `convex/reviewerAbstracts.ts:509-513` - `abstract.status === 'drafting'` throws `validationError` |
| 2.9 | `authorAcceptAbstract` is idempotent (returns early if already accepted) | PASS | `convex/reviewerAbstracts.ts:516-518` - `if (abstract.authorAccepted === true) return null` |
| 2.10 | Audit trail entry logged: `abstract_author_accepted` | PASS | `convex/reviewerAbstracts.ts:527-532` - `scheduler.runAfter(0, internal.audit.logAction, { action: 'abstract_author_accepted' })` |
| 2.11 | `authorAcceptAbstract` defines `args` and `returns` validators | PASS | `convex/reviewerAbstracts.ts:475-476` - both defined |

### AC3: Author provides feedback via discussion thread

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 3.1 | `DiscussionThread` rendered on submission detail for ACCEPTED submissions | PASS | `app/features/submissions/submission-detail.tsx:70-79` - `submission.status === 'ACCEPTED'` condition renders `<DiscussionThread submissionId={submissionId} />` |
| 3.2 | "Provide Feedback" hint text near abstract review section | PASS | `app/features/submissions/abstract-review-panel.tsx:141-144` - `<MessageSquareIcon>` with "Use the discussion thread below to provide feedback" |
| 3.3 | `DiscussionThread` imported from `~/features/review` (cross-feature) | PASS | `app/features/submissions/submission-detail.tsx:13` - `import { DiscussionThread } from '~/features/review'` |

### AC4: Acceptance cleared on content change

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 4.1 | `updateContent` clears `authorAccepted` when previously true | PASS | `convex/reviewerAbstracts.ts:265-273` - `if (abstract.authorAccepted === true)` patches `authorAccepted: false` |
| 4.2 | `updateContent` clears `authorAcceptedAt` when previously set | PASS | `convex/reviewerAbstracts.ts:272` - patches `authorAcceptedAt: undefined` in the same branch |
| 4.3 | `updateContent` does not touch `authorAccepted` when it was false/undefined | PASS | `convex/reviewerAbstracts.ts:274-281` - `else` branch patches content/wordCount/revision/updatedAt only |

### AC5: Audit trail logging

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 5.1 | `abstract_author_accepted` added to `ACTION_LABELS` in `audit-timeline.tsx` | PASS | `app/features/editor/audit-timeline.tsx:27` - `abstract_author_accepted: 'Author accepted abstract'` |
| 5.2 | `abstract_assigned`, `abstract_submitted`, `abstract_approved` labels present (from 5.1) | PASS | `app/features/editor/audit-timeline.tsx:24-26` - all three labels present: `'Abstract assigned'`, `'Abstract submitted'`, `'Abstract approved'` |
| 5.3 | `AbstractReviewPanel` exported from submissions barrel | PASS | `app/features/submissions/index.ts:1` - `export { AbstractReviewPanel } from './abstract-review-panel'` |

**Story 5-2 Summary: 5 ACs, 25 sub-criteria -- ALL PASS**

---

## Story 5-3: Published Article Page with Dual Abstracts

### AC1: Published article page at `/article/$articleId` with no auth required

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1.1 | `getPublishedArticle` query exists with no auth wrapper (public) | PASS | `convex/articles.ts:34` - `handler: async (ctx, args) => {` -- direct handler, no `withUser` wrapper |
| 1.2 | Query validates `status === 'PUBLISHED'` and throws `notFoundError` | PASS | `convex/articles.ts:36-38` - `if (!submission \|\| submission.status !== 'PUBLISHED') throw notFoundError('Article')` |
| 1.3 | Query returns submission data: `_id`, `title`, `authors`, `abstract`, `keywords` | PASS | `convex/articles.ts:14-19` - all fields in return validator; lines 74-78 in response |
| 1.4 | Query generates PDF URL via `ctx.storage.getUrl` | PASS | `convex/articles.ts:40-42` - `submission.pdfStorageId ? await ctx.storage.getUrl(submission.pdfStorageId) : null` |
| 1.5 | Route `app/routes/article/$articleId.tsx` renders `ArticlePage` with `articleId` param | PASS | `app/routes/article/$articleId.tsx:6-12` - `createFileRoute('/article/$articleId')`, renders `<ArticlePage articleId={articleId as Id<'submissions'>} />` |
| 1.6 | Article layout applies `data-mode="reader"` for warm cream background | PASS | `app/routes/article/route.tsx:13` - `data-mode="reader"` on wrapper div |
| 1.7 | `getPublishedArticle` defines `args` and `returns` validators | PASS | `convex/articles.ts:13-33` - both validators fully defined |

### AC2: DualAbstractDisplay with reviewer abstract first

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 2.1 | `DualAbstractDisplay` renders reviewer abstract first when available | PASS | `app/features/article/dual-abstract-display.tsx:17-50` - reviewer abstract section rendered first in the `space-y-8` container |
| 2.2 | Reviewer abstract has left border accent and elevated surface | PASS | `app/features/article/dual-abstract-display.tsx:20` - `border-l-4 border-primary/40 bg-accent/50` |
| 2.3 | Reviewer abstract text uses `font-serif text-lg leading-[1.7]` | PASS | `app/features/article/dual-abstract-display.tsx:27` - exact classes applied |
| 2.4 | Reviewer attribution displayed below abstract text | PASS | `app/features/article/dual-abstract-display.tsx:30-32` - `{reviewerAbstract.reviewerName}` below content |
| 2.5 | Author abstract rendered in second section on neutral surface | PASS | `app/features/article/dual-abstract-display.tsx:36-48` - second `<section>` with plain `p-6` (no elevated background) |
| 2.6 | Each section uses `<section>` with `aria-labelledby` | PASS | `app/features/article/dual-abstract-display.tsx:19,36` - `<section aria-labelledby="reviewer-abstract-heading">` and `<section aria-labelledby="author-abstract-heading">` |
| 2.7 | When no reviewer abstract, only author abstract section is rendered | PASS | `app/features/article/dual-abstract-display.tsx:53-67` - single `<section>` with author abstract only |
| 2.8 | Author abstract text uses same serif font | PASS | `app/features/article/dual-abstract-display.tsx:44` - `font-serif text-lg leading-[1.7]` on author abstract |

### AC3: Article metadata (authors, date, DOI, CC-BY badge)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 3.1 | Authors displayed with names and affiliations | PASS | `app/features/article/article-metadata.tsx:43-54` - iterates authors, shows `a.name` and `(a.affiliation)` |
| 3.2 | Publication date shows `decidedAt`, falls back to `createdAt` | PASS | `app/features/article/article-metadata.tsx:37` - `const publicationDate = decidedAt ?? createdAt`; line 60 - `Published {formatDate(publicationDate)}` |
| 3.3 | DOI placeholder: "DOI: 10.xxxx/aj.2026.001" | PASS | `app/features/article/article-metadata.tsx:67` - exact text rendered |
| 3.4 | CC-BY 4.0 badge displayed | PASS | `app/features/article/article-metadata.tsx:73-74` - `<Badge variant="secondary">CC-BY 4.0</Badge>` |
| 3.5 | Metadata section appears below title, before abstracts | PASS | `app/features/article/article-page.tsx:28-37` - `<ArticleMetadata>` rendered after title `<h1>`, before `<DualAbstractDisplay>` (line 41) |

### AC4: PDF download with no login required

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 4.1 | "Download PDF" button rendered when `pdfUrl` is available | PASS | `app/features/article/article-metadata.tsx:78-92` - conditional render `{pdfUrl && (...)}` with "Download PDF" text |
| 4.2 | Button uses `<a href={pdfUrl} download={pdfFileName}>` for direct download | PASS | `app/features/article/article-metadata.tsx:81` - `<a href={pdfUrl} download={pdfFileName}>` |
| 4.3 | File name and size shown when available | PASS | `app/features/article/article-metadata.tsx:84-88` - `{pdfFileName && pdfFileSize ? (...{pdfFileName}, {formatFileSize(pdfFileSize)}) : null}` |

### AC5: Reviewer attribution (signed or anonymous)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 5.1 | `getPublishedArticle` returns real name when `isSigned: true` | PASS | `convex/articles.ts:66-67` - `abstract.isSigned ? (reviewer?.name ?? 'Unknown') : 'Anonymous Reviewer'` |
| 5.2 | `getPublishedArticle` returns "Anonymous Reviewer" when `isSigned: false` | PASS | `convex/articles.ts:68` - `'Anonymous Reviewer'` in the false branch |
| 5.3 | Reviewer abstract only included when `status === 'approved' && authorAccepted === true` | PASS | `convex/articles.ts:58-62` - both conditions checked: `abstract.status === 'approved' && abstract.authorAccepted === true` |
| 5.4 | Attribution appears below reviewer abstract text in DualAbstractDisplay | PASS | `app/features/article/dual-abstract-display.tsx:30-32` - `{reviewerAbstract.reviewerName}` rendered after content |

### AC6: Article body typography

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 6.1 | Article title uses `font-serif text-3xl font-bold tracking-tight` | PASS | `app/features/article/article-page.tsx:24` - exact classes applied |
| 6.2 | Abstracts render at `text-lg` with `leading-[1.7]` | PASS | `app/features/article/dual-abstract-display.tsx:27,44` - both abstracts use `text-lg leading-[1.7]` |
| 6.3 | Content area has `max-w-[75ch]` for optimal reading width | PASS | `app/features/article/article-page.tsx:23` - `max-w-[75ch]` on `<main>` |
| 6.4 | Page uses generous margins `py-16 px-6` | PASS | `app/features/article/article-page.tsx:23` - `px-6 py-16` on `<main>` |

### Article Index Page

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| I1 | `listPublished` query exists with no auth wrapper (public) | PASS | `convex/articles.ts:119` - `handler: async (ctx, args) => {` -- direct handler, no wrapper |
| I2 | `listPublished` filters by `PUBLISHED` status via `by_status` index | PASS | `convex/articles.ts:121-122` - `.withIndex('by_status', (idx) => idx.eq('status', 'PUBLISHED'))` |
| I3 | Article index shows paginated list with `usePaginatedQuery` | PASS | `app/routes/article/index.tsx:14-18` - `usePaginatedQuery(api.articles.listPublished, {}, { initialNumItems: 10 })` |
| I4 | Each article card shows: title, first 2 authors, publication date, abstract preview | PASS | `app/routes/article/index.tsx:49-64` - title, `authors.slice(0, 2)`, `formatDate`, `abstractPreview` all rendered |
| I5 | Empty state preserved when no published articles | PASS | `app/routes/article/index.tsx:29-39` - "No published articles yet" with icon |
| I6 | "Load more" button shown when more articles available | PASS | `app/routes/article/index.tsx:68-76` - renders when `status === 'CanLoadMore'` |
| I7 | `listPublished` defines `args` and `returns` validators | PASS | `convex/articles.ts:94-118` - both validators fully defined |
| I8 | Article feature barrel exports all components | PASS | `app/features/article/index.ts:1-3` - exports `ArticleMetadata`, `ArticlePage`, `DualAbstractDisplay` |

**Story 5-3 Summary: 6 ACs + index, 30 sub-criteria -- ALL PASS**

---

## Test Coverage Assessment

### Automated Test Files for Epic 5

| Test Type | File | Status |
|-----------|------|--------|
| Unit tests (convex backend) | None | **NO TESTS** |
| Component tests (React) | None | **NO TESTS** |

**No automated tests exist for any Epic 5 code.** The ATDD checklists for Stories 5-1 and 5-3 have all items marked `[x]` (checked), while Story 5-2's checklist has all items marked `[ ]` (unchecked). All verification was done through code review and manual testing, not automated test execution.

### Existing Project Test Files (for context)

| File | Scope |
|------|-------|
| `app/__tests__/setup.test.ts` | Epic 1 - cn utility |
| `app/__tests__/status-utils.test.ts` | Epic 2 - submission status utils |
| `convex/__tests__/errors.test.ts` | Epic 1 - error helpers |
| `convex/__tests__/transitions.test.ts` | Epic 1 - state machine |
| `convex/__tests__/matching-utils.test.ts` | Epic 3 - matching utils |

The project has 5 test files across 73 passing tests, but none cover Epic 5 functionality.

---

## Summary

### Counts

| Metric | Value |
|--------|-------|
| Total stories | 3 |
| Total ACs | 19 (8 + 5 + 6) + schema/index sections |
| Total sub-criteria verified | 101 |
| ACs with implementation evidence (PASS) | **19 / 19 (100%)** |
| Sub-criteria with PASS status | **101 / 101 (100%)** |
| ACs with automated test coverage | **0 / 19 (0%)** |
| Test files for Epic 5 | **0** |

### Coverage by Story

| Story | ACs | All Implemented | Tests |
|-------|-----|-----------------|-------|
| 5-1: Reviewer abstract drafting and signing | 8 (+schema) | PASS | 0 test files (ATDD checklist marked via code review) |
| 5-2: Author acceptance of reviewer abstract | 5 | PASS | 0 test files (ATDD checklist unchecked) |
| 5-3: Published article page with dual abstracts | 6 (+index) | PASS | 0 test files (ATDD checklist marked via code review) |

### Quality Gate

**CONCERNS**

All 19 acceptance criteria (101 sub-criteria) are fully implemented in the source code and verified through code review. The implementation is thorough, with correct backend validation, frontend rendering, access control, and audit trail integration. However, there are zero automated tests for Epic 5 code.

### Gap Analysis

| Priority | Gap | Affected ACs | Recommendation |
|----------|-----|-------------|----------------|
| P1 | No backend unit tests for `convex/reviewerAbstracts.ts` (optimistic concurrency, word count validation, status guards, author acceptance clearing, ownership checks) | 5-1 AC2, AC3, AC5, AC7, AC8; 5-2 AC2, AC4 | Create `convex/__tests__/reviewerAbstracts.test.ts` covering: revision conflict, word count range rejection, status transition guards, `authorAccepted` clearing on content change, editor role validation on `createDraft`/`approveAbstract`, author ownership on `authorAcceptAbstract`, idempotent submission |
| P1 | No backend unit tests for `convex/articles.ts` (PUBLISHED status guard, reviewer abstract display condition, public access pattern) | 5-3 AC1, AC5 | Create `convex/__tests__/articles.test.ts` covering: non-PUBLISHED rejection, reviewer abstract inclusion only when `approved + authorAccepted`, anonymous reviewer name masking, PDF URL generation |
| P2 | No component tests for `AbstractDraftForm` (auto-save, debounce, conflict resolution, word counter, signing toggle) | 5-1 AC1-AC6 | Create `app/features/review/__tests__/abstract-draft-form.test.tsx` |
| P2 | No component tests for `AbstractReviewPanel` (accept flow, confirmation dialog, status-based rendering) | 5-2 AC1-AC2 | Create `app/features/submissions/__tests__/abstract-review-panel.test.tsx` |
| P2 | No component tests for `DualAbstractDisplay`, `ArticleMetadata`, `ArticlePage` | 5-3 AC2-AC6 | Create component tests in `app/features/article/__tests__/` |

### Recommendations

1. **Highest priority:** Write backend unit tests for `convex/reviewerAbstracts.ts`. This file contains the most critical business logic: optimistic concurrency control, word count validation, status transition guards, ownership-based access control, and the `authorAccepted` clearing mechanism. These are well-defined, testable functions with clear expected behavior.

2. **Second priority:** Write backend unit tests for `convex/articles.ts`. The public queries contain security-sensitive logic (PUBLISHED status gating, reviewer abstract display conditions) that should be verified through automated tests to prevent accidental data exposure.

3. **Lower priority:** Add component tests for the frontend components. The auto-save pattern in `AbstractDraftForm` replicates the `ReviewForm` pattern and is primarily a UX concern, but testing the debounce, conflict resolution, and optimistic update behavior would provide additional confidence.

4. **Process note:** Story 5-2's ATDD checklist has all items unchecked (`[ ]`), indicating formal acceptance testing was never completed against the checklist, despite the story being marked `done`. Stories 5-1 and 5-3 have checked items but verification was through code review only.
