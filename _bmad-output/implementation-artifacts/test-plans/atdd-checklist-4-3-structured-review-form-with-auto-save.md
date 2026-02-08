# ATDD Checklist: Story 4.3 - Structured Review Form with Auto-Save

## AC1: Structured review form with 5 sections

- [ ] **AC1.1** Form renders 5 sections in order: Summary, Strengths, Weaknesses, Questions, Recommendation
- [ ] **AC1.2** Each section has header label (Satoshi font-medium), status badge, text area (Newsreader), word count, collapsible guidance
- [ ] **AC1.3** Sections laid out vertically with space-y-6
- [ ] **AC1.4** Text areas use Newsreader serif font (font-serif text-lg leading-[1.7])
- [ ] **AC1.5** Form fills available review panel height via ScrollArea
- [ ] **AC1.6** Each section is a fieldset with legend for accessibility
- [ ] **AC1.7** Status badges: gray "Not started", accent "In progress", green "Complete"

## AC2: Auto-save with 500ms debounce

- [ ] **AC2.1** updateSection mutation called after 500ms typing pause with section name, content, and expected revision
- [ ] **AC2.2** Save indicator shows "Saving..." during mutation, "Saved" on success
- [ ] **AC2.3** Mutation increments revision field on review document
- [ ] **AC2.4** Each section has independent debounce timer
- [ ] **AC2.5** Typing in one section does not cancel pending save for another
- [ ] **AC2.6** Mutation uses withReviewer wrapper
- [ ] **AC2.7** Mutation defines both args and returns validators
- [ ] **AC2.8** updateSection only allows saves when status is in_progress or submitted

## AC3: Optimistic updates for instant UI feedback

- [ ] **AC3.1** Local Convex cache updated immediately via withOptimisticUpdate
- [ ] **AC3.2** On success, optimistic update confirmed
- [ ] **AC3.3** On failure (e.g., version conflict), optimistic update rolled back by Convex
- [ ] **AC3.4** Text area always reflects latest local input

## AC4: Version conflict handling

- [ ] **AC4.1** Mutation throws VERSION_CONFLICT error when revision mismatch
- [ ] **AC4.2** Frontend catches error and preserves local draft text
- [ ] **AC4.3** Alert banner appears: "This section was updated elsewhere. [Reload] [Keep]"
- [ ] **AC4.4** "Reload server version" discards local and reloads from reactive query
- [ ] **AC4.5** "Keep my version" retries save with current server revision
- [ ] **AC4.6** Save indicator shows amber warning state during conflict

## AC5: Progress ring wired to actual section completion

- [ ] **AC5.1** ProgressRing updates to show count of completed sections (e.g., "3/5")
- [ ] **AC5.2** Section complete: >= 10 words (summary/strengths/weaknesses/questions), any non-empty (recommendation)
- [ ] **AC5.3** Section "in progress": content but < 10 words
- [ ] **AC5.4** Progress count updates reactively via local state
- [ ] **AC5.5** ReviewPanel receives review data as props

## AC6: Pre-submission summary and submit flow

- [ ] **AC6.1** AlertDialog opens showing full review with each section, word counts, total, completeness indicator
- [ ] **AC6.2** Dialog has Cancel and Submit Review buttons
- [ ] **AC6.3** Submit button disabled if any section is empty
- [ ] **AC6.4** submitReview mutation validates all 5 sections have content
- [ ] **AC6.5** submitReview sets status to submitted, submittedAt to Date.now()
- [ ] **AC6.6** submitReview schedules lockReview after 15 minutes
- [ ] **AC6.7** submitReview increments revision
- [ ] **AC6.8** submitReview uses withReviewer wrapper with args and returns validators
- [ ] **AC6.9** On success, confirmation message shown with edit window info

## AC7: 15-minute Tier 2 edit window after submission

- [ ] **AC7.1** Form remains editable after submission (auto-save continues)
- [ ] **AC7.2** Banner shows "Review submitted. You can make edits for the next [MM:SS]" with live countdown
- [ ] **AC7.3** Countdown updates every second from submittedAt + 15 minutes
- [ ] **AC7.4** lockReview mutation sets status to locked and lockedAt
- [ ] **AC7.5** After locking, form becomes read-only with message about discussion thread
- [ ] **AC7.6** updateSection rejects saves when status is locked

## AC8: Save indicator component

- [ ] **AC8.1** Persistent save indicator displays next to progress ring
- [ ] **AC8.2** States: "Saved" (check icon), "Saving..." (spinner), "Error" (warning icon)
- [ ] **AC8.3** Indicator reflects most recent save operation across all sections
- [ ] **AC8.4** Indicator uses aria-live="polite" for screen reader announcements

## Unit Test Plan (convex/__tests__/reviews.test.ts)

- [ ] **UT1** updateSection mutation — rejects when review status is locked
- [ ] **UT2** updateSection mutation — rejects when revision mismatch (VERSION_CONFLICT)
- [ ] **UT3** updateSection mutation — allows save when status is in_progress
- [ ] **UT4** updateSection mutation — allows save when status is submitted (edit window)
- [ ] **UT5** submitReview mutation — rejects when sections are incomplete
- [ ] **UT6** submitReview mutation — succeeds when all sections filled
- [ ] **UT7** lockReview internalMutation — locks when status is submitted
- [ ] **UT8** lockReview internalMutation — no-op when already locked

## Component Test Plan (app/features/review/__tests__/)

- [ ] **CT1** SaveIndicator renders correct state for idle/saving/saved/error
- [ ] **CT2** ReviewSectionField renders section with badge, textarea, word count, guidance
- [ ] **CT3** Word count helper computes correctly for various inputs
