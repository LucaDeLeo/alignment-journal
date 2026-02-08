---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
status: complete
inputDocuments:
  - "prd.md"
  - "architecture.md"
  - "ux-design-specification.md"
---

# alignment-journal - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for alignment-journal, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users can create accounts with email, name, and affiliation
FR2: Users can log in and maintain authenticated sessions
FR3: System assigns roles (Author, Reviewer, Action Editor, Editor-in-Chief, Admin) with role-specific views
FR4: Users see only the interface and data appropriate to their role
FR5: Authors can create a submission with title, authors, abstract, and keywords
FR6: Authors can upload a PDF file as part of their submission
FR7: Authors can view the status of their submissions (submitted, triaging, under review, decision pending, accepted, rejected, published)
FR8: System confirms successful submission to the author
FR9: System automatically extracts text from uploaded PDFs
FR10: System analyzes submission scope fit against the journal's stated focus areas
FR11: System checks submission formatting and completeness
FR12: System extracts citations and flags unresolvable references
FR13: System analyzes technical claims and identifies key arguments with supporting evidence assessment
FR14: System generates a structured triage report with per-dimension sections (scope fit, formatting, citations, claims) each containing a finding, severity indicator, and editor-facing recommendation
FR15: Triage progress updates in real-time as each analysis pass completes
FR16: System generates ranked reviewer match suggestions for a given submission based on expertise overlap
FR17: Each match suggestion includes explainable rationale (research area alignment, relevant publications)
FR18: Editors can accept, reject, or manually override match suggestions
FR19: System maintains reviewer profiles with expertise areas, research interests, and expertise matching data for automated reviewer-paper matching
FR20: Editors can view all submissions in a pipeline view organized by status
FR21: Editors can view LLM triage results for any submission
FR22: Editor-in-Chief can assign action editors to individual submissions
FR23: Action editors can select and invite reviewers from the matching suggestions
FR24: Editors can monitor review progress per submission (who accepted, who's overdue, who hasn't responded)
FR25: System maintains a full audit trail of editorial actions per submission (assignments, status transitions, invitations, decisions)
FR26: Editors can make accept/reject decisions on submissions
FR27: Editors can view payment calculations per reviewer per submission
FR28: Reviewers can view assigned papers with inline PDF reading
FR29: Reviewers can submit structured reviews with sections: summary, strengths, weaknesses, questions, recommendation
FR30: Authors and reviewers can participate in threaded discussion per submission
FR31: Reviewer identities are hidden from authors during the review process
FR32: Reviewer identities are visible to editors and other reviewers at all times
FR33: On acceptance, reviewer identities are revealed by default (editor can grant exceptions)
FR34: On rejection, reviewer identities remain permanently confidential
FR35: On rejection, authors can opt to make the review conversation public
FR36: Selected reviewer can draft a reviewer abstract (150-500 words) using material from the review discussion
FR37: Reviewer abstract is presented for author acceptance before publication
FR38: Reviewers can choose to sign or remain anonymous on the published reviewer abstract
FR39: Accepted papers are displayed as web-first article pages with serif body font, 16px+ base size, 1.5+ line height, and max 75 characters per line
FR40: Published articles display both author abstract and reviewer abstract
FR41: Published articles show metadata: authors, publication date, DOI placeholder, CC-BY badge
FR42: Published articles offer PDF download
FR43: Published articles display reviewer attribution (signed or anonymous)
FR44: System calculates reviewer compensation using the formula: base ($100 + $20/page) + quality multiplier + speed bonus ($100/week early) + abstract bonus ($300)
FR45: Editors can view per-reviewer payment summary for each submission
FR46: Payment information is display-only (no actual payment processing)
FR47: System ships with 5+ seed submissions at different pipeline stages (submitted, under review, accepted, rejected, published)
FR48: Seed data includes sample triage reports generated from real alignment papers
FR49: Seed data includes sample reviews with discussion threads
FR50: Seed data includes at least 1 fully published article with reviewer abstract
FR51: Seed data includes a reviewer pool with 5+ profiles, each containing name, affiliation, research areas, 3+ publications, and expertise matching data
FR52: System renders in-app notification previews for all email touchpoints (reviewer invitation, status updates, decision notifications)
FR53: Notification previews show recipient, subject, and body content

### NonFunctional Requirements

NFR1: Page loads complete in under 2 seconds on broadband connections as measured by browser DevTools network panel (DOMContentLoaded)
NFR2: LLM triage pipeline completes all analysis passes within 5 minutes per submission as measured by timestamp delta between submission and final report generation
NFR3: Reviewer matching returns results within 30 seconds as measured by UI response time from match request to displayed results
NFR4: Real-time updates (dashboard, discussions) reflect changes within 1 second as measured by timestamp delta between mutation and subscriber notification
NFR5: All data transmitted over HTTPS
NFR6: Authentication tokens validated on every request
NFR7: Role-based access enforced at the data layer — no client-side-only access control
NFR8: Reviewer identity isolation enforced server-side (authors cannot access reviewer identity through any endpoint during review)
NFR9: LLM API keys stored server-side only, never exposed to client-side code or browser network requests
NFR10: WCAG 2.1 AAA compliance for all pages, with particular attention to published article pages (public-facing content)
NFR11: Keyboard navigation for core workflows (submission, review, dashboard)
NFR12: Screen reader compatibility on primary interfaces verified by automated accessibility audit (axe-core or equivalent)
NFR13: Sufficient color contrast ratios (7:1 for normal text, 4.5:1 for large text)
NFR13a: Support for prefers-reduced-motion, prefers-contrast, and forced-colors media queries
NFR14: Strict type checking enabled with zero type errors at build time
NFR15: File naming follows kebab-case, component naming follows PascalCase, function naming follows camelCase throughout the codebase
NFR16: README includes sections for: local setup (< 5 steps to running app), architecture overview with component diagram, seed data explanation, and deployment instructions
NFR17: No dead code, commented-out blocks, or TODO hacks in shipped codebase as verified by linter rules
NFR18: Git history contains atomic commits with descriptive messages, no merge commits on main branch

### Additional Requirements

**From Architecture:**

- Starter template: Minimal TanStack Start + Convex template (`bunx create-convex -- -t tanstack-start`) — this is Epic 1, Story 1
- Manual additions required post-init: Clerk auth, Tailwind CSS, shadcn/ui, Motion (Framer Motion), React Compiler, Vercel AI SDK, unpdf, Satoshi + Newsreader + JetBrains Mono fonts
- Package manager: Bun exclusively (`bun install`, `bun dev`, `bunx`)
- Editorial state machine with defined transition map: DRAFT → SUBMITTED → TRIAGING → TRIAGE_COMPLETE → DESK_REJECTED | UNDER_REVIEW → DECISION_PENDING → ACCEPTED → PUBLISHED | REJECTED | REVISION_REQUESTED → SUBMITTED
- Custom RBAC higher-order function wrappers: withAuthor, withReviewer, withActionEditor, withEditor, withAdmin
- Reviewer invitation flow: signed tokens with 24hr TTL, one-time use, revocable, server-validated
- Chained Convex Actions for LLM triage pipeline with idempotency keys and retry logic (max 3 attempts, bounded exponential backoff)
- Convex vector search for reviewer-paper matching using OpenAI text-embedding-3-large
- External API response sanitization before writing to client-visible tables
- Deployment isolation policy: production from main only, preview from non-main branches, separate deploy keys, fail-closed validation
- Single `convex/schema.ts` defining all tables, indexes, and validators
- Every Convex function must define both `args` and `returns` validators
- All Action files using Node.js APIs must include `"use node";` directive
- Internal functions (internalMutation/internalAction) for all server-to-server calls
- Cursor-based pagination for list views via usePaginatedQuery
- Conditional queries use "skip" pattern — never conditionally call hooks
- Auto-save with version preconditions and VERSION_CONFLICT handling
- File upload via 3-step flow: generateUploadUrl → POST → save storageId reference
- Structured ConvexError with typed error codes (UNAUTHORIZED, INVALID_TRANSITION, NOT_FOUND, etc.)

**From UX Design:**

- Light mode only for prototype scope, with mode-specific color temperature shifts per role
- Satoshi (geometric sans-serif) for UI chrome + Newsreader (transitional serif) for article/reading content
- Spring-based animations: 150-250ms, stiffness 400/damping 30 for snappy, stiffness 300/damping 25 for reveals
- Split-view reviewer workspace: paper left (55%), review form right (45%), resizable
- Persistent ConfidentialityBadge on all reviewer-facing screens showing identity protection state
- ProgressRing (28px SVG) for review completion tracking
- StatusChip with interactive state transitions for editors
- TriageReportCard with collapsible sections, severity indicators, and staggered reveal animation
- ReviewerMatchCard with explainable rationale, expertise tags, confidence indicator
- PaymentCalculator with collapsible breakdown and counting-up animation
- DualAbstractDisplay for published articles (reviewer abstract positioned as primary reading guide)
- ThreadedDiscussion with role-based confidentiality rendering
- cmd+K command palette for role switching, navigation, search
- Demo-only role switcher in header (hidden in production)
- Skeleton loading states with CSS shimmer for all content areas
- Three-tier button hierarchy: primary (accent fill), secondary (outline), ghost (text-only)
- Three-tier destructive action handling: Tier 1 undo toast (10s grace), Tier 2 edit-after-submit, Tier 3 confirmation dialog
- Desktop-first, minimum 1024px supported width
- WCAG 2.1 AAA target with prefers-reduced-motion, prefers-contrast, and forced-colors support
- Zoom-in/pull-back navigation with shared layout animations (layoutId)
- Empty states with purposeful next-action guidance for all list views

### FR Coverage Map

FR1: Epic 1 - User account creation (email, name, affiliation)
FR2: Epic 1 - User login and session management
FR3: Epic 1 - Role assignment (Author, Reviewer, Action Editor, Editor-in-Chief, Admin)
FR4: Epic 1 - Role-specific interface and data access
FR5: Epic 2 - Author submission creation (title, authors, abstract, keywords)
FR6: Epic 2 - PDF file upload for submissions
FR7: Epic 2 - Author submission status tracking
FR8: Epic 2 - Submission confirmation to author
FR9: Epic 2 - Automatic PDF text extraction
FR10: Epic 2 - LLM scope fit analysis
FR11: Epic 2 - LLM formatting and completeness check
FR12: Epic 2 - LLM citation extraction and verification
FR13: Epic 2 - LLM claims analysis with evidence assessment
FR14: Epic 2 - Structured triage report generation
FR15: Epic 2 - Real-time triage progress updates
FR16: Epic 3 - Ranked reviewer match suggestions
FR17: Epic 3 - Explainable match rationale
FR18: Epic 3 - Editor accept/reject/override match suggestions
FR19: Epic 3 - Reviewer profile management with expertise data
FR20: Epic 3 - Pipeline view of all submissions by status
FR21: Epic 3 - LLM triage results display for editors
FR22: Epic 3 - Action editor assignment by Editor-in-Chief
FR23: Epic 3 - Reviewer selection and invitation from matches
FR24: Epic 3 - Review progress monitoring per submission
FR25: Epic 3 - Full audit trail of editorial actions
FR26: Epic 3 - Accept/reject decisions on submissions
FR27: Epic 3 - Payment calculation display per reviewer
FR28: Epic 4 - Inline PDF reading for reviewers
FR29: Epic 4 - Structured review submission (summary, strengths, weaknesses, questions, recommendation)
FR30: Epic 4 - Threaded discussion per submission
FR31: Epic 4 - Reviewer identity hidden from authors during review
FR32: Epic 4 - Reviewer identity visible to editors and other reviewers
FR33: Epic 4 - Reviewer identity revealed on acceptance (with editor exceptions)
FR34: Epic 4 - Reviewer identity permanently confidential on rejection
FR35: Epic 4 - Authors can opt to make review conversation public on rejection
FR36: Epic 5 - Reviewer abstract drafting (150-500 words)
FR37: Epic 5 - Reviewer abstract presented for author acceptance
FR38: Epic 5 - Reviewer can sign or remain anonymous on published abstract
FR39: Epic 5 - Web-first article pages with serif font, proper typography
FR40: Epic 5 - Dual abstract display (author + reviewer)
FR41: Epic 5 - Article metadata (authors, date, DOI placeholder, CC-BY badge)
FR42: Epic 5 - PDF download on published articles
FR43: Epic 5 - Reviewer attribution display (signed or anonymous)
FR44: Epic 6 - Payment formula calculation (base + quality + speed + abstract)
FR45: Epic 6 - Per-reviewer payment summary for editors
FR46: Epic 6 - Display-only payment (no processing)
FR47: Epic 7 - 5+ seed submissions across pipeline stages
FR48: Epic 7 - Sample triage reports from real alignment papers
FR49: Epic 7 - Sample reviews with discussion threads
FR50: Epic 7 - At least 1 published article with reviewer abstract
FR51: Epic 7 - Reviewer pool with 5+ profiles and expertise data
FR52: Epic 6 - In-app notification previews for email touchpoints
FR53: Epic 6 - Notification preview content (recipient, subject, body)

## Epic List

### Epic 1: Project Foundation & Authentication -- COMPLETE
Users can create accounts, log in, and access role-appropriate views. The application is initialized with the full tech stack, schema, and RBAC enforcement.
**FRs covered:** FR1, FR2, FR3, FR4
**Status:** COMPLETE (implementation) | Quality gate: FAIL (auth test coverage)
**Completed:** 2026-02-08 | **Duration:** ~160 minutes | **Stories:** 4/4 | **Tests:** 29 passing | **Commits:** 10
**Blocking for Epic 2:** Auth/RBAC test coverage (TD-010) must be resolved before feature work begins.

### Epic 2: Author Submission & LLM Triage Pipeline -- COMPLETE
Authors can submit papers (metadata + PDF upload), receive real-time LLM triage feedback within minutes, and track their submission status through the editorial pipeline.
**FRs covered:** FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15
**Status:** COMPLETE (implementation) | Quality gate: FAIL (8% AC coverage, 0% P0)
**Completed:** 2026-02-08 | **Duration:** ~116 minutes | **Stories:** 4/4 | **Tests:** 52 passing | **Commits:** 8
**Sprint Mode:** YOLO | **Velocity:** 2.1 stories/hour (28% faster than Epic 1)
**Blocking for Epic 3:** TD-010 (auth tests, carried from Epic 1), TD-013 (triage safety tests), TD-014 (submission auth tests)

### Epic 3: Editor Dashboard & Reviewer Assignment -- COMPLETE
Editors can view all submissions in a pipeline dashboard, consume triage reports, assign action editors, get intelligent reviewer match suggestions with explainable rationale, invite reviewers, monitor progress, make decisions, and view audit trails and payment calculations.
**FRs covered:** FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27
**Status:** COMPLETE (implementation) | Quality gate: FAIL (0% FULL AC coverage, 89% NONE)
**Completed:** 2026-02-08 | **Duration:** ~208 minutes | **Stories:** 7/7 | **Tests:** 73 passing | **Commits:** 18
**Sprint Mode:** YOLO | **Velocity:** 2.0 stories/hour (stable vs Epic 2)
**Blocking for Epic 4:** TD-010 (auth tests, carried x3), TD-013 (triage tests, carried x2), TD-014 (submission tests, carried x2), TD-024-027 (Epic 3 P0 gaps: audit, embeddings, invitations, undo decision)

### Epic 4: Review Process & Semi-Confidential Discussion
Reviewers can access assigned papers via invitation links with minimal onboarding, read papers inline, submit structured reviews, and participate in semi-confidential threaded discussions with identity gating enforced by role and submission outcome.
**FRs covered:** FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35

### Epic 5: Reviewer Abstract & Publication
Accepted papers flow through reviewer abstract drafting, author approval, and publication as web-first article pages with dual abstracts, clean typography, and full metadata.
**FRs covered:** FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR43

### Epic 6: Payment Tracking & Notifications
Reviewers see transparent compensation calculations, editors view payment summaries, and the system renders in-app notification previews for all email touchpoints.
**FRs covered:** FR44, FR45, FR46, FR52, FR53

### Epic 7: Seed Data & Demo Experience
The system ships with realistic seed data across all pipeline stages plus the demo-only role switcher and cmd+K palette for evaluator exploration.
**FRs covered:** FR47, FR48, FR49, FR50, FR51

---

## Epic 1: Project Foundation & Authentication -- COMPLETE

<!-- Updated from Epic 1 retrospective -->

Users can create accounts, log in, and access role-appropriate views. The application is initialized with the full tech stack, schema, and RBAC enforcement.

> **Completion:** 2026-02-08 | All 4 stories delivered in ~160 minutes. 29 tests passing (100%). Quality gate FAIL due to 4 P0 auth/RBAC test coverage gaps (TD-010). 9 tech debt items logged, 8 resolved within epic. See `RETROSPECTIVE-EPIC-1.md` and `TRACEABILITY-EPIC-1.md` for full analysis.

### Story 1.1: Initialize Project with Tech Stack

As a developer,
I want the project initialized with TanStack Start + Convex + all required dependencies,
So that I have a working development environment to build on.

**Acceptance Criteria:**

**Given** a fresh directory
**When** `bunx create-convex -- -t tanstack-start` runs
**Then** the project scaffolds with TanStack Start + Convex + React Query wiring

**Given** the scaffolded project
**When** Clerk, Tailwind CSS, shadcn/ui, Motion, React Compiler, Vercel AI SDK, unpdf, and fonts (Satoshi + Newsreader + JetBrains Mono) are installed
**Then** all packages resolve without version conflicts

**Given** the configured project
**When** `bun dev` runs
**Then** both Vite frontend and Convex dev server start concurrently
**And** TypeScript strict mode is enabled with zero type errors at build time

### Story 1.2: Define Data Schema and Core Helpers

As a developer,
I want the complete Convex schema, editorial state machine, error codes, and RBAC helper wrappers defined,
So that all subsequent stories have a typed data layer and security boundary to build on.

**Acceptance Criteria:**

**Given** the project
**When** `convex/schema.ts` is created
**Then** all tables (submissions, reviews, triageReports, discussions, users, reviewerProfiles, auditLogs, reviewInvites, notifications, payments) are defined with indexes and validators

**Given** `convex/helpers/transitions.ts`
**When** a status transition is attempted
**Then** valid transitions succeed and invalid transitions throw `ConvexError({ code: "INVALID_TRANSITION" })`

**Given** `convex/helpers/errors.ts`
**When** error helpers are called
**Then** structured ConvexError codes (UNAUTHORIZED, INVALID_TRANSITION, NOT_FOUND, VALIDATION_ERROR, VERSION_CONFLICT, INVITE_TOKEN_INVALID, INVITE_TOKEN_EXPIRED, INVITE_TOKEN_USED, EXTERNAL_SERVICE_ERROR, ENVIRONMENT_MISCONFIGURED) are available

**Given** `convex/helpers/auth.ts`
**When** role-gated wrappers are called
**Then** withAuthor, withReviewer, withActionEditor, withEditor, and withAdmin resolve Clerk JWT, check role, and throw UNAUTHORIZED on failure
**And** every Convex function defines both `args` and `returns` validators

### Story 1.3: User Registration, Login, and Role Management

As a user,
I want to create an account with email, name, and affiliation, log in, and be assigned a role,
So that I can access the platform with the appropriate permissions.

**Acceptance Criteria:**

**Given** a new user
**When** they create an account via Clerk
**Then** a user record is created in Convex with email, name, and affiliation fields (FR1)

**Given** a registered user
**When** they log in
**Then** an authenticated session is established and maintained (FR2)

**Given** an authenticated user
**When** they are assigned a role (Author, Reviewer, Action Editor, Editor-in-Chief, Admin)
**Then** the role is stored and available for RBAC checks (FR3)

**Given** an authenticated user with a role
**When** they access the platform
**Then** they see only the interface and data appropriate to their role (FR4)
**And** role-based access is enforced at the Convex data layer, not client-side only

### Story 1.4: App Shell, Routing, and Design System Foundation

As a user,
I want a polished app shell with role-based routing, the design system applied, and a cmd+K palette,
So that I can navigate the platform with a consistent, professional experience.

**Acceptance Criteria:**

**Given** the app
**When** routes are defined
**Then** role-based route groups exist: `/editor/` (dashboard, submission detail), `/review/` (review workspace), `/submit/` (author submission), `/article/` (public articles), `/admin/` (user management)

**Given** the root layout
**When** it renders
**Then** it includes: header with journal name, demo-only role switcher (hidden when NODE_ENV=production), and cmd+K command palette

**Given** the design system
**When** CSS variables are configured
**Then** mode-specific color tokens (editor cool, reviewer neutral, author warm, reader warmest), Satoshi + Newsreader + JetBrains Mono fonts, spacing scale, shadow system, and border radius tokens are applied

**Given** a user
**When** they press cmd+K
**Then** a command palette opens with grouped results: Switch Role, Go To, Search
**And** skeleton loading states with CSS shimmer are implemented for route-level Suspense fallbacks
**And** Error Boundaries are configured per feature section

---

## Epic 2: Author Submission & LLM Triage Pipeline -- COMPLETE

<!-- Updated from Epic 2 retrospective -->

Authors can submit papers (metadata + PDF upload), receive real-time LLM triage feedback within minutes, and track their submission status through the editorial pipeline.

> **Completion:** 2026-02-08 | All 4 stories delivered in ~116 minutes (YOLO mode). 52 tests passing (100%). Quality gate FAIL due to 0% P0 AC coverage (5 P0 criteria untested: idempotent writes, retry logic, sanitization, auth enforcement, ownership checks). 2 tech debt items resolved (TD-011 component infra, TD-012 coverage reporting), 1 deferred (TD-010 auth tests), 4 new items identified (TD-013 through TD-016). Feature folder pattern (`app/features/submissions/`) validated with 11 co-located components. Chained action pipeline architecture (scheduler-based, 4-pass triage with idempotent writes and bounded backoff) established as reusable pattern. See `RETRO-EPIC-2.md` and `TRACE-MATRIX-EPIC-2.md` for full analysis.

### Story 2.1: Author Submission Form and PDF Upload

As an author,
I want to fill out a submission form with title, authors, abstract, and keywords, and upload my PDF,
So that I can submit my paper to the journal.

**Acceptance Criteria:**

**Given** an authenticated author
**When** they navigate to `/submit/`
**Then** a centered single-column form displays with fields for title, authors, abstract, and keywords

**Given** the submission form
**When** the author uploads a PDF
**Then** the file is validated as `application/pdf`, uploaded via the 3-step Convex flow (generateUploadUrl → POST → save storageId), and a progress bar shows upload status (FR6)

**Given** a complete form
**When** the author clicks submit
**Then** a submission record is created with status SUBMITTED, the author sees a confirmation message, and the submission appears in their status list (FR5, FR8)

**Given** an incomplete form
**When** the author clicks submit
**Then** inline validation errors appear below the relevant fields with specific, constructive messages
**And** form validation uses Zod on the frontend and Convex validators on the backend

### Story 2.2: Submission Status Tracking

As an author,
I want to view the status of my submissions at any time,
So that I know where my paper is in the editorial pipeline.

**Acceptance Criteria:**

**Given** an authenticated author with submissions
**When** they navigate to `/submit/$id`
**Then** they see the submission's current status with a color-coded StatusChip (FR7)

**Given** a submission
**When** its status changes (submitted, triaging, under review, decision pending, accepted, rejected, published)
**Then** the status updates in real-time via Convex reactive queries without page refresh

**Given** a submission in any status
**When** the author views it
**Then** they see: title, abstract, submission date, current status, and a timeline of status transitions
**And** authors can only see their own submissions (enforced via withAuthor wrapper)

### Story 2.3: PDF Text Extraction and Triage Orchestration

As an editor,
I want submitted papers to be automatically analyzed by the LLM triage pipeline,
So that I get structured, actionable intelligence without reading every paper.

**Acceptance Criteria:**

**Given** a newly submitted paper
**When** the submission is created
**Then** the triage pipeline is triggered automatically, setting status to TRIAGING (FR9)

**Given** the triage pipeline
**When** it runs
**Then** it executes 4 chained Convex Actions in sequence: triageScope → triageFormatting → triageCitations → triageClaims, each scheduling the next on completion

**Given** each triage pass
**When** it executes
**Then** it uses Vercel AI SDK `generateObject` with structured output, writes results to `triageReports` via internalMutation, and uses an idempotencyKey (`submissionId + triageRunId + passName`) to prevent duplicate writes

**Given** a triage pass failure
**When** an external API error occurs
**Then** it retries with bounded exponential backoff (max 3 attempts), sanitizes error messages before writing to client-visible tables, and marks the run as "failed" with `lastError` on terminal failure
**And** all triage Action files include `"use node";` as the first line
**And** PDF text extraction uses unpdf within the first Action

### Story 2.4: Real-Time Triage Progress and Report Display

As an author or editor,
I want to see triage progress in real-time and read the structured triage report when complete,
So that I get immediate, actionable feedback on submissions.

**Acceptance Criteria:**

**Given** a submission in TRIAGING status
**When** each analysis pass completes
**Then** the TriageProgressIndicator updates in real-time showing: pending/active/complete/failed state per pass (scope fit → formatting → citations → claims) (FR15)

**Given** a completed triage
**When** the report is viewed
**Then** it displays structured TriageReportCards with per-dimension sections: scope fit, formatting, citations, claims — each with severity indicator (pass/minor/critical/info) and expandable detail (FR14)

**Given** the triage report cards
**When** they first render
**Then** they appear with staggered spring animations (50ms delay between cards, 200ms spring)

**Given** triage completion
**When** all 4 passes succeed
**Then** the submission status transitions to TRIAGE_COMPLETE
**And** the author sees a simplified triage summary on their submission status page (FR10, FR11, FR12, FR13)

---

## Epic 3: Editor Dashboard & Reviewer Assignment -- COMPLETE

<!-- Updated from Epic 3 retrospective -->

Editors can view all submissions in a pipeline dashboard, consume triage reports, assign action editors, get intelligent reviewer match suggestions with explainable rationale, invite reviewers, monitor progress, make decisions, and view audit trails and payment calculations.

> **Completion:** 2026-02-08 | All 7 stories delivered in ~208 minutes (YOLO mode). 73 tests passing (100%). Quality gate FAIL due to 0% FULL AC coverage (5 P0 criteria untested: audit log creation, embedding generation, invitation token hashing, undo decision time window, audit append-only invariant). 4 tech debt items resolved within epic (TD-020 through TD-023: roles dedup, decision function dedup, constant dedup, audit labels). 5 new P0 items identified (TD-024 through TD-027). Editor feature folder (`app/features/editor/`, 14 components) and admin feature folder (`app/features/admin/`, 2 components) established. Shared role constants extracted to `convex/helpers/roles.ts`. See `EPIC-3-TRACEABILITY.md`.

### Story 3.1: Editor Pipeline Dashboard

As an editor,
I want to see all submissions in a pipeline view organized by status with filtering and sorting,
So that I can instantly see what needs my attention.

**Acceptance Criteria:**

**Given** an authenticated editor
**When** they navigate to `/editor/dashboard`
**Then** they see a paginated data table of all submissions with columns: title, status (StatusChip), reviewer response indicators, days in current stage, and severity indicator (FR20)

**Given** the submission list
**When** it contains more than 25 items
**Then** cursor-based pagination via `usePaginatedQuery` loads more items on scroll with "Load more" trigger

**Given** the dashboard
**When** the editor uses filter controls
**Then** they can filter by status (multi-select chips), search by title, and sort by columns — filter state persists in URL params

**Given** any submission in the list
**When** the editor clicks it
**Then** a zoom-in navigation transition opens the submission detail view at `/editor/submissions/$id`
**And** the editor layout includes a 240px sidebar with navigation and pipeline filters
**And** real-time updates reflect new submissions and status changes without page refresh (FR20)

### Story 3.2: Submission Detail View with Triage Results

As an editor,
I want to view the full detail of any submission including its triage report,
So that I can make informed editorial decisions.

**Acceptance Criteria:**

**Given** an editor on the submission detail page
**When** the page loads
**Then** they see: paper metadata, PDF access, current status with StatusChip, and the complete triage report (FR21)

**Given** the triage report section
**When** it renders
**Then** it shows TriageReportCards for each dimension (scope fit, formatting, citations, claims) with severity indicators and expandable detail

**Given** a submission in TRIAGE_COMPLETE status
**When** the editor clicks the StatusChip
**Then** a dropdown shows valid transitions (DESK_REJECTED or UNDER_REVIEW) and the chip animates to the new state on selection

**Given** a desk reject decision
**When** the editor confirms
**Then** the submission transitions to DESK_REJECTED with a Tier 1 undo toast (10s grace period) (FR26)
**And** back navigation uses pull-back animation returning to the dashboard

### Story 3.3: Action Editor Assignment and Audit Trail

As an Editor-in-Chief,
I want to assign action editors to submissions and see a full audit trail,
So that I can delegate editorial responsibility and maintain accountability.

**Acceptance Criteria:**

**Given** a submission without an action editor
**When** the Editor-in-Chief opens the assignment interface
**Then** they can assign an action editor (self or another editor) with one click (FR22)

**Given** any editorial action (assignment, status transition, invitation, decision)
**When** it occurs
**Then** an audit log entry is created via internalMutation with: submissionId, actorId, actorRole, action, details, and timestamp (FR25)

**Given** the submission detail page
**When** the editor views the audit trail
**Then** an AuditTimeline displays chronological entries with connected dots, timestamps, actor names, and action descriptions — filterable by action type

**Given** the audit trail
**When** it contains many entries
**Then** it uses cursor-based pagination via `usePaginatedQuery`
**And** audit logs are append-only — no update or delete mutations exist on the auditLogs table

### Story 3.4: Reviewer Profile Management and Embedding Generation

As an admin or editor,
I want a reviewer pool with expertise profiles and vector embeddings,
So that the system can match reviewers to papers intelligently.

**Acceptance Criteria:**

**Given** the admin interface
**When** a reviewer profile is created or updated
**Then** it stores: name, affiliation, research areas, publications (3+), and expertise matching data (FR19)

**Given** a reviewer profile
**When** it is saved
**Then** a Convex Action generates a vector embedding via OpenAI text-embedding-3-large from the reviewer's research areas and publication titles, stored in the reviewer document for vector search

**Given** the Action file
**When** it calls external APIs
**Then** it includes `"use node";` as the first line and sanitizes API responses before writing results
**And** the reviewer pool is viewable and manageable from the `/admin/` route

### Story 3.5: Intelligent Reviewer Matching with Explainable Rationale

As an action editor,
I want the system to suggest matched reviewers for a submission with specific rationale for each match,
So that I can assign the most qualified reviewers with confidence.

**Acceptance Criteria:**

**Given** a submission ready for review
**When** the editor triggers reviewer matching
**Then** the system generates a paper embedding, runs `ctx.vectorSearch()` against the reviewer pool, and returns 5 ranked matches (FR16)

**Given** each match suggestion
**When** it renders as a ReviewerMatchCard
**Then** it displays: reviewer name, affiliation, expertise tags, match rationale (1-2 sentences explaining specific paper-expertise overlap), and a confidence indicator (FR17)

**Given** the match list
**When** the editor interacts
**Then** they can select (accent border + checkmark), dismiss (muted, moved to bottom), or search manually for additional reviewers (FR18)

**Given** reviewer matching
**When** results return
**Then** they appear within 30 seconds of the match request (NFR3)
**And** a follow-up LLM call generates the explainable rationale for each match

### Story 3.6: Reviewer Invitation and Progress Monitoring

As an action editor,
I want to invite selected reviewers and monitor their response and review progress,
So that I can keep the review process on track.

**Acceptance Criteria:**

**Given** selected reviewers
**When** the editor sends invitations
**Then** invitation records are created in `reviewInvites` with signed tokens (jti, reviewAssignmentId, submissionId, exp), 24hr TTL, and tokenHash stored (FR23)

**Given** a sent invitation
**When** it renders
**Then** an in-app notification preview shows the email that would be sent (recipient, subject, body with match rationale)

**Given** active review assignments
**When** the editor views the submission detail
**Then** they see reviewer response indicators: accepted + submitted (green), accepted + overdue (amber), not responded (red) (FR24)

**Given** an overdue reviewer
**When** the editor takes action
**Then** they can send a reminder (with Tier 1 undo toast) or reassign
**And** editors/admins can revoke pending invites by setting `revokedAt`
**And** invitation sends use Tier 1 undo toast with 10s grace period

### Story 3.7: Editorial Decisions

As an editor,
I want to make accept, reject, or revision-requested decisions on submissions,
So that the editorial pipeline progresses to resolution.

**Acceptance Criteria:**

**Given** a submission with completed reviews
**When** the editor makes a decision
**Then** they can choose: Accept, Reject, or Request Revision — each with the appropriate status transition enforced via the transition map (FR26)

**Given** an accept decision
**When** confirmed
**Then** the submission transitions to ACCEPTED, reviewer identities are set to be revealed (per semi-confidential rules), and a Tier 1 undo toast appears (10s grace)

**Given** a reject decision
**When** confirmed
**Then** the submission transitions to REJECTED with a Tier 1 undo toast (10s grace)

**Given** a revision request
**When** confirmed
**Then** the submission transitions to REVISION_REQUESTED with specific required changes noted, and a Tier 1 undo toast appears

**Given** the payment calculation for this submission
**When** the editor views it
**Then** they see per-reviewer payment summaries (FR27)
**And** all decisions are logged in the audit trail

---

## Epic 4: Review Process & Semi-Confidential Discussion

Reviewers can access assigned papers via invitation links with minimal onboarding, read papers inline, submit structured reviews, and participate in semi-confidential threaded discussions with identity gating enforced by role and submission outcome.

### Story 4.1: Reviewer Invitation Acceptance and Onboarding

As a reviewer,
I want to click an invitation link and be reading the paper within 60 seconds,
So that the review process respects my time from the very first interaction.

**Acceptance Criteria:**

**Given** a reviewer with an account
**When** they click an invitation link with a valid token
**Then** the token is validated (signature, expiry, consumedAt, revokedAt), `consumedAt` is atomically set, and they are redirected to the review workspace at `/review/$id`

**Given** a reviewer without an account
**When** they click an invitation link
**Then** inline Clerk sign-up appears as a minimal overlay (email + name) on the review page itself, paper loading behind it — role assignment executes only after token validation succeeds

**Given** an expired invitation token
**When** the reviewer clicks the link
**Then** they see a clear message with a "Request new link" action

**Given** a consumed or revoked token
**When** the reviewer clicks the link
**Then** they see an appropriate error message (INVITE_TOKEN_USED or revoked)
**And** the entire flow from link click to reading the paper completes in under 60 seconds including account creation

### Story 4.2: Split-View Review Workspace with Inline PDF

As a reviewer,
I want to read the paper inline alongside my review form in a split-view workspace,
So that I can read and write without switching between contexts.

**Acceptance Criteria:**

**Given** the review workspace
**When** it loads
**Then** a split-view displays: left panel (55% default) with the paper rendered as web content using Newsreader serif at 18px/1.7 line height/75ch max-width, right panel (45% default) with the review form (FR28)

**Given** the split-view
**When** the reviewer drags the resize handle
**Then** panels resize with minimum widths enforced (480px paper, 360px review) — if window too narrow, review panel becomes a tabbed full-width view

**Given** the workspace header
**When** it renders
**Then** it shows: breadcrumb ("Reviews / [Paper Title]"), ConfidentialityBadge ("Hidden from authors" with green dot, persistent, not dismissible), and auto-save status indicator

**Given** the reviewer
**When** they collapse a panel
**Then** they can focus entirely on reading or writing, with a toggle to restore the split view

### Story 4.3: Structured Review Form with Auto-Save

As a reviewer,
I want to write a structured review with auto-saving sections,
So that I can provide a thorough assessment without worrying about losing my work.

**Acceptance Criteria:**

**Given** the review form
**When** it renders
**Then** it displays structured ReviewSectionForm sections: Summary, Strengths, Weaknesses, Questions, Recommendation — each with section header, status badge (not started/in progress/complete), rich text area with Newsreader font, word count, and collapsible guidance text (FR29)

**Given** any section
**When** the reviewer types
**Then** auto-save triggers at 500ms debounce, uses `withOptimisticUpdate()` for instant UI feedback, and shows persistent save indicator ("Saved" / "Saving..." / "Offline")

**Given** an auto-save
**When** a VERSION_CONFLICT occurs
**Then** the local draft is preserved and merge/reload options are shown (never silent overwrite)

**Given** the review form
**When** sections are completed
**Then** a ProgressRing (28px SVG) in the panel header updates with spring animation showing completion fraction (e.g., "3/5")

**Given** a completed review
**When** the reviewer clicks submit
**Then** a pre-submission summary shows the full review in readable format, word count, and completeness check — confirming submits with a spring animation (200ms) and transitions to "submitted" state
**And** submitted reviews have a 15-minute Tier 2 edit window before locking

### Story 4.4: Semi-Confidential Threaded Discussion

As a reviewer, author, or editor,
I want to participate in threaded discussion on a submission where identity visibility follows the semi-confidential rules,
So that the review conversation is productive while maintaining appropriate confidentiality.

**Acceptance Criteria:**

**Given** a submission with reviews
**When** the discussion thread renders
**Then** it shows chronologically ordered comments with role badges, timestamps, and reply actions — nested replies indented with left border (FR30)

**Given** an author viewing the discussion
**When** comments render
**Then** reviewer avatars are anonymous placeholders, names show "Reviewer 1" / "Reviewer 2", and editor names are visible (FR31)

**Given** a reviewer viewing the discussion
**When** comments render
**Then** other reviewer names are visible, author names are visible, and editor names are visible (FR32)

**Given** an editor viewing the discussion
**When** comments render
**Then** all participant names are visible across all roles

**Given** an accepted submission
**When** the discussion renders for the author
**Then** reviewer identities are revealed by default (editor can grant exceptions for permanent confidentiality) (FR33)

**Given** a rejected submission
**When** the discussion renders
**Then** reviewer identities remain permanently confidential to authors (FR34)

**Given** a rejected submission
**When** the author views it
**Then** they see an option to make the review conversation public (FR35)
**And** new comments appear in real-time via reactive queries with subtle highlight background that fades after 3 seconds
**And** posted comments have a 5-minute Tier 2 edit window, after which "Delete" becomes "Retract" (content hidden, placeholder shown)

---

## Epic 5: Reviewer Abstract & Publication

Accepted papers flow through reviewer abstract drafting, author approval, and publication as web-first article pages with dual abstracts, clean typography, and full metadata.

### Story 5.1: Reviewer Abstract Drafting and Signing

As a selected reviewer,
I want to draft a reviewer abstract using material from the review discussion, and choose whether to sign it,
So that my professional assessment becomes a published artifact that helps readers.

**Acceptance Criteria:**

**Given** an accepted paper
**When** a reviewer is selected for the abstract
**Then** a dedicated drafting interface appears with: the discussion thread accessible as source material, a rich text area with Newsreader font, a 150-500 word target with live word counter, and editorial guidance ("intended to be the abstract a potential reader would most want to read") (FR36)

**Given** the abstract drafting form
**When** the reviewer types
**Then** auto-save triggers at 500ms debounce with persistent save indicator, identical to the review form auto-save pattern

**Given** the draft
**When** it is ready
**Then** the reviewer can choose to sign the abstract with their name or remain anonymous (FR38)

**Given** the draft
**When** submitted
**Then** it enters a draft state that remains fully editable until the editor approves it (Tier 2 edit window)
**And** the abstract invitation feels prestigious — messaging communicates "you've been selected to write the published abstract for this paper"

### Story 5.2: Author Acceptance of Reviewer Abstract

As an author,
I want to review and accept the reviewer abstract before it is published alongside my paper,
So that I can ensure the published summary fairly represents my work.

**Acceptance Criteria:**

**Given** a completed reviewer abstract
**When** presented to the author
**Then** they see the full text with reviewer attribution (signed name or "Anonymous Reviewer") alongside their own abstract for comparison (FR37)

**Given** the author review
**When** they accept
**Then** the abstract is marked as approved and the paper proceeds toward publication

**Given** the author review
**When** they have concerns
**Then** they can provide feedback via the discussion thread, and the reviewer can revise before resubmission
**And** the editorial flow logs abstract submission and approval events in the audit trail

### Story 5.3: Published Article Page with Dual Abstracts

As a public reader,
I want to read published articles with both author and reviewer abstracts in clean, web-first typography,
So that I can quickly assess whether the paper is worth reading.

**Acceptance Criteria:**

**Given** a published article
**When** a reader navigates to `/article/$id`
**Then** the page renders in reader mode with warm color temperature (cream/ivory background), Newsreader serif throughout, and no auth required (FR39)

**Given** the article page
**When** it loads
**Then** a DualAbstractDisplay shows: the reviewer abstract positioned first or equally prominent (labeled "Reviewer Abstract" with reviewer name if signed, subtle left border accent on elevated surface), followed by the author abstract (labeled "Abstract" on neutral surface) (FR40)

**Given** the article page
**When** metadata renders
**Then** it shows: authors, publication date, DOI placeholder, CC-BY 4.0 badge, and reviewer attribution (signed name or "Anonymous Reviewer") (FR41, FR43)

**Given** the article page
**When** the reader wants the PDF
**Then** a one-click PDF download is available with no login required (FR42)
**And** the article body renders at text-lg (18px) with leading-relaxed (1.7) and max-width 75ch
**And** the page includes clean URLs, meta tags, and OpenGraph data for social sharing

---

## Epic 6: Payment Tracking & Notifications

Reviewers see transparent compensation calculations, editors view payment summaries, and the system renders in-app notification previews for all email touchpoints.

### Story 6.1: Reviewer Payment Calculation and Display

As a reviewer,
I want to see a transparent, real-time calculation of my compensation as I progress through the review,
So that I understand exactly what I'm earning and why.

**Acceptance Criteria:**

**Given** a reviewer on the review workspace
**When** the PaymentCalculator renders
**Then** it displays as a collapsible footer pinned to the bottom of the review panel: collapsed shows total estimate, expanded shows line items (FR44)

**Given** the expanded calculator
**When** it renders
**Then** it shows: base pay ($100 + $20/page excluding appendices), speed bonus ($100 per week before 4-week deadline with countdown), quality multiplier (pending editor assessment or 2x for "excellent"), and abstract bonus ($300 if applicable) — each line showing formula and calculated value

**Given** the payment display
**When** it first expands
**Then** line item values animate with a counting-up effect and the total recalculates with a number transition

**Given** the payment calculation
**When** computed
**Then** it is calculated in Convex queries (no stored derived data), display-only with no actual payment processing (FR46)

### Story 6.2: Editor Payment Summary View

As an editor,
I want to view per-reviewer payment summaries for each submission,
So that I can track compensation obligations and assess review quality incentives.

**Acceptance Criteria:**

**Given** the submission detail page (editor view)
**When** the editor views the payment section
**Then** they see a per-reviewer payment summary table showing each reviewer's: base pay, quality multiplier (with editor assessment input), speed bonus, abstract bonus, and total (FR45)

**Given** the quality multiplier
**When** the editor assesses a review
**Then** they can set the quality level (standard or excellent), which updates the multiplier and recalculates the total in real-time

**Given** the payment summary
**When** computed
**Then** all calculations use the same formula as the reviewer-facing calculator, ensuring consistency
**And** payment information is display-only — no payment processing or external integrations (FR46)

### Story 6.3: In-App Notification Previews

As an editor,
I want to see previews of all emails the system would send at each touchpoint,
So that I can verify communication content and the system demonstrates a complete notification flow.

**Acceptance Criteria:**

**Given** any email touchpoint (reviewer invitation, status update, decision notification, reminder)
**When** the action is taken
**Then** an in-app notification preview renders showing: recipient, subject line, and full body content (FR52, FR53)

**Given** a reviewer invitation
**When** the preview renders
**Then** the email body includes: paper title, match rationale explaining why this reviewer was selected, compensation range ($500-$1,500), 4-week deadline, and the invitation link

**Given** a status notification (e.g., submission accepted, revision requested)
**When** the preview renders
**Then** the email body includes appropriate context for the recipient (author sees decision with next steps, reviewer sees outcome)
**And** notification previews are contextual — displayed inline near the triggering action, not in a separate notification center

---

## Epic 7: Seed Data & Demo Experience

The system ships with realistic seed data across all pipeline stages plus the demo-only role switcher and cmd+K palette for evaluator exploration.

### Story 7.1: Seed Data Generation Action

As a developer deploying the prototype,
I want a seed data Action that populates the system with realistic data across all pipeline stages,
So that evaluators see a living journal, not an empty shell.

**Acceptance Criteria:**

**Given** a preview deployment
**When** `--preview-run 'seedData'` executes
**Then** the `convex/seed.ts` Action populates the database with coherent, interconnected data (FR47)

**Given** the seed Action
**When** it runs
**Then** it creates 5+ submissions at different pipeline stages: at least 1 submitted (with triage running or complete), 1 under review (with active reviewer assignments), 1 accepted (with completed reviews and discussion), 1 rejected (with confidential reviews), and 1 published (with reviewer abstract) (FR47)

**Given** the seed data
**When** triage reports are created
**Then** they contain substantive, structured analysis generated from real alignment paper content — scope fit, formatting, citations, and claims dimensions with realistic severity assessments (FR48)

**Given** the seed Action file
**When** it executes
**Then** it includes `"use node";` as the first line and uses internalMutation for all database writes
**And** the seed Action is idempotent — running it twice does not create duplicate data

### Story 7.2: Seed Reviewer Pool with Expertise Profiles

As a developer,
I want a realistic reviewer pool seeded with profiles, publications, and vector embeddings,
So that reviewer matching produces meaningful results during the demo.

**Acceptance Criteria:**

**Given** the seed Action
**When** it creates reviewer profiles
**Then** it generates 5+ reviewers with: realistic names, affiliations (e.g., "MIRI", "Anthropic", "DeepMind", "Oxford FHI", "UC Berkeley"), research areas relevant to alignment (corrigibility, agent foundations, decision theory, value alignment, interpretability), and 3+ publication titles each (FR51)

**Given** each reviewer profile
**When** created
**Then** a vector embedding is generated via OpenAI text-embedding-3-large from their research areas and publication titles, enabling vector search matching

**Given** the reviewer pool
**When** reviewer matching runs against a seed submission
**Then** the suggestions return with paper-specific rationale that references the reviewer's actual research areas and publications

### Story 7.3: Seed Reviews, Discussions, and Published Article

As an evaluator (Jess or Dan),
I want to see sample reviews with discussion threads and at least one fully published article with a reviewer abstract,
So that I can assess the complete editorial workflow without waiting for real submissions.

**Acceptance Criteria:**

**Given** seed submissions under review
**When** the data is populated
**Then** they include sample structured reviews (summary, strengths, weaknesses, questions, recommendation) written in realistic academic tone (FR49)

**Given** seed submissions with reviews
**When** the data is populated
**Then** they include sample discussion threads with reviewer-author exchanges, demonstrating the semi-confidential threading (FR49)

**Given** the published seed article
**When** viewed at `/article/$id`
**Then** it displays with: a complete author abstract, a signed reviewer abstract, full metadata, and PDF download — indistinguishable from a real published article (FR50)

**Given** the seed data
**When** all stages are populated
**Then** the editor dashboard shows a coherent pipeline: submissions at different stages, reviewer assignments at different response states, and a complete audit trail that tells a believable story
**And** seed data tells a coherent narrative — the same submission can be traced through its lifecycle with consistent actors and decisions
