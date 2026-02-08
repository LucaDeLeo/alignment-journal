---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
status: complete
inputDocuments:
  - "product-brief-alignment-journal-2026-02-06.md"
  - "research/technical-full-tech-stack-alignment-journal-research-2026-02-06.md"
  - "context/alignment-journal.md"
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 1
  context: 1
  projectDocs: 0
classification:
  projectType: "Web Application (SaaS-like platform)"
  domain: "Academic Publishing / Scientific Research"
  complexity: "Medium-High"
  projectContext: "greenfield"
date: 2026-02-06
---

# Product Requirements Document - alignment-journal

**Author:** Luca
**Date:** 2026-02-06
**Scope:** Prototype (1-week build for founding engineer application)

## Executive Summary

A production-deployed prototype of the Alignment Journal's editorial platform demonstrating full-stack execution, UX-first design thinking, and strategic product vision. The prototype delivers a complete submission-to-publication pipeline with working LLM triage (scope validation, formatting checks, citation/claims analysis) and intelligent reviewer matching — the two hardest technical problems — alongside a clean submission flow, editor dashboard, review UI, and publication pages.

**Core Differentiator:** Purpose-built software for a journal with mechanisms that don't exist elsewhere: paid peer review with multi-factor incentive design, reviewer abstracts published alongside papers, semi-confidential review with configurable post-decision disclosure, and LLM-powered desk triage. No existing platform supports these; this prototype proves they can work.

**Target Evaluators:** Jess Riedel (founding editor) and Dan Mackinlay (founding editor). The prototype succeeds if they conclude within 10 minutes of exploring: "This person should build our platform."

## Success Criteria

### User Success

**Reviewer (Elena):** Clicks invitation link, reading paper in under 60 seconds. Writes a structured review without fighting the UI. Threaded discussion feels natural, not like filing a form. Never accidentally sees another reviewer's identity.

**Editor (Jess):** Opens dashboard, instantly sees what needs attention. Triage reports are substantive enough to inform desk-reject decisions without reading the full paper. Reviewer matching suggestions include clear rationale she can act on. Audit trail shows the full story per submission.

**Author (Marcus):** Submits a PDF, gets triage feedback within minutes (not weeks). Can track submission status. Sees review discussion and decision without confusion.

**Reader:** Browses a published article with dual abstracts (author + reviewer) that looks like a real journal, not a prototype.

### Business Success

- **Primary:** Jess and Dan receive a production URL and GitHub repo, explore for 10 minutes, and conclude this person should build their platform.
- **Secondary:** The codebase is genuinely evolvable — not throwaway. Architectural decisions hold up under scrutiny.
- **Signal of depth:** At least 2-3 product decisions beyond what was explicitly specified, demonstrating understanding of the journal's mission.

### Technical Success

- Full submission-to-publication pipeline navigable end-to-end without dead ends or broken pages
- LLM triage produces substantive, actionable reports on real alignment papers
- Reviewer matching returns well-reasoned suggestions with explainable rationale
- Semi-confidential review mechanics work correctly (identity hidden from authors, visible to editors)
- Seed data tells a coherent story — 5+ submissions across pipeline stages, sample reviews, 1+ published article with reviewer abstract
- Codebase is clean, well-structured, and deployable by another developer from the README

### Measurable Outcomes

| Metric | Target |
|--------|--------|
| Pipeline completeness | 100% of core flows (author, editor, reviewer, reader) work |
| Time-to-first-review-action | < 60 seconds from invitation link |
| LLM triage quality | Substantive report on a real alignment paper |
| Reviewer match quality | Suggestions include paper-specific rationale |
| Seed data realism | 5+ submissions, multiple stages, 1+ published article |
| Build time | 7 days to deployed production URL |
| Code quality | Clean architecture, clear README, no dead code |

## User Journeys

### Journey 1: Elena Reviews a Paper (Priority Journey)

Elena is a senior research scientist at a frontier AI lab. She's deep in agent foundations and decision theory, perpetually overcommitted, and burned out on conference reviewing. She accepted this invitation because the pay is real, the paper is in her wheelhouse, and the invitation email made that clear.

**Invitation:** Elena receives an email from the action editor — paper title, why she was matched (her published work on corrigibility overlaps with the submission's core argument), compensation details ($500-$1500 depending on quality and speed), and a 4-week deadline. She clicks the link.

**Onboarding:** She lands on a clean review page. Account creation is minimal — email and name. The paper PDF loads inline. No hunting through menus, no confusing dashboard she doesn't need. She's reading the paper within 60 seconds of clicking the link.

**Review:** She reads the paper in a comfortable interface. When ready, she fills a structured review form — summary, strengths, weaknesses, questions, recommendation. The form guides without constraining. She submits.

**Discussion:** A threaded conversation opens. She sees the other reviewers' comments (anonymized) and the authors' responses. The back-and-forth is focused. She responds to a clarification from the authors in under 5 minutes. Semi-confidential mechanics work: the authors don't see her name, but the editor does.

**Resolution:** The paper is accepted. She's asked to draft the reviewer abstract — a 150-500 word reader-oriented condensed review that conveys strengths, caveats, and audience fit. She draws on the discussion thread. She signs it with her name — this adds to her professional reputation.

**Payment:** She sees a clear summary: base pay ($500) + quality multiplier (excellent: 2x) + speed bonus ($200 for submitting 2 weeks early) + abstract bonus ($300) = $1,500. She knows exactly what she earned and why.

**Capabilities revealed:** Invitation link with direct review access, minimal onboarding, inline PDF reading, structured review form, threaded semi-confidential discussion, reviewer abstract drafting, payment calculation display.

### Journey 2: Jess Manages the Editorial Pipeline

Jess is the founding editor, managing 10-30 active submissions. She needs to see at a glance what's stuck, who's slow, and which papers need action.

**New submission:** She opens the dashboard. A new submission has arrived. LLM triage has already run — she sees a structured report: scope fit (strong match — theoretical alignment, agent foundations), formatting (minor issues flagged — missing page numbers), citation check (23 citations extracted, 2 unresolvable), claims analysis (3 key claims identified with supporting evidence assessment). She reads the abstract and the triage report. Decision: send to review.

**Assignment:** She assigns an action editor (herself, for now). The system suggests 5 matched reviewers ranked by expertise overlap, with rationale for each match. She selects 3, sends invitations from within the platform.

**Monitoring:** Over the next weeks, she checks the dashboard. Color-coded status shows: Reviewer 1 accepted and submitted (green), Reviewer 2 accepted but overdue (amber), Reviewer 3 hasn't responded (red). Full audit trail shows every action taken on this submission.

**Decision:** Reviews are in. She reads them, facilitates a brief discussion, and makes the accept decision. The reviewer abstract is drafted, authors approve it, and the paper enters the publication pipeline.

**Capabilities revealed:** Submission pipeline dashboard with status filtering, LLM triage report display, action-editor assignment, reviewer matching with rationale, reviewer invitation, progress monitoring with status indicators, audit trail, decision workflow.

### Journey 3: Marcus Submits a Paper

Marcus is an independent alignment researcher with a theory paper on corrigibility. Too abstract for NeurIPS, too technical for the Alignment Forum to give deep feedback.

**Submission:** He creates an account (email, name, affiliation). Fills a minimal metadata form: title, authors, abstract, keywords. Uploads his PDF. Clicks submit.

**Triage feedback:** Within minutes, he gets automated feedback. Scope fit: strong match. Formatting: two issues flagged (missing author affiliations section, inconsistent citation format). He notes these for revision but the paper proceeds. He didn't wait weeks for a human to tell him this.

**Status tracking:** Over the following weeks, he can see his submission's status: "Under Review." He doesn't see who's reviewing, but he knows it's happening.

**Review interaction:** Reviews arrive. He sees structured feedback in a threaded interface. He responds to clarifying questions. The discussion is focused and substantive — nothing like the surface-level AF comments he's used to.

**Decision:** Accepted. He sees the reviewer abstract alongside his own abstract on the published article page. His work has institutional legitimacy. His funders can point to a peer-reviewed publication.

**Capabilities revealed:** Account creation, metadata form, PDF upload, automated triage feedback, submission status tracking, threaded review interaction, published article view.

### Journey 4: Public Reader Discovers a Published Paper

A researcher sees a link on Twitter to a published Alignment Journal article. She clicks through.

**Article page:** Clean, web-first typography. Two abstracts are displayed prominently: the author's abstract and the reviewer abstract. The reviewer abstract contextualizes the paper — strengths, caveats, relationship to prior work, who would benefit from reading it. She reads the reviewer abstract first and decides the paper is worth her time.

**Metadata:** Authors, publication date, DOI placeholder, CC-BY badge. PDF download available. Citation info one click away.

**Capabilities revealed:** Web-first article view, dual abstract display, article metadata, PDF download, clean typography.

### Journey Requirements Summary

| Capability Area | Revealed By |
|----------------|-------------|
| Authentication & role-based access | All journeys |
| LLM triage pipeline | Editor, Author journeys |
| Reviewer matching with rationale | Editor journey |
| Structured review form | Reviewer journey |
| Threaded semi-confidential discussion | Reviewer, Author journeys |
| Editor dashboard with status pipeline | Editor journey |
| Submission flow (metadata + PDF) | Author journey |
| Publication pages with dual abstracts | Reader, Reviewer journeys |
| Payment calculation display | Reviewer journey |
| Reviewer abstract drafting | Reviewer journey |
| Audit trail | Editor journey |
| Email simulation (in-app previews) | Editor journey |

## Domain-Specific Requirements

### Academic Publishing Constraints

**Semi-Confidential Review Mechanics (Critical):**
- During review: reviewer identity hidden from authors, visible to editors and other reviewers
- On acceptance: reviewer identities revealed by default; editors can grant permanent confidentiality in exceptional cases
- On rejection: reviewer identity remains permanently confidential; authors may opt to make the review conversation public; reviewers may adapt their own comments for other forums
- Reviewer abstract: can be signed by one or more reviewers; unsigned abstracts still carry credibility via the journal's reputation for selecting good reviewers

**Archival Policy:**
- Publication constitutes the version of record — authors cannot publish the same work in another journal or conference
- Pre-prints (arXiv) are permitted

**Licensing:**
- All published work including reviewer abstracts released under CC-BY 4.0
- Diamond Open Access — no publication fees

**Review Compensation Formula:**
- Base pay: $100 + $20/page (excluding appendices)
- Quality multiplier: 2x for "excellent" reviews (editor-assessed)
- Speed bonus: $100 per week submitted before the nominal 4-week deadline
- Reviewer abstract bonus: $300
- Range: ~$600 (standard) to ~$1,500 (excellent + fast + abstract)

**Scope Definition:**
- Theoretical AI alignment: agency, understanding, asymptotic behavior of advanced synthetic agents
- Conceptual and mathematically abstract ideas transcending contemporary architectures
- Empirical work welcome but no emphasis on SOTA benchmarks
- Out of scope (for now): AI governance, deployment, applied mechinterp, evaluations, societal impact

### Data Handling

- Submitted PDFs stored securely with access restricted to authorized roles
- Review content accessible only to participants and editors per semi-confidential policy
- No personally identifying information beyond what users provide (name, email, affiliation)
- No regulatory compliance requirements (no HIPAA, PCI, SOX)

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. LLM-Powered Desk Triage:**
No existing editorial platform runs automated LLM analysis on submissions. The prototype demonstrates multi-pass analysis: scope fit validation against the journal's stated focus, formatting/completeness checks, citation extraction and verification, and technical quality signals (claims analysis, proof structure detection). This replaces weeks of manual editor assessment with minutes of automated screening.

**2. Reviewer Abstracts as Published Artifact:**
A genuinely novel mechanism. Reviewer abstracts compress the review process output into a reader-oriented condensed review published alongside the paper. This is distinct from OpenReview's terse "Paper Decision" paragraphs — it's substantive (150-500 words), reader-optimized, and designed to help potential readers decide if the paper is worth reading. Tested at the ODYSSEY conference proceedings.

**3. Paid Review with Multi-Factor Incentive Design:**
Not just "pay reviewers" — a deliberately designed incentive experiment with quality multipliers, speed bonuses, and abstract bonuses. The payment formula is intended to iterate based on observed outcomes. This treats reviewer compensation as an incentive-design problem, not just a payment.

**4. Intelligent Reviewer-Paper Matching:**
Embedding-based matching of papers to reviewers using research area, publication history, and expertise signals. Each match includes explainable rationale — not just a similarity score, but specific reasons why this reviewer fits this paper.

### Validation Approach

Each innovation is validated by the prototype itself: LLM triage runs on real alignment papers, reviewer matching generates matches against a realistic reviewer pool, and the review UI supports the full semi-confidential workflow. The evaluators (Jess and Dan) are domain experts who can immediately assess whether these mechanisms produce useful output.

## Web Application Requirements

### Application Architecture

- Server-rendered with client-side reactivity for real-time features (dashboard, discussions)
- Single codebase deployed as serverless functions
- Real-time updates for editor dashboard, triage progress, and discussion threads
- No mobile-optimized layouts (prototype scope — desktop-first)

### Role-Based Access Control

| Role | Capabilities |
|------|-------------|
| Author | Submit papers, view own submission status, participate in review discussion, view published articles |
| Reviewer | View assigned papers, submit structured reviews, participate in discussion, draft reviewer abstract |
| Action Editor | View assigned submissions, manage reviewer selection and assignment, monitor review progress, submit decision recommendation |
| Editor-in-Chief | View all submissions, assign action editors, make final accept/reject decisions, view all reviewer identities, manage audit trail |
| Admin | Configure system settings, manage user accounts and role assignments, manage reviewer pool, view system-wide analytics |

### Browser Support

- Modern evergreen browsers (Chrome, Firefox, Safari, Edge — latest 2 versions)
- Desktop-first — no mobile optimization required for prototype

### SEO Considerations

- Published article pages should have clean URLs, meta tags, and OpenGraph data for social sharing
- Non-public pages (dashboard, review interface) do not require SEO

### Real-Time Requirements

- Editor dashboard: submissions list updates when new submissions arrive or status changes
- Triage progress: editor sees each analysis pass complete in real-time during LLM processing
- Discussion threads: new messages appear without page refresh
- Reviewer matching: results appear as matching completes

## Project Scoping & Phased Development

### MVP Strategy

**Approach:** Experience MVP — demonstrate that the full editorial workflow works end-to-end with real content, real LLM output, and real UX. The prototype must feel like a functioning journal, not a wireframe.

**Constraint:** 1 solo developer, 7 days, deployed to production.

### MVP Feature Set (Phase 1 — Prototype)

**Tier 1 — Polished (Core differentiators):**
- LLM triage pipeline with structured reports
- Reviewer matching via vector search with explainable rationale
- Review UI with structured form and threaded semi-confidential discussion
- Editor dashboard with status pipeline, triage results, assignment interface, audit trail
- Publication pages with dual abstracts and web-optimized reading typography
- Auth with role-based access (Author, Reviewer, Action Editor, Editor-in-Chief, Admin)

**Tier 2 — Functional (Supporting features):**
- Author submission flow (metadata form + PDF upload)
- Payment tracking (display only, formula-based calculation)
- Seed data across all pipeline stages (5+ submissions, sample reviews, 1 published article)
- Email simulation (in-app notification previews showing what would be sent)
- Reviewer abstract drafting interface

### Post-MVP Features (Phase 2 — Growth)

- Real transactional email (Resend/Postmark)
- DOI minting via Crossref API
- ORCID integration for researcher identity
- Alignment Forum integration (round-up posts, one-click reviewer self-nomination, karma attribution)
- Payment processing (Stripe)
- Analytics (time-in-stage, reviewer response rates, payment summaries)
- Editor's Selection badges and periodic highlights
- Automated deadline reminders

### Future Vision (Phase 3)

- Prediction markets for paper impact forecasting
- Replication bounty system
- Journal-to-conference track certification
- LLM-assisted reviewer abstract drafting from discussion content
- Retrospective review of existing published papers
- Mobile-optimized layouts

### Risk Mitigation

**Technical Risks:**
- TanStack Start RC maturity — mitigate by locking dependency versions, testing on Vercel preview deployments by Day 2, and having a pivot path to Next.js + Convex if blocked
- LLM output quality for triage — mitigate by testing against real alignment papers early (Day 3), iterating prompts
- Convex document model limitations (no aggregates, no foreign keys) — acceptable at journal scale (10-30 active submissions)

**Timeline Risks:**
- 7-day build with novel technologies — mitigate by using Convex SaaS starter template, shadcn/ui for rapid UI, and scoping Tier 2 features as functional-but-simpler
- Budget 0.5 day for framework debugging

## Functional Requirements

### Authentication & Identity

- FR1: Users can create accounts with email, name, and affiliation
- FR2: Users can log in and maintain authenticated sessions
- FR3: System assigns roles (Author, Reviewer, Action Editor, Editor-in-Chief, Admin) with role-specific views
- FR4: Users see only the interface and data appropriate to their role

### Submission Management

- FR5: Authors can create a submission with title, authors, abstract, and keywords
- FR6: Authors can upload a PDF file as part of their submission
- FR7: Authors can view the status of their submissions (submitted, triaging, under review, decision pending, accepted, rejected, published)
- FR8: System confirms successful submission to the author

### LLM Triage Pipeline

- FR9: System automatically extracts text from uploaded PDFs
- FR10: System analyzes submission scope fit against the journal's stated focus areas
- FR11: System checks submission formatting and completeness
- FR12: System extracts citations and flags unresolvable references
- FR13: System analyzes technical claims and identifies key arguments with supporting evidence assessment
- FR14: System generates a structured triage report with per-dimension sections (scope fit, formatting, citations, claims) each containing a finding, severity indicator, and editor-facing recommendation
- FR15: Triage progress updates in real-time as each analysis pass completes

### Reviewer Matching

- FR16: System generates ranked reviewer match suggestions for a given submission based on expertise overlap
- FR17: Each match suggestion includes explainable rationale (research area alignment, relevant publications)
- FR18: Editors can accept, reject, or manually override match suggestions
- FR19: System maintains reviewer profiles with expertise areas, research interests, and expertise matching data for automated reviewer-paper matching

### Editor Dashboard & Workflow

- FR20: Editors can view all submissions in a pipeline view organized by status
- FR21: Editors can view LLM triage results for any submission
- FR22: Editor-in-Chief can assign action editors to individual submissions
- FR23: Action editors can select and invite reviewers from the matching suggestions
- FR24: Editors can monitor review progress per submission (who accepted, who's overdue, who hasn't responded)
- FR25: System maintains a full audit trail of editorial actions per submission (assignments, status transitions, invitations, decisions)
- FR26: Editors can make accept/reject decisions on submissions
- FR27: Editors can view payment calculations per reviewer per submission

### Review Process

- FR28: Reviewers can view assigned papers with inline PDF reading
- FR29: Reviewers can submit structured reviews with sections: summary, strengths, weaknesses, questions, recommendation
- FR30: Authors and reviewers can participate in threaded discussion per submission
- FR31: Reviewer identities are hidden from authors during the review process
- FR32: Reviewer identities are visible to editors and other reviewers at all times
- FR33: On acceptance, reviewer identities are revealed by default (editor can grant exceptions)
- FR34: On rejection, reviewer identities remain permanently confidential
- FR35: On rejection, authors can opt to make the review conversation public

### Reviewer Abstract

- FR36: Selected reviewer can draft a reviewer abstract (150-500 words) using material from the review discussion
- FR37: Reviewer abstract is presented for author acceptance before publication
- FR38: Reviewers can choose to sign or remain anonymous on the published reviewer abstract

### Publication

- FR39: Accepted papers are displayed as web-first article pages with serif body font, 16px+ base size, 1.5+ line height, and max 75 characters per line
- FR40: Published articles display both author abstract and reviewer abstract
- FR41: Published articles show metadata: authors, publication date, DOI placeholder, CC-BY badge
- FR42: Published articles offer PDF download
- FR43: Published articles display reviewer attribution (signed or anonymous)

### Payment Tracking

- FR44: System calculates reviewer compensation using the formula: base ($100 + $20/page) + quality multiplier + speed bonus ($100/week early) + abstract bonus ($300)
- FR45: Editors can view per-reviewer payment summary for each submission
- FR46: Payment information is display-only (no actual payment processing)

### Seed Data & Demonstration

- FR47: System ships with 5+ seed submissions at different pipeline stages (submitted, under review, accepted, rejected, published)
- FR48: Seed data includes sample triage reports generated from real alignment papers
- FR49: Seed data includes sample reviews with discussion threads
- FR50: Seed data includes at least 1 fully published article with reviewer abstract
- FR51: Seed data includes a reviewer pool with 5+ profiles, each containing name, affiliation, research areas, 3+ publications, and expertise matching data

### Notifications (Simulated)

- FR52: System renders in-app notification previews for all email touchpoints (reviewer invitation, status updates, decision notifications)
- FR53: Notification previews show recipient, subject, and body content

## Non-Functional Requirements

### Performance

- Page loads complete in under 2 seconds on broadband connections as measured by browser DevTools network panel (DOMContentLoaded)
- LLM triage pipeline completes all analysis passes within 5 minutes per submission as measured by timestamp delta between submission and final report generation
- Reviewer matching returns results within 30 seconds as measured by UI response time from match request to displayed results
- Real-time updates (dashboard, discussions) reflect changes within 1 second as measured by timestamp delta between mutation and subscriber notification

### Security

- All data transmitted over HTTPS
- Authentication tokens validated on every request
- Role-based access enforced at the data layer — no client-side-only access control
- Reviewer identity isolation enforced server-side (authors cannot access reviewer identity through any endpoint during review)
- LLM API keys stored server-side only, never exposed to client-side code or browser network requests

### Accessibility

- WCAG 2.1 AAA compliance for all pages, with particular attention to published article pages (public-facing content)
- Keyboard navigation for core workflows (submission, review, dashboard)
- Screen reader compatibility on primary interfaces verified by automated accessibility audit (axe-core or equivalent)
- Sufficient color contrast ratios (7:1 for normal text, 4.5:1 for large text)
- Support for prefers-reduced-motion, prefers-contrast, and forced-colors media queries

### Code Quality

- Strict type checking enabled with zero type errors at build time
- File naming follows kebab-case, component naming follows PascalCase, function naming follows camelCase throughout the codebase
- README includes sections for: local setup (< 5 steps to running app), architecture overview with component diagram, seed data explanation, and deployment instructions
- No dead code, commented-out blocks, or TODO hacks in shipped codebase as verified by linter rules
- Git history contains atomic commits with descriptive messages, no merge commits on main branch
