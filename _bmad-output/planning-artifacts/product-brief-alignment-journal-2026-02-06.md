---
stepsCompleted: [1, 2, 3, 4, 5, 6]
status: complete
inputDocuments:
  - "Alignment Journal Description (Jan 2026) — provided in chat"
  - "Founding Software Engineer Job Posting — provided in chat"
date: 2026-02-06
author: Luca
---

# Product Brief: alignment-journal

## Executive Summary

A production-deployed prototype of the Alignment Journal's editorial platform, built as a founding engineer application. The prototype delivers a complete submission-to-publication pipeline with working LLM triage (scope validation, formatting checks, citation/claims analysis) and intelligent reviewer matching — the two hardest technical problems — alongside a clean submission flow, editor dashboard, and review UI. Built custom from scratch in one week, deployed and usable, with architecture designed to scale. The prototype demonstrates full-stack execution, UX-first design thinking, shipping velocity, and strategic product vision that goes beyond the spec.

---

## Core Vision

### Problem Statement

The Alignment Journal needs software to handle its entire editorial workflow — submission, review, and publication — but no existing platform fits. OpenReview has notoriously poor UX. Legacy systems (OJS, Editorial Manager, Scholastica) are clunky and can't support the journal's novel mechanisms: paid review with speed/quality incentives, reviewer abstracts, LLM-assisted desk rejection, and semi-confidential review with configurable post-decision disclosure. Low-code stacks (Airtable + Softr) won't scale and can't handle the LLM integration. Open-source options (Kotahi, Janeway) would require heavy customization that may exceed the effort of building bespoke.

### Problem Impact

Without purpose-built software, the journal either launches on cobbled-together tools that limit its experimental review mechanisms, or delays launch to adapt an ill-fitting platform. Either path risks the core mission: fast, rigorous, high-UX review that attracts top alignment researchers and demonstrates a new model for academic publishing.

### Why Existing Solutions Fall Short

- **OpenReview**: Functional but actively hostile UX; the journal's explicit anti-model
- **Legacy editorial systems (OJS, Editorial Manager)**: Slow, rigid, designed for traditional review workflows with no support for LLM triage, paid review incentive tracking, or reviewer abstracts
- **Low-code stacks (Airtable + Softr + Make)**: Can't support LLM integration, complex review mechanics, or scale gracefully
- **Open-source platforms (Kotahi, Janeway)**: Require extensive customization; adapting them may cost more than building bespoke while inheriting architectural constraints
- **Forum Magnum (LessWrong)**: Great discussion platform but not an editorial management system; potential integration partner, not replacement

### Proposed Solution

A custom-built web application covering the full editorial lifecycle: author submission with PDF upload, editor dashboard with status/blockers/audit trail, action-editor assignment, reviewer recruitment and assignment, semi-confidential review with discussion threads, and a publication pipeline for accepted papers. The hard technical differentiators — LLM-powered triage that checks scope fit, formatting, completeness, and technical quality signals before reviewer time is spent, plus intelligent reviewer-paper matching — will be working, not mocked. Deployed to production and usable from day one. The codebase will be open source, developed in the open, consistent with the journal's commitment to transparency.

### Key Differentiators

- **It's live**: Not a mockup, wireframe, or pitch deck — a deployed, working product
- **LLM triage actually works**: Scope validation, formatting checks, citation verification, and claims analysis running on every submission
- **UX as competitive advantage**: Modern, clean interface designed for "smart but busy" academics — the anti-OpenReview
- **Purpose-built for novel mechanisms**: Reviewer abstracts, paid review incentive tracking, and semi-confidential review are first-class features, not afterthoughts
- **One-week build**: Demonstrates the shipping velocity and engineering judgment the role demands
- **Strategic depth**: Product decisions informed by the full journal vision, not just the immediate spec

---

## Target Users

### Primary Users

**1. Dr. Elena Vasquez — Reviewer (Priority Persona)**
Senior research scientist at a frontier AI lab, occasional Alignment Forum poster. Deep expertise in agent foundations and decision theory. Perpetually overcommitted. She's reviewed for NeurIPS and ICML — the process was painful enough that she now declines most requests. She accepted this one because she's paid, the paper is squarely in her wheelhouse, and the invitation email made that clear.

- **Motivation:** Contribute to the field, get paid fairly for expert work, potentially sign a reviewer abstract that adds to her professional reputation
- **Pain with current tools:** OpenReview is a slog — clunky forms, hard to track discussion threads, no incentive to move fast. Conference reviews feel like unpaid labor with no feedback loop
- **Success looks like:** Receive a paper matched to her expertise, read it in a clean interface, write a structured review without fighting the UI, have a focused back-and-forth with the authors, draft a reviewer abstract she's proud to sign — all within 2-3 weeks
- **Key constraint:** If it takes more than 60 seconds to figure out where things are, she's already annoyed

**2. Prof. Jess Riedel — Editor**
Founding editor. Physicist turned alignment researcher. Managing 10-30 active submissions at any given time. Needs to see at a glance what's stuck, who's slow, which papers need action-editor assignment, and how reviewer payments are tracking. Currently juggling email, spreadsheets, and memory.

- **Motivation:** Build a journal that becomes the canonical home for alignment research. Ship fast, iterate on review mechanisms, prove the model works
- **Pain with current tools:** No tool exists that combines editorial workflow with paid-review tracking, LLM triage results, and reviewer abstract management. Everything is stitched together manually
- **Success looks like:** Open the dashboard, instantly see which submissions need attention, assign reviewers with confidence they're well-matched, track the full lifecycle without touching a spreadsheet

**3. Dr. Marcus Chen — Author**
Independent alignment researcher, PIBBSS fellow. Has a theory paper on corrigibility that's too abstract for NeurIPS and too technical for the Alignment Forum to give deep feedback. Needs a venue that takes his work seriously, reviews it rigorously, and gives it institutional legitimacy.

- **Motivation:** Get rigorous peer review, build publication record outside traditional CS conferences, have his work legibly certified for funders
- **Pain with current tools:** Alignment Forum gave surface-level comments. NeurIPS desk-rejected for being "not empirical enough." Legacy journals would take 12+ months
- **Success looks like:** Submit a PDF, get quick confirmation it's in scope (LLM triage passes), receive deep expert reviews within weeks, see his paper published with a reviewer abstract that contextualizes his contribution

### Secondary Users

**4. Public Reader**
A researcher, funder, or journalist browsing published articles. Discovers papers via social media, AF links, or direct search. Reads the reviewer abstract first to decide if the paper is worth their time. Needs clean, web-first article pages with clear metadata.

- **Key need:** Reviewer abstract prominently displayed alongside author abstract; article readable in browser without downloading a PDF; DOI and citation info available

### User Journeys

**Reviewer Journey (Priority)**
1. **Invitation:** Receives personalized email from editor — paper title, why they were matched, compensation details, deadline
2. **Onboarding:** Clicks link, lands on clean review page. Account creation is minimal (email + name). Paper PDF loads inline
3. **First read:** Reads paper in a comfortable reading interface. Can highlight and annotate
4. **Clarifying questions (optional):** Can ask authors a quick question before committing to a full review — a mechanism the journal explicitly supports
5. **Structured review:** Writes review in guided sections (summary, strengths, weaknesses, questions, recommendation). No fighting with form fields
6. **Discussion:** Engages in threaded conversation with authors and other reviewers. Semi-confidential — reviewer identity hidden from authors during this phase
7. **Reviewer abstract:** If selected, drafts the reviewer abstract using material from the discussion. Gets the $300 bonus
8. **Resolution:** Paper accepted or rejected. If accepted, reviewer can choose to sign the abstract; identity revealed by default per journal policy (with editor-granted exceptions). If rejected, reviewer identity remains confidential; reviewer may adapt their own comments for other forums or social media
9. **Payment:** Sees payment summary — base pay + quality multiplier + speed bonus + abstract bonus. Knows exactly what they earned and why

**Editor Journey**
1. **New submission alert:** Dashboard shows new submission with LLM triage results already run — scope fit score, formatting issues flagged, technical quality signals
2. **Desk decision:** Reviews triage report, reads abstract, decides to send out or desk-reject. Desk-rejected papers never surface publicly
3. **Action-editor assignment:** Editor-in-chief assigns an action editor to manage the paper through review. Action editor takes ownership of reviewer selection, monitoring, and decision recommendation
4. **Reviewer assignment:** Action editor reviews system-suggested matched reviewers based on expertise, selects 2-3, sends invitation emails from within the platform
5. **Monitoring:** Tracks review progress — who's accepted, who hasn't responded, who's overdue. Automated reminders configurable. Full audit trail of all actions and communications logged
6. **Decision:** Action editor reads reviews, facilitates discussion if needed, and submits a decision recommendation. Editor-in-chief makes the final accept/reject decision
7. **Publication:** Accepted paper enters publication pipeline — reviewer abstract finalized, web article generated, DOI assigned

**Author Journey**
1. **Submission:** Creates account, fills minimal metadata form, uploads PDF
2. **Triage feedback:** Receives quick automated feedback on scope and formatting (within hours, not weeks)
3. **Under review:** Can see status (under review, awaiting response, decision pending)
4. **Reviewer interaction:** Responds to clarifying questions and review discussion in threaded interface
5. **Decision:** Receives accept/reject with full reviewer discussion visible. If accepted, reviews and approves the reviewer abstract. If rejected, author may opt to make the review conversation public
6. **Publication:** Paper published on web with both abstracts, DOI assigned, CC-BY license applied

---

## Success Metrics

### Prototype Success (Job Application)

The prototype succeeds if Jess and Dan receive a production URL and GitHub repo link, and within 10 minutes of exploring:

- **Everything works:** Full pipeline is navigable — submit a paper, see triage results, assign reviewers, write a review, publish an article. No dead ends, no broken pages
- **LLM triage impresses:** Upload a real alignment paper PDF and get back a substantive, useful triage report — scope fit analysis, formatting issues, citation checks, technical quality signals. Not a gimmick; actually useful for desk-rejection decisions
- **Reviewer matching is credible:** Given a paper and a reviewer pool, the system suggests well-reasoned matches with explanations of why each reviewer fits
- **UX is visibly better than OpenReview:** Clean, modern, fast. A reviewer can go from invitation link to submitted review without confusion or friction
- **Seed data tells a story:** The platform feels alive — multiple submissions at different stages, sample reviews, a published article with dual abstracts. Not an empty shell
- **Codebase is clean:** The GitHub repo demonstrates architectural judgment — readable, well-structured, scalable patterns. Not a hackathon mess

### Business Objectives

- **Primary:** Get hired as founding software engineer for the Alignment Journal
- **Secondary:** Produce a codebase that can actually evolve into the production platform, reducing throwaway work and demonstrating long-term thinking
- **Strategic:** Show product vision beyond the spec — features or design decisions that signal deep understanding of the journal's mission and the alignment research community's needs

### Key Performance Indicators

| KPI | Target | Measurement |
|-----|--------|-------------|
| End-to-end pipeline completeness | 100% of core flows working | All user journeys (author, editor, reviewer, reader) navigable without errors |
| LLM triage quality | Substantive, actionable reports | Triage report on a real alignment paper reads as genuinely useful to an editor |
| Reviewer matching relevance | Matches feel well-reasoned | Matching suggestions include clear rationale tied to paper content and reviewer expertise |
| Time-to-first-review-action | < 60 seconds | A reviewer clicking an invitation link can start reading the paper within one minute |
| Seed data realism | Feels like a live platform | At least 5 submissions across different stages, sample reviews, 1+ published article |
| Build timeline | 1 week | Deployed to production within 7 days |
| Code quality | Production-grade patterns | Clean architecture, no obvious tech debt, clear README, easy to onboard a new contributor |

**Deferred Metrics (Post-Hire):**
- Time-in-stage analytics per submission
- Reviewer response rate tracking
- Payment accrual and disbursement tracking
- Impact factor and citation tracking
- Author/reviewer satisfaction surveys

---

## MVP Scope

### Core Features (Tier 1 — Polished)

**Authentication & Roles**
- Full auth system with role-based access: Author, Reviewer, Action Editor, Editor-in-Chief, Admin
- Account creation and login
- Role-specific views and permissions (reviewers can't see other reviewer identities during review, action editors see their assigned submissions, editors-in-chief see everything, authors see their own submissions and non-confidential review content)

**LLM Triage Pipeline**
- PDF upload triggers automated analysis
- Scope fit analysis against the journal's stated focus (theoretical AI alignment, agency, understanding, asymptotic behavior)
- Formatting and completeness validation
- Citation extraction and verification
- Technical quality signals (claims analysis, proof structure detection)
- Structured triage report presented to editors with clear actionable sections

**Reviewer Matching**
- Given a paper and a reviewer pool, generate ranked match suggestions
- Each suggestion includes rationale: expertise overlap, relevant publications, research area alignment
- Action editor (or editor-in-chief) can accept/reject suggestions and manually assign

**Review UI**
- Structured review form: summary, strengths, weaknesses, questions, recommendation
- Threaded discussion between authors and reviewers
- Semi-confidential mechanics: reviewer identity hidden from authors during review; on acceptance, identities revealed by default (with editor-granted exceptions for permanent confidentiality); on rejection, reviewer identity stays confidential, authors may opt to make the review conversation public, and reviewers may adapt their own comments for other forums
- Reviewer abstract drafting interface (for selected reviewer post-acceptance)

**Editor Dashboard**
- Submissions list with status pipeline (submitted, triaging, under review, decision pending, accepted, rejected, published)
- Action-editor assignment: editor-in-chief delegates individual submissions to action editors who manage the review process for that paper
- Triage results summary per submission
- Reviewer assignment interface with matching suggestions
- Audit trail of all editorial actions and communications per submission (assignment changes, status transitions, reviewer invitations, decision records)
- Payment tracking display (who earned what based on the compensation formula: base + page rate + quality multiplier + speed bonus + abstract bonus)

**Publication Pages**
- Web-first article view with clean typography
- Dual abstract display: author abstract + reviewer abstract side by side
- Article metadata (authors, date, DOI placeholder, CC-BY badge)
- PDF download link
- Reviewer attribution (signed or anonymous per reviewer choice)

### Core Features (Tier 2 — Functional but Simpler)

**Author Submission Flow**
- Metadata form (title, authors, abstract, keywords)
- PDF upload
- Submission confirmation and status tracking

**Payment Tracking (Display Only)**
- Automatic calculation based on the journal's formula: $100 base + $20/page, quality multiplier, speed bonus, abstract bonus
- Per-reviewer payment summary visible to editors
- No actual payment processing — display and export only

**Seed Data**
- 5+ submissions at different pipeline stages (submitted, under review, accepted, rejected, published)
- Sample triage reports on real alignment papers from the journal's in-scope list
- Sample reviews with discussion threads
- 1+ fully published article with reviewer abstract
- Reviewer pool with realistic profiles and expertise areas

**Email Simulation**
- All email touchpoints (reviewer invitation, status updates, decision notifications) rendered in-app as "notification previews"
- Shows what would be sent, to whom, and when — demonstrates the communication design without SMTP complexity

### Out of Scope for MVP

- Real DOI/Crossref/ORCID integration (placeholders shown)
- Alignment Forum integration
- Automated email delivery (simulated in-app)
- Automated deadline reminders and nudging
- Actual payment processing or disbursement
- Mobile-optimized layouts
- Analytics dashboards (time-in-stage, response rates)
- Editor's Selection / periodic highlight mechanism
- Author opt-in for AF cross-posting
- Interactive content or advanced article formatting
- ISSN registration

### MVP Success Criteria

The MVP succeeds when:
1. A person can create an account, submit a PDF, and see a triage report — without guidance
2. An editor can view the dashboard, see triage results, assign matched reviewers, and track submissions — without confusion
3. A reviewer can click a link, read a paper, submit a structured review, and participate in discussion — in under 5 minutes
4. A public reader can browse a published article with dual abstracts and it looks professional
5. The seed data tells a coherent story of a functioning journal
6. The codebase is clean, documented, and deployable by another developer

### Future Vision

**Post-hire, the platform evolves to support:**
- Real email delivery with templates and scheduling
- DOI minting via Crossref API
- ORCID integration for researcher identity
- Alignment Forum integration (weekly round-up posts of papers under review, author opt-in single-paper AF posts, one-click reviewer self-nomination from AF users, karma attribution for signed reviewer abstracts, post-acceptance status updates on AF, de-emphasis of rejected submissions)
- Payment processing (Stripe or equivalent)
- Editor's Selection badges and periodic highlights
- Analytics: time-in-stage, reviewer response rates, payment summaries
- Automated reminders calibrated to reviewer behavior
- Prediction market integration for paper impact forecasting
- Replication bounty system
- Journal-to-conference track certification
- LLM-assisted reviewer abstract drafting from discussion content
