# Epic 4 Traceability Matrix: Review Process & Semi-Confidential Discussion

**Generated:** 2026-02-08
**Epic:** 4 - Review Process & Semi-Confidential Discussion
**Stories:** 4 (4-1, 4-2, 4-3, 4-4)
**Status:** All stories marked `done` in sprint-status.yaml

---

## Story 4-1: Reviewer Invitation Acceptance and Onboarding

### AC1: Token validation and invitation acceptance

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1.1 | `acceptInvitation` mutation hashes token via SHA-256 and looks up by `by_tokenHash` index | PASS | `convex/invitations.ts:313-318` - calls `hashToken()` (SHA-256), queries `.withIndex('by_tokenHash')` |
| 1.2 | Throws `inviteTokenInvalidError()` when no record found | PASS | `convex/invitations.ts:320-322` - `if (!invite) throw inviteTokenInvalidError()` |
| 1.3 | Throws `inviteTokenInvalidError()` when `revokedAt` is set | PASS | `convex/invitations.ts:324-326` - checks `invite.revokedAt !== undefined` |
| 1.4 | Throws `inviteTokenUsedError()` when `consumedAt` is already set | PASS | `convex/invitations.ts:328-330` - checks `invite.consumedAt !== undefined` |
| 1.5 | Throws `inviteTokenExpiredError()` when `expiresAt < Date.now()` | PASS | `convex/invitations.ts:332-334` - checks `invite.expiresAt < Date.now()` |
| 1.6 | Atomically sets `consumedAt` to `Date.now()` on valid token | PASS | `convex/invitations.ts:344-346` - `db.patch` with `consumedAt: Date.now()` |
| 1.7 | Upgrades user role from `'author'` to `'reviewer'` | PASS | `convex/invitations.ts:349-353` - conditional `db.patch` for role upgrade |
| 1.8 | Does NOT downgrade higher roles | PASS | `convex/invitations.ts:349` - only patches when `ctx.user.role === 'author'` |
| 1.9 | Returns `{ submissionId, reviewerId }` on success | PASS | `convex/invitations.ts:364-367` - returns object with both fields |
| 1.10 | Uses `withUser` wrapper | PASS | `convex/invitations.ts:308` - handler wrapped with `withUser()` |
| 1.11 | Defines both `args` and `returns` validators | PASS | `convex/invitations.ts:301-307` - `args: { token: v.string() }`, `returns: v.object(...)` |

### AC2: Public token status check (pre-auth)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 2.1 | `getInviteStatus` query does NOT require authentication | PASS | `convex/invitations.ts:394` - plain `handler` function, no `withUser` wrapper |
| 2.2 | Returns `'valid'` for valid token | PASS | `convex/invitations.ts:418` |
| 2.3 | Returns `'expired'` for expired token | PASS | `convex/invitations.ts:414-416` |
| 2.4 | Returns `'consumed'` for consumed token | PASS | `convex/invitations.ts:410-412` |
| 2.5 | Returns `'revoked'` for revoked token | PASS | `convex/invitations.ts:406-408` |
| 2.6 | Returns `'invalid'` for unknown token | PASS | `convex/invitations.ts:403` |
| 2.7 | Returns `submissionId` when invite exists | PASS | `convex/invitations.ts:407,411,415,418` - submissionId returned for all non-invalid statuses |
| 2.8 | Defines both `args` and `returns` validators | PASS | `convex/invitations.ts:382-393` - both defined with proper validators |

### AC3: Inline Clerk sign-in/sign-up for new users

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 3.1 | Page shows invitation context card when status is `'valid'` | PASS | `app/routes/review/accept/$token.tsx:72-97` - Card with "You've been invited" |
| 3.2 | Clerk `<SignIn>` renders inline within `<SignedOut>` wrapper | PASS | `app/routes/review/accept/$token.tsx:85-89` - `<SignedOut>` wrapping `<SignIn>` |
| 3.3 | `<SignIn>` uses `fallbackRedirectUrl` set to current page URL | PASS | `app/routes/review/accept/$token.tsx:89` - `fallbackRedirectUrl={/review/accept/${token}}` |
| 3.4 | `<SignedIn>` wrapper contains `AutoAcceptFlow` | PASS | `app/routes/review/accept/$token.tsx:91-93` - `<SignedIn><AutoAcceptFlow>` |
| 3.5 | `useBootstrappedUser()` fires `ensureUser` | PASS | `app/routes/review/accept/$token.tsx:101` - `useBootstrappedUser()` called in AutoAcceptFlow |
| 3.6 | Auto-accept calls `acceptInvitation` once bootstrapped (ref guard) | PASS | `app/routes/review/accept/$token.tsx:106-122` - `acceptedRef` prevents double-call |
| 3.7 | On success, navigates to `/review` | PASS | `app/routes/review/accept/$token.tsx:114` - `navigate({ to: '/review' })` |

### AC4: Expired token error handling

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 4.1 | Displays "This invitation has expired" | PASS | `app/routes/review/accept/$token.tsx:175` - title in config object |
| 4.2 | Shows "Request New Link" button | PASS | `app/routes/review/accept/$token.tsx:178-183` - mailto link button |
| 4.3 | No sign-up/sign-in UI shown | PASS | `app/routes/review/accept/$token.tsx:59-60` - returns `<TokenErrorCard>` before reaching SignIn |

### AC5: Consumed token error handling

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 5.1 | Displays "This invitation has already been used" | PASS | `app/routes/review/accept/$token.tsx:189` |
| 5.2 | Authenticated users see "Go to Review Workspace" link | PASS | `app/routes/review/accept/$token.tsx:193-200` - `<SignedIn>` with navigation button |
| 5.3 | Unauthenticated users see "Sign in" button | PASS | `app/routes/review/accept/$token.tsx:201-210` - `<SignedOut>` with sign-in button |

### AC6: Revoked token error handling

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 6.1 | Displays "This invitation has been revoked" | PASS | `app/routes/review/accept/$token.tsx:216` |
| 6.2 | Shows editor contact message | PASS | `app/routes/review/accept/$token.tsx:218-219` - "The editor has withdrawn this invitation" |

### AC7: Invalid token error handling

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 7.1 | Displays "Invalid invitation link" | PASS | `app/routes/review/accept/$token.tsx:167` |
| 7.2 | Shows "check your email" message | PASS | `app/routes/review/accept/$token.tsx:169` - "Please check your email for the correct invitation link." |

### AC8: Review route layout bypass for accept page

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 8.1 | Accept route renders within `data-mode="reviewer"` wrapper | PASS | `app/routes/review/route.tsx:48` - `data-mode="reviewer"` on accept route branch |
| 8.2 | `beforeLoad` skips auth check for `/review/accept/` paths | PASS | `app/routes/review/route.tsx:19-21` - `pathname.startsWith('/review/accept/')` guard |
| 8.3 | Component-level role guard skips for accept route | PASS | `app/routes/review/route.tsx:34-37` - `isAcceptRoute` check bypasses hasAccess |
| 8.4 | After acceptance, user can navigate to `/review` normally | PASS | Architecture verified: role upgrade happens in mutation, layout allows reviewer role |

### AC9: Audit trail for invitation acceptance

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 9.1 | Audit log entry created with action `invitation_accepted` | PASS | `convex/invitations.ts:356-362` - `scheduler.runAfter` with `action: 'invitation_accepted'` |
| 9.2 | Details include reviewer name | PASS | `convex/invitations.ts:361` - `${ctx.user.name} accepted the invitation` |
| 9.3 | `ACTION_LABELS` mapping updated in `audit-timeline.tsx` | PASS | `app/features/editor/audit-timeline.tsx:19` - `invitation_accepted: 'Invitation accepted'` |

**Story 4-1 Summary: 9 ACs, 33 sub-criteria -- ALL PASS**

---

## Story 4-2: Split-View Review Workspace with Inline PDF

### AC1: Review list page shows assigned submissions

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1.1 | List displays all assigned submissions with title, status, review status, date | PASS | `app/routes/review/index.tsx:58-99` - Card per review with title, date, status badge |
| 1.2 | Clicking navigates to `/review/$submissionId` | PASS | `app/routes/review/index.tsx:59-63` - `<Link to="/review/$submissionId">` |
| 1.3 | Empty state shown when no reviews | PASS | `app/routes/review/index.tsx:46-56` - "No reviews assigned" empty state |
| 1.4 | Query uses `withUser` + manual reviewer role check | PASS | `convex/reviews.ts:43-50` - `withUser` + `REVIEWER_LIST_ROLES` check |
| 1.5 | Query defines `args` and `returns` validators | PASS | `convex/reviews.ts:32-42` - both defined |

### AC2: Split-view layout with paper panel and review panel

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 2.1 | `ResizablePanelGroup` renders two panels | PASS | `app/routes/review/$submissionId.tsx:133-144` - horizontal panel group |
| 2.2 | Left panel defaults to 55%, minimum 30% | PASS | `app/routes/review/$submissionId.tsx:137` - `defaultSize={55} minSize={30}` |
| 2.3 | Right panel defaults to 45%, minimum 25% | PASS | `app/routes/review/$submissionId.tsx:141` - `defaultSize={45} minSize={25}` |
| 2.4 | Vertical resize handle present | PASS | `app/routes/review/$submissionId.tsx:139` - `<ResizableHandle withHandle />` |
| 2.5 | Both panels scroll independently via `ScrollArea` | PASS | `app/features/review/paper-panel.tsx:29` and `review-panel.tsx:37` - both wrapped in `ScrollArea` |

### AC3: Paper panel renders submission content inline

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 3.1 | Paper renders as web content (NOT PDF embed) | PASS | `app/features/review/paper-panel.tsx:76-78` - `<ExtractedTextContent>` component, no iframe |
| 3.2 | Typography: Newsreader serif, text-lg, leading-[1.7], max-w-prose | PASS | `paper-panel.tsx:31,57,76` - `font-serif text-lg leading-[1.7]`, `max-w-prose` container |
| 3.3 | Content includes title (h1), authors, abstract, body text | PASS | `paper-panel.tsx:33-85` - all four sections present |
| 3.4 | Body text extracted via `extractPdfText` action | PASS | `$submissionId.tsx:56-70` - auto-triggers `extractPdfText` action |
| 3.5 | Loading skeleton during extraction | PASS | `paper-panel.tsx:64-74` - Skeleton with "Extracting paper text..." |
| 3.6 | PDF download link always available | PASS | `paper-panel.tsx:88-100` - download link rendered when pdfUrl exists |

### AC4: Workspace header with breadcrumb and confidentiality badge

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 4.1 | Breadcrumb "Reviews / [Paper Title]" with link | PASS | `workspace-header.tsx:13-18` - "Reviews" links to `/review/`, title displayed |
| 4.2 | ConfidentialityBadge: green pill "Hidden from authors" | PASS | `confidentiality-badge.tsx:8-16` - green styling with "Hidden from authors" text |
| 4.3 | Badge has `role="status"` and `aria-live="polite"` | PASS | `confidentiality-badge.tsx:9-10` - both ARIA attributes present |
| 4.4 | Badge is NOT dismissible | PASS | `confidentiality-badge.tsx` - no close button or dismiss mechanism |

### AC5: Review panel with tab navigation (placeholder content)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 5.1 | Three tabs: "Write Review", "Discussion", "Guidelines" | PASS | `review-panel.tsx:41-51` - three `TabsTrigger` elements |
| 5.2 | Write Review tab renders review form (replaced placeholder per Story 4.3) | PASS | `review-panel.tsx:55-64` - `<ReviewForm>` component in Write tab |
| 5.3 | Discussion tab renders DiscussionThread (replaced placeholder per Story 4.4) | PASS | `review-panel.tsx:66-70` - `<DiscussionThread>` in Discussion tab |
| 5.4 | Guidelines tab shows static review guidelines | PASS | `review-panel.tsx:72-111` - static guidelines content |

### AC6: Review status auto-transition to in_progress

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 6.1 | `startReview` mutation transitions assigned to in_progress | PASS | `convex/reviews.ts:186-191` - patches `status: 'in_progress'` when `assigned` |
| 6.2 | Sets `updatedAt` to `Date.now()` | PASS | `convex/reviews.ts:189` - `updatedAt: Date.now()` |
| 6.3 | No-op if already in_progress (idempotent) | PASS | `convex/reviews.ts:186` - only patches when `status === 'assigned'` |
| 6.4 | Uses `withReviewer` wrapper | PASS | `convex/reviews.ts:168` - `withReviewer()` |
| 6.5 | Defines `args` and `returns` validators | PASS | `convex/reviews.ts:166-167` - both defined |

### AC7: PDF text extraction and caching

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 7.1 | `extractPdfText` action fetches PDF from Convex storage | PASS | `convex/pdfExtractionActions.ts:53-57` - `ctx.storage.getUrl` + `fetch` |
| 7.2 | Extracts text via `unpdf` `extractText` with `mergePages: true` | PASS | `convex/pdfExtractionActions.ts:58-60` - `extractText` with `{ mergePages: true }` |
| 7.3 | Writes extracted text to submission's `extractedText` field | PASS | `convex/pdfExtractionActions.ts:66-72` - writes via `writeExtractedText` internal mutation |
| 7.4 | Subsequent loads use cached text | PASS | `convex/pdfExtractionActions.ts:49` - early return when `submission.extractedText` exists |
| 7.5 | Text truncated to 200,000 characters | PASS | `convex/pdfExtractionActions.ts:14,64` - `MAX_EXTRACTED_TEXT_LENGTH = 200_000` |
| 7.6 | Error fallback with download link | PASS | `paper-panel.tsx:80-84` - shows download message; `pdfExtractionActions.ts:73-76` - silent catch |

### AC8: Responsive collapse below 880px

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 8.1 | Below 880px: tabbed full-width with "Paper" and "Review" tabs | PASS | `$submissionId.tsx:115-131` - `Tabs` with Paper/Review tabs when `isNarrow` |
| 8.2 | Above 880px: split-view side-by-side | PASS | `$submissionId.tsx:132-145` - `ResizablePanelGroup` when not narrow |
| 8.3 | Layout switches dynamically on resize | PASS | `$submissionId.tsx:20-30` - `useIsNarrow` hook with `matchMedia` event listener |

**Story 4-2 Summary: 8 ACs, 30 sub-criteria -- ALL PASS**

---

## Story 4-3: Structured Review Form with Auto-Save

### AC1: Structured review form with 5 sections

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1.1 | Form renders 5 sections: Summary, Strengths, Weaknesses, Questions, Recommendation | PASS | `review-form.tsx:29-65` - `SECTION_DEFS` array with all 5 sections |
| 1.2 | Each section has header, status badge, textarea, word count, collapsible guidance | PASS | `review-section-field.tsx:42-94` - all elements present |
| 1.3 | Sections laid out vertically with space-y-6 | PASS | `review-form.tsx:375` - `className="space-y-6 p-4"` |
| 1.4 | Text areas use Newsreader serif font | PASS | `review-section-field.tsx:55` - `className="font-serif text-lg leading-[1.7]"` |
| 1.5 | Form fills available review panel height via ScrollArea | PASS | `review-panel.tsx:37` - `<ScrollArea className="h-full">` wrapping the panel |
| 1.6 | Each section is a fieldset with legend | PASS | `review-section-field.tsx:43-44` - `<fieldset>` with `<legend>` (sr-only) |
| 1.7 | Status badges: gray "Not started", accent "In progress", green "Complete" | PASS | `review-section-field.tsx:97-109` - three badge variants |

### AC2: Auto-save with 500ms debounce

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 2.1 | `updateSection` mutation called after 500ms with section, content, revision | PASS | `review-form.tsx:261-272` - `setTimeout(..., 500)` then `saveSection()` |
| 2.2 | Save indicator shows "Saving..." / "Saved" | PASS | `save-indicator.tsx:12-22` - both states implemented |
| 2.3 | Mutation increments revision | PASS | `convex/reviews.ts:260` - `newRevision = review.revision + 1` |
| 2.4 | Each section has independent debounce timer | PASS | `review-form.tsx:126-127` - `timersRef` keyed by section name |
| 2.5 | Typing in one section does not cancel another's pending save | PASS | `review-form.tsx:264-265` - only clears timer for the specific section |
| 2.6 | Mutation uses `withReviewer` wrapper | PASS | `convex/reviews.ts:218` - `withReviewer()` |
| 2.7 | Mutation defines `args` and `returns` validators | PASS | `convex/reviews.ts:211-217` - both defined |
| 2.8 | Only allows saves when status is `in_progress` or `submitted` | PASS | `convex/reviews.ts:241-254` - rejects `locked` and `assigned`, checks edit window for `submitted` |

### AC3: Optimistic updates for instant UI feedback

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 3.1 | Local Convex cache updated via `withOptimisticUpdate` | PASS | `review-form.tsx:177-201` - `useMutation().withOptimisticUpdate()` with `localStore.setQuery` |
| 3.2 | On success, optimistic update confirmed | PASS | Architecture: Convex automatically confirms optimistic updates on success |
| 3.3 | On failure, optimistic update rolled back | PASS | Architecture: Convex automatically rolls back on error |
| 3.4 | Text area reflects latest local input | PASS | `review-form.tsx:111-113` - local state drives textarea value; `review-form.tsx:262` - immediate local update |

### AC4: Version conflict handling

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 4.1 | Mutation throws VERSION_CONFLICT on revision mismatch | PASS | `convex/reviews.ts:256-258` - `versionConflictError()` on mismatch |
| 4.2 | Frontend preserves local draft text | PASS | `review-form.tsx:234-246` - error caught, local state preserved |
| 4.3 | Alert banner with "Reload" / "Keep" options | PASS | `review-section-field.tsx:59-77` - conflict UI with both buttons |
| 4.4 | "Reload server version" reloads from reactive query | PASS | `review-form.tsx:274-284` - `handleConflictReload` sets local to server values |
| 4.5 | "Keep my version" retries save with current revision | PASS | `review-form.tsx:286-292` - `handleConflictKeep` updates revision and re-saves |
| 4.6 | Save indicator shows amber warning | PASS | `save-indicator.tsx:24-28` - amber warning icon and text for error state |

### AC5: Progress ring wired to actual section completion

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 5.1 | ProgressRing shows completed section count | PASS | `review-form.tsx:333-336,378` - `completedCount` wired to `<ProgressRing>` |
| 5.2 | Section complete: >= 10 words (recommendation: any non-empty) | PASS | `review-section-field.tsx:118-127` - `getSectionStatus` with 10-word threshold, recommendation exception |
| 5.3 | Section "in progress": content but < 10 words | PASS | `review-section-field.tsx:126` - returns `'in-progress'` for 1-9 words |
| 5.4 | Progress updates reactively via local state | PASS | `review-form.tsx:333-336` - computed from `localSections`, not server state |
| 5.5 | ReviewPanel receives review data as props | PASS | `review-panel.tsx:21-35` - typed props including sections, revision, status |

### AC6: Pre-submission summary and submit flow

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 6.1 | AlertDialog with full review, word counts, completeness | PASS | `pre-submit-summary.tsx:42-103` - all sections displayed with word counts |
| 6.2 | Cancel and Submit Review buttons | PASS | `pre-submit-summary.tsx:90-99` - both buttons present |
| 6.3 | Submit button disabled if any section is empty | PASS | `pre-submit-summary.tsx:94` - `disabled={!allFilled || isSubmitting}` |
| 6.4 | `submitReview` validates all 5 sections have content | PASS | `convex/reviews.ts:312-325` - iterates required sections, checks non-empty |
| 6.5 | Sets status to `submitted`, `submittedAt` to `Date.now()` | PASS | `convex/reviews.ts:328-333` - patches both fields |
| 6.6 | Schedules `lockReview` after 15 minutes | PASS | `convex/reviews.ts:335-339` - `scheduler.runAfter(15 * 60 * 1000, ...)` |
| 6.7 | Increments revision | PASS | `convex/reviews.ts:327` - `newRevision = review.revision + 1` |
| 6.8 | Uses `withReviewer` with validators | PASS | `convex/reviews.ts:285,280-283` - wrapper and validators defined |
| 6.9 | Confirmation message with edit window info | PASS | `review-form.tsx:386-396` - green banner with countdown text |

### AC7: 15-minute Tier 2 edit window after submission

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 7.1 | Form remains editable after submission | PASS | `review-form.tsx:137-140` - `isEditable` includes submitted with countdown > 0 |
| 7.2 | Banner with live countdown [MM:SS] | PASS | `review-form.tsx:386-396` - countdown formatted via `formatCountdown()` |
| 7.3 | Countdown updates every second | PASS | `review-form.tsx:69-87` - `useEditCountdown` hook with `setInterval(..., 1000)` |
| 7.4 | `lockReview` sets status to `locked` and `lockedAt` | PASS | `convex/reviews.ts:357-362` - patches both fields |
| 7.5 | After locking, form becomes read-only with message | PASS | `review-form.tsx:345-371` - locked state renders read-only fields with lock icon message |
| 7.6 | `updateSection` rejects saves when locked | PASS | `convex/reviews.ts:241-242` - rejects when `review.status === 'locked'` |

### AC8: Save indicator component

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 8.1 | Persistent save indicator next to progress ring | PASS | `review-form.tsx:378-379` - `<ProgressRing>` and `<SaveIndicator>` adjacent |
| 8.2 | States: "Saved" (check), "Saving..." (spinner), "Error" (warning) | PASS | `save-indicator.tsx:12-29` - all three states implemented |
| 8.3 | Reflects most recent save across all sections | PASS | `review-form.tsx:311-330` - `globalSaveState` computed from timestamps |
| 8.4 | Uses `aria-live="polite"` | PASS | `save-indicator.tsx:9` - `aria-live="polite"` present |

**Story 4-3 Summary: 8 ACs, 39 sub-criteria -- ALL PASS**

---

## Story 4-4: Semi-Confidential Threaded Discussion

### AC1: Threaded discussion with chronological messages

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1.1 | Messages displayed chronologically (oldest first) | PASS | `convex/discussions.ts:112` - `.order('asc')` query |
| 1.2 | Each message shows: attribution, role badge, timestamp, content | PASS | `discussion-message.tsx:119-133` - displayName, Badge, formatRelativeTime, content |
| 1.3 | Content uses Newsreader serif font | PASS | `discussion-message.tsx:171` - `font-serif text-base leading-[1.6]` |
| 1.4 | Replies indented with left border | PASS | `discussion-thread.tsx:318` - `ml-6 border-l-2 border-muted pl-4` |
| 1.5 | One level of nesting max (replies to replies flattened) | PASS | `discussion-thread.tsx:212-222` - walks parent chain to find top-level ancestor |
| 1.6 | Each message has reply button | PASS | `discussion-message.tsx:178-186` - Reply button present |
| 1.7 | Comment list uses `role="log"` with `aria-live="polite"` | PASS | `discussion-thread.tsx:289-291` - both ARIA attributes present |
| 1.8 | Composer at bottom for new messages | PASS | `discussion-thread.tsx:349-364` - `<DiscussionComposer>` conditionally rendered |
| 1.9 | Placeholder when reviewer hasn't submitted | PASS | `discussion-thread.tsx:44-56` - gate for assigned/in_progress status |
| 1.10 | Available to editors/authors when at least one review submitted | PASS | `convex/discussions.ts:96-104` - `canPost` logic for author/editor |

### AC2: Semi-confidential identity gating -- author view

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 2.1 | Reviewer names replaced with pseudonyms ("Reviewer 1", etc.) | PASS | `convex/discussions.ts:143-146` - pseudonymMap with "Reviewer N" |
| 2.2 | Anonymous avatars show "R1", "R2" initials | PASS | `convex/discussions.ts:181` - `pseudonym.replace('Reviewer ', 'R')` |
| 2.3 | Editor names visible | PASS | `convex/discussions.ts:176` - anonymization only when `displayRole === 'reviewer'` |
| 2.4 | Author's own name visible | PASS | `convex/discussions.ts:176` - only anonymizes `reviewer` role |
| 2.5 | Pseudonym assignment consistent per submission | PASS | `convex/discussions.ts:128-146` - deterministic by first message appearance |

### AC3: Semi-confidential identity gating -- reviewer view

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 3.1 | Other reviewer real names visible | PASS | `convex/discussions.ts:149-150` - `shouldAnonymizeReviewers` only true for author viewers |
| 3.2 | Author real names visible | PASS | Same logic: non-author viewers see all names |
| 3.3 | Editor real names visible | PASS | Same logic |
| 3.4 | All role badges visible | PASS | `convex/discussions.ts:158-169` - displayRole computed for all messages regardless of viewer |

### AC4: Semi-confidential identity gating -- editor view

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 4.1 | All participant real names visible | PASS | `convex/discussions.ts:149-150` - editor role does not trigger anonymization |
| 4.2 | Role badges visible for all | PASS | `convex/discussions.ts:158-169` - roles always computed |

### AC5: Identity reveal on acceptance (FR33)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 5.1 | Reviewer real names visible on ACCEPTED status | PASS | `convex/discussions.ts:150` - `submission.status !== 'ACCEPTED'` means names shown for ACCEPTED |
| 5.2 | Note: "Reviewer identities have been revealed" | PASS | `discussion-thread.tsx:230-237` - green banner for ACCEPTED + isAuthor |

### AC6: Permanent confidentiality on rejection (FR34)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 6.1 | Reviewer identities remain as pseudonyms for REJECTED | PASS | `convex/discussions.ts:150` - REJECTED status keeps `shouldAnonymizeReviewers = true` for author |

### AC7: Public conversation toggle for rejected submissions (FR35)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 7.1 | Toggle button appears for REJECTED + author | PASS | `discussion-thread.tsx:240-283` - renders for `isAuthor && submissionStatus === 'REJECTED'` |
| 7.2 | `togglePublicConversation` sets `publicConversation` to true | PASS | `convex/discussions.ts:453-454` - patches `publicConversation: true` |
| 7.3 | Confirmation dialog with warning text | PASS | `discussion-thread.tsx:259-278` - AlertDialog with "cannot be undone" text |
| 7.4 | Disabled state after toggling | PASS | `discussion-thread.tsx:244-250` - shows "This conversation is public" when already true |
| 7.5 | Only author of REJECTED submission can toggle | PASS | `convex/discussions.ts:435-445` - validates authorId and REJECTED status |
| 7.6 | Idempotent guard | PASS | `convex/discussions.ts:447-450` - checks `publicConversation === true` |

### AC8: Posting new discussion messages

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 8.1 | `postMessage` mutation with submissionId, content, parentId | PASS | `convex/discussions.ts:223-228` - args defined |
| 8.2 | Validates user is a participant | PASS | `convex/discussions.ts:258-288` - checks author, editor, reviewer roles |
| 8.3 | Sets `editableUntil` to 5 minutes | PASS | `convex/discussions.ts:313` - `editableUntil: now + EDIT_WINDOW_MS` |
| 8.4 | Sets `isRetracted: false` | PASS | `convex/discussions.ts:312` |
| 8.5 | Uses `withUser` wrapper | PASS | `convex/discussions.ts:230` |
| 8.6 | Defines `args` and `returns` validators | PASS | `convex/discussions.ts:224-229` |
| 8.7 | New messages appear via reactive query | PASS | Architecture: `useQuery` subscription auto-updates |
| 8.8 | Highlight with `bg-accent/10` fading 3s | PASS | `discussion-message.tsx:103` - `animate-[fadeHighlight_3s_ease-out_forwards]` class |
| 8.9 | Composer clears after post | PASS | `discussion-composer.tsx:49` - `setContent('')` on success |
| 8.10 | Newsreader font on composer | PASS | `discussion-composer.tsx:106` - `font-serif text-base leading-[1.6]` |
| 8.11 | Character limit of 5000 with counter | PASS | `discussion-composer.tsx:12-13,36` - MAX_CONTENT_LENGTH, showCounter threshold |
| 8.12 | Post disabled when > 5000 chars | PASS | `discussion-composer.tsx:130` - `disabled={isEmpty || isOverLimit || isPosting}` |
| 8.13 | Counter turns red over limit | PASS | `discussion-composer.tsx:121` - `isOverLimit ? 'text-destructive font-medium'` |

### AC9: 5-minute edit window

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 9.1 | Edit button appears within 5 minutes | PASS | `discussion-message.tsx:75,187-196` - `canEdit` based on `isWithinEditWindow` |
| 9.2 | Inline edit mode with Save/Cancel | PASS | `discussion-message.tsx:139-169` - Textarea with Save/Cancel buttons |
| 9.3 | `editMessage` validates `Date.now() < editableUntil` | PASS | `convex/discussions.ts:349-353` - server-side deadline check |
| 9.4 | Edit button disappears after 5 minutes | PASS | `discussion-message.tsx:74-75` - `isWithinEditWindow` = `now < editableUntil` |

### AC10: Message retraction after edit window

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 10.1 | Retract button appears after edit window | PASS | `discussion-message.tsx:76,198-208` - `canRetract` when `!isWithinEditWindow` |
| 10.2 | Confirmation shown before retraction | PASS | `discussion-message.tsx:209-229` - inline confirm with Yes/Cancel |
| 10.3 | `retractMessage` sets `isRetracted: true` | PASS | `convex/discussions.ts:405-406` - patches `isRetracted: true` |
| 10.4 | Retracted shows "[This message has been retracted]" | PASS | `discussion-message.tsx:135-138` - italic muted placeholder text |
| 10.5 | Cannot un-retract | PASS | `convex/discussions.ts:401-403` - validates `isRetracted` not already true |

### AC11: New message real-time highlight

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 11.1 | New message gets `bg-accent/10` highlight | PASS | `discussion-message.tsx:103` - highlight animation class applied |
| 11.2 | Highlight fades over 3 seconds | PASS | `app/styles/globals.css:184-190` - `@keyframes fadeHighlight` defined |
| 11.3 | Auto-scroll when near bottom; "New messages" badge otherwise | PASS | `discussion-thread.tsx:109-119` - 100px threshold check, badge shown |

### AC12: Composer input

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 12.1 | Textarea with Post button | PASS | `discussion-composer.tsx:97-108,127-135` |
| 12.2 | Post disabled when empty | PASS | `discussion-composer.tsx:130` - `disabled={isEmpty || ...}` |
| 12.3 | Cmd+Enter submits | PASS | `discussion-composer.tsx:63-68` - `metaKey || ctrlKey` + Enter handler |
| 12.4 | "Replying to [name]" indicator with cancel | PASS | `discussion-composer.tsx:79-95` - reply context with X button |
| 12.5 | `aria-label="Post a discussion message"` | PASS | `discussion-composer.tsx:107` |

**Story 4-4 Summary: 12 ACs, 52 sub-criteria -- ALL PASS**

---

## Test Coverage Assessment

### Automated Test Files for Epic 4

| Test Type | File | Status |
|-----------|------|--------|
| Unit tests (convex backend) | None | **NO TESTS** |
| Component tests (React) | None | **NO TESTS** |

**No automated tests exist for any Epic 4 code.** The ATDD checklists for Stories 4-1 (all "PASS (code review)"), 4-2, 4-3, and 4-4 indicate acceptance was based on code review and manual verification only. The checklists for 4-2, 4-3, and 4-4 use unchecked `[ ]` markers, confirming that the listed test items were never formally executed as automated tests.

### Existing Project Test Files (for context)

| File | Scope |
|------|-------|
| `app/__tests__/setup.test.ts` | Epic 1 - cn utility |
| `app/__tests__/status-utils.test.ts` | Epic 2 - submission status utils |
| `convex/__tests__/errors.test.ts` | Epic 1 - error helpers |
| `convex/__tests__/transitions.test.ts` | Epic 1 - state machine |
| `convex/__tests__/matching-utils.test.ts` | Epic 3 - matching utils |

The project has 5 test files across 73 passing tests (per Story 4-1 ATDD checklist), but none cover Epic 4 functionality.

### ATDD Checklist Items That Were Planned But Not Implemented as Tests

**Story 4-3 ATDD planned the following unit tests:**
- UT1-UT8: `convex/__tests__/reviews.test.ts` -- file does not exist
- CT1-CT3: `app/features/review/__tests__/` -- directory does not exist

**Story 4-4 ATDD planned the following tests:**
- Backend: `convex/__tests__/discussions.test.ts` -- file does not exist
- Frontend: `app/features/review/__tests__/discussion-*.test.tsx` -- files do not exist

---

## Summary

### Counts

| Metric | Value |
|--------|-------|
| Total stories | 4 |
| Total ACs | 37 |
| Total sub-criteria verified | 154 |
| ACs with implementation evidence (PASS) | **37 / 37 (100%)** |
| ACs with automated test coverage | **0 / 37 (0%)** |
| Test files for Epic 4 | **0** |

### Coverage by Story

| Story | ACs | All Implemented | Tests |
|-------|-----|-----------------|-------|
| 4-1: Reviewer invitation acceptance | 9 | PASS | 0 test files (code review only) |
| 4-2: Split-view review workspace | 8 | PASS | 0 test files |
| 4-3: Structured review form | 8 | PASS | 0 test files (planned tests not written) |
| 4-4: Threaded discussion | 12 | PASS | 0 test files (planned tests not written) |

### Quality Gate

**CONCERNS**

All 37 acceptance criteria are implemented in the source code and verified through code review. The implementation is thorough and matches the story specifications. However, there are zero automated tests for Epic 4. The ATDD checklists for Stories 4-3 and 4-4 explicitly planned unit and component tests that were never created.

### Gap Analysis

| Priority | Gap | Affected ACs | Recommendation |
|----------|-----|-------------|----------------|
| P1 | No backend unit tests for `convex/reviews.ts` (updateSection, submitReview, lockReview) | 4-3 AC2, AC4, AC6, AC7 | Create `convex/__tests__/reviews.test.ts` covering revision conflict, status guards, section validation, lock idempotency |
| P1 | No backend unit tests for `convex/discussions.ts` (identity gating, participant validation, edit window) | 4-4 AC2-AC6, AC8-AC10 | Create `convex/__tests__/discussions.test.ts` covering pseudonym assignment, role-based name gating, canPost logic, edit/retract guards |
| P1 | No backend unit tests for `convex/invitations.ts` (acceptInvitation, getInviteStatus) | 4-1 AC1, AC2 | Create `convex/__tests__/invitations.test.ts` covering token validation, role upgrade, error codes |
| P2 | No component tests for SaveIndicator, ReviewSectionField, DiscussionMessage, DiscussionComposer | 4-3 AC1, AC8; 4-4 AC1, AC12 | Create component test files in `app/features/review/__tests__/` |
| P2 | No automated test for responsive collapse behavior | 4-2 AC8 | Component test with mocked matchMedia |

### Recommendations

1. **Highest priority:** Write backend unit tests for `convex/reviews.ts` and `convex/discussions.ts`. These files contain the most important business logic (optimistic concurrency control, identity gating, access control) and are the most likely source of production bugs. The ATDD checklists for 4-3 and 4-4 already specify the exact test cases to implement.

2. **Second priority:** Write backend unit tests for the invitation acceptance flow in `convex/invitations.ts`. The token validation, role upgrade, and error handling paths are well-defined and straightforward to test.

3. **Lower priority:** Add component tests for the SaveIndicator, ReviewSectionField, and discussion UI components. These are primarily rendering tests and are less critical than the backend logic tests.

4. **Process note:** The ATDD checklists for Stories 4-2, 4-3, and 4-4 all have unchecked items (`[ ]`), indicating that formal acceptance testing was not completed against the checklist. Story 4-1's checklist has all items marked "PASS (code review)" which is a less rigorous form of acceptance than automated testing.
