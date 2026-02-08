---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-07'
inputDocuments:
  - "product-brief-alignment-journal-2026-02-06.md"
  - "prd.md"
  - "prd-validation-report.md"
  - "ux-design-specification.md"
  - "research/technical-full-tech-stack-alignment-journal-research-2026-02-06.md"
workflowType: 'architecture'
project_name: 'alignment-journal'
user_name: 'Luca'
date: '2026-02-07'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
53 FRs across 11 capability areas. The heaviest areas architecturally are: LLM Triage Pipeline (FR9-15, async multi-step computation with real-time progress), Review Process (FR28-35, semi-confidential identity gating), Editor Dashboard (FR20-27, dense real-time pipeline view), and Reviewer Matching (FR16-19, vector search with explainable rationale). Authentication spans all areas as a cross-cutting concern.

**Non-Functional Requirements:**
- Performance: Page loads < 2s, triage pipeline < 5min, matching < 30s, real-time updates < 1s
- Security: HTTPS, JWT validation on every request, role-based access enforced at data layer, reviewer identity isolation server-side, API keys server-side only
- Accessibility: WCAG 2.1 AAA target, keyboard navigation, screen reader support, minimum contrast 7:1 for normal text (4.5:1 for large text), prefers-reduced-motion support, prefers-contrast and forced-colors support
- Code Quality: Strict TypeScript, kebab-case files, atomic git commits, clean README

**Scale & Complexity:**
- Primary domain: Full-stack web application (editorial SaaS platform)
- Complexity level: Medium-High
- Estimated architectural components: ~15-20 distinct modules (auth, submissions, triage pipeline, reviewer matching, review process, discussions, publication, payment calculation, notifications, file storage, vector search, audit trail, seed data, role switching, command palette)

### Technical Constraints & Dependencies

- 7-day build constraint — architecture must favor convention over configuration, starter templates over greenfield setup
- Solo developer — no microservices, serverless monolith pattern required
- Desktop-first (1024px+), light mode only for prototype scope
- UX mandates: shadcn/ui + Tailwind + Motion (Framer Motion), Satoshi + Newsreader + JetBrains Mono fonts, spring animations (150-250ms), split-view workspace, skeleton loading, cmd+K palette
- External dependencies: LLM API (Claude Sonnet 4.5 primary), embedding API (OpenAI text-embedding-3-large), PDF text extraction (unpdf), auth provider (Clerk)
- Deployment: Vercel as hosting platform
- Real-time reactivity is non-negotiable — the editor dashboard, triage progress, and discussions must push updates without polling

### Stack Decision: Convex Commitment

The project includes a comprehensive Convex skill library (13 skills covering schema, security, functions, realtime, file storage, agents, cron jobs, migrations, best practices, HTTP actions, and security auditing). This confirms the stack decision: **TanStack Start + Convex + Clerk + Vercel** (Stack A from the technical research).

Key Convex capabilities that map directly to requirements:
- **Reactive queries** → real-time dashboard, triage progress, discussion threads (zero additional code)
- **Convex Actions** (10min timeout) → LLM triage pipeline execution with progress via reactive queries
- **Convex Agents component** → workflow orchestration for multi-step triage, RAG/vector patterns
- **Built-in vector search** (cosine similarity, 2-4096 dims) → reviewer-paper matching
- **Built-in file storage** (managed CDN) → PDF upload/serving with access control
- **ACID mutations** (1s limit) → editorial state machine transitions with consistency guarantees
- **Cron jobs + scheduled functions** → deadline reminders, status automation
- **Code-based authorization** → role-gated query/mutation wrappers for semi-confidential review
- **Schema-first design** with validators → typed data model with index optimization

Trade-offs accepted:
- No aggregate queries (COUNT requires iteration) — acceptable at journal scale (10-30 active submissions)
- No foreign key constraints — referential integrity maintained in application code
- No offline development — requires internet connection for Convex cloud
- Per-developer pricing on Pro tier — mitigated by startup program (1 year free)
- TanStack Start is RC — pivot path to Next.js + Convex if blocking issues arise by Day 2

### Cross-Cutting Concerns Identified

1. **Authentication & RBAC** — 5 roles (Author, Reviewer, Action Editor, Editor-in-Chief, Admin) with role-specific views, enforced at data layer via Clerk JWT + Convex custom query wrappers
2. **Semi-Confidential Identity Gating** — reviewer identity visibility conditional on viewer role AND submission outcome; enforced server-side in role-gated Convex functions with no client-side leakage
3. **Real-Time Data Sync** — Convex reactive queries for dashboard, triage progress, discussions, matching results — automatic, no WebSocket setup required
4. **Editorial State Machine** — submission status governs permissions, views, notifications, and audit trail entries; ACID mutations enforce valid transitions
5. **Audit Trail** — every editorial action logged with timestamp, actor, and description; dedicated table with filterable queries
6. **Auto-Save & Conflict Resolution** — review form and reviewer abstract auto-save via debounced mutations with revision preconditions; conflicts surface explicit merge/reload UI rather than silent overwrite
7. **File Storage & Access Control** — Convex file storage with storage IDs referenced in submission documents; access checked in queries before generating serving URLs
8. **LLM Integration Pattern** — Vercel AI SDK structured output via Convex Actions; progress written back via mutations for reactive dashboard updates

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (editorial SaaS platform) using TanStack Start + Convex + Clerk + Vercel.

### Starter Options Considered

**Option A: Convex SaaS Starter (`get-convex/convex-saas`)**
- Full-featured: TanStack Start + Convex Auth + Stripe + Resend + Tailwind + shadcn/ui
- Uses Convex Auth (beta) instead of Clerk
- Includes Stripe billing, I18N, React Email — unnecessary for editorial platform
- Significant reshaping required to fit editorial workflow structure

**Option B: Minimal TanStack Start + Convex Template**
- Clean: TanStack Start + Convex + React Query integration
- No auth, no UI, no styling — manual additions required
- Zero unwanted code, zero opinions to fight
- Cleanest foundation for domain-specific editorial architecture

### Selected Starter: Minimal TanStack Start + Convex

**Rationale:** The SaaS starter is built around generic subscription SaaS patterns (Stripe billing, onboarding flows, generic dashboards) that don't map to an editorial platform. Removing Stripe, Conform, React Email, I18N, and restructuring the page layout would likely exceed the effort of adding Clerk + Tailwind + shadcn/ui to the minimal template. The minimal template provides the hardest integration (Convex + TanStack Start + React Query wiring) while leaving the editorial domain structure entirely in our hands.

**Initialization Command:**

```bash
bunx create-convex -- -t tanstack-start
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**
TypeScript with strict mode, targeting Node.js 20+ via Vite

**Build Tooling:**
Vite (instant startup, fast HMR) — TanStack Start's build layer

**Routing:**
TanStack Router with file-based routes and type-safe path/search params

**State Management:**
TanStack Query (`@tanstack/react-query`) + Convex reactive queries via `@convex-dev/react-query`

**Data Layer:**
Convex client with reactive subscriptions, server-side query preloading via TanStack Start loaders

### Manual Additions Required

| Addition | Package | Setup Effort |
|----------|---------|-------------|
| Authentication | Clerk + `@clerk/tanstack-start` + Convex Clerk integration | ~30 min |
| Styling | Tailwind CSS | ~5 min |
| UI Components | shadcn/ui (official TanStack Start support) | ~10 min |
| Animations | Motion (Framer Motion) | ~5 min |
| React Compiler | `babel-plugin-react-compiler` (Vite plugin config) | ~5 min |
| LLM Integration | Vercel AI SDK (`ai`) | ~5 min |
| PDF Extraction | `unpdf` | ~5 min |
| Fonts | Satoshi (Fontshare) + Newsreader (Google Fonts) + JetBrains Mono (Google Fonts) | ~10 min |

**Package Manager:** Bun for all operations — `bun install`, `bun dev`, `bun run build`, `bunx` for CLI tools.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. Identity gating pattern → Separate role-specific query functions
2. Editorial state machine → Transition map enforced in mutations
3. Auth enforcement → Custom Convex function wrappers per role
4. LLM pipeline orchestration → Chained Convex Actions with scheduling

**Important Decisions (Shape Architecture):**
5. Audit trail → Separate `auditLogs` table
6. Validation → Convex native validators on backend, Zod on frontend + AI SDK
7. Frontend organization → Feature-based folders
8. Route structure → Role-based route groups with mode-specific layouts
9. Error handling → Structured `ConvexError` with typed error codes
10. Schema organization → Single `schema.ts` file

**Deferred Decisions (Post-MVP):**
- Caching strategy (Convex handles query caching automatically)
- Rate limiting (journal scale doesn't require it)
- Monitoring/logging beyond Convex Dashboard
- CI/CD pipeline (manual deploy via `bunx convex deploy` for prototype)

### Data Architecture

**Database:** Convex document model (decided by stack choice)

**Schema Organization:** Single `convex/schema.ts` defining all tables. ~10 tables at prototype scale — single file provides full data model visibility without indirection.

**Data Modeling — Editorial State Machine:**
Submission status modeled as a string union field with a const transition map:
```
DRAFT → SUBMITTED → TRIAGING → TRIAGE_COMPLETE →
  → DESK_REJECTED (terminal)
  → UNDER_REVIEW → DECISION_PENDING →
    → ACCEPTED → PUBLISHED (terminal)
    → REJECTED (terminal)
    → REVISION_REQUESTED → SUBMITTED (loop)
```
Each status-changing mutation checks the transition map before allowing the change. Invalid transitions throw `ConvexError({ code: "INVALID_TRANSITION" })`.

**Semi-Confidential Identity Gating:**
Separate role-specific query functions per data type. Author-facing queries never fetch reviewer identity fields. Editor-facing queries return full data. Reviewer-facing queries show other reviewer names but respect confidentiality rules based on submission outcome. Each query function is independently auditable.

**Audit Trail:** Separate `auditLogs` table with fields: `submissionId`, `actorId`, `actorRole`, `action`, `details`, `timestamp`. Indexed by `submissionId` and by `actorId` for cross-submission queries.

**Security & Workflow Support Fields:**
- `reviewInvites` table includes `reviewAssignmentId`, `submissionId`, `tokenHash`, `expiresAt`, `consumedAt`, `revokedAt`, `createdBy`, `createdAt`.
- Auto-saved review documents include `revision` (monotonic number) and `updatedAt` for optimistic concurrency preconditions.
- `triageReports` records include `triageRunId`, `passName`, `idempotencyKey`, `attemptCount`, and `lastError` for retry-safe orchestration.

**Validation Strategy:** Convex native `v.*` validators for all backend function `args` AND `returns` definitions — every query, mutation, and action MUST define both. Zod schemas on the frontend for form validation and Vercel AI SDK `generateObject` structured output. TypeScript types serve as the implicit contract between layers.

**System Fields:** All Convex documents automatically include `_id` (typed as `Id<"tableName">`) and `_creationTime` (number, Unix ms). These must not be defined in the schema but are always available in query results and can be used for sorting and filtering.

### Authentication & Security

**Auth Provider:** Clerk with JWT → Convex integration via `@clerk/tanstack-start`

**RBAC Enforcement:** Custom higher-order function wrappers in `convex/helpers/auth.ts`:
- `withAuthor(handler)` — validates Author role
- `withReviewer(handler)` — validates Reviewer role + assignment to the submission
- `withActionEditor(handler)` — validates Action Editor role + assignment
- `withEditor(handler)` — validates Editor-in-Chief role
- `withAdmin(handler)` — validates Admin role
Each wrapper resolves Clerk JWT, looks up user in Convex, checks role, passes authenticated context to handler. Unauthorized calls throw `ConvexError({ code: "UNAUTHORIZED" })`.

**Reviewer Invitation Flow (Secure, One-Time):**
- URL-based invitation links are backed by server-validated records in `reviewInvites`.
- Token payload includes `jti`, `reviewAssignmentId`, `submissionId`, and `exp`, and is signed server-side.
- TTL is 24 hours. Acceptance checks signature, expiry, `consumedAt`, and `revokedAt` before granting access.
- One-time use is enforced by storing only `tokenHash` and atomically setting `consumedAt` on first successful accept.
- Editors/Admins can revoke pending invites by setting `revokedAt`.
- If reviewer has no account, inline Clerk sign-up completes first; role assignment executes only after token validation succeeds.

### API & Communication Patterns

**API Layer:** Convex functions (queries, mutations, actions) — no REST or GraphQL. Type-safe end-to-end via Convex codegen.

**Error Handling:** Structured `ConvexError` with typed error codes:
- `UNAUTHORIZED` — role check failed
- `INVALID_TRANSITION` — state machine violation
- `NOT_FOUND` — resource doesn't exist
- `VALIDATION_ERROR` — argument validation failed
- `VERSION_CONFLICT` — optimistic concurrency precondition failed during auto-save
- `INVITE_TOKEN_INVALID` — invitation token signature/shape is invalid
- `INVITE_TOKEN_EXPIRED` — invitation token expired
- `INVITE_TOKEN_USED` — invitation token already consumed
- `EXTERNAL_SERVICE_ERROR` — LLM API or embedding call failed
- `ENVIRONMENT_MISCONFIGURED` — deployment context/branch/project mapping is invalid
Frontend switches on error code for specific UI handling (toast type, redirect, retry).

**Real-Time Communication:** Convex reactive queries — automatic via `useQuery` / `useSuspenseQuery`. No WebSocket setup, no subscription management. Dashboard, triage progress, and discussions all update automatically when underlying data changes.

### Frontend Architecture

**Component Organization:** Feature-based folders:
```
app/features/
  submissions/    — submission form, status tracking, PDF upload
  triage/         — triage report display, progress indicator
  reviews/        — review form, structured sections, auto-save
  discussions/    — threaded comments, semi-confidential rendering
  editor/         — dashboard, pipeline view, assignment interface
  matching/       — reviewer match cards, selection interface
  publication/    — article pages, dual abstract display
  payments/       — payment calculator, breakdown display
  audit/          — audit timeline, action log
  auth/           — role wrappers, demo-only role switcher, invitation flow
```

**Route Structure:** Role-based route groups with mode-specific layouts:
```
app/routes/
  editor/         — dashboard, submission detail (editor layout with sidebar)
  review/         — review workspace (minimal chrome, split-view layout)
  submit/         — author submission flow (centered single-column layout)
  article/        — published article pages (reader mode, warm palette)
  __root.tsx      — shared header with cmd+K palette (+ demo-only role switcher)
```

**Role Switcher Policy (Demo Only):** `role-switcher` exists strictly for demo/local workflows. It must be hidden and disabled when `NODE_ENV=production`, and it never bypasses server-side RBAC wrappers in Convex functions.

**State Management:** TanStack Query + Convex reactive queries. No additional state library. Server state is the source of truth — Convex handles cache invalidation automatically. Local UI state (form drafts, panel sizes, filter selections) managed with React state/refs.

### Infrastructure & Deployment

**Hosting:** Vercel (serverless, edge CDN, preview deployments)

**Convex Deployment:** `bunx convex deploy --cmd 'bun run build'` integrated into Vercel build step with environment-specific deploy keys.

**Deployment Isolation Policy (Fail-Closed):**

| Vercel Context | Branch Rule | Convex Target | Deploy Key |
|----------------|-------------|---------------|------------|
| Production | `main` only | `convex-prod` | `CONVEX_DEPLOY_KEY_PROD` |
| Preview | non-`main` branches only | `convex-preview-*` | `CONVEX_DEPLOY_KEY_PREVIEW` |

- Build/deploy scripts validate context + branch + Convex target mapping before running deploy.
- Any mismatch aborts the build with `ENVIRONMENT_MISCONFIGURED` (no deploy attempt).
- `--preview-run 'seedData'` is allowed only in preview deployments.

**Environment Configuration:** Convex Dashboard for backend env vars (LLM API keys, embedding API keys). Vercel for frontend env vars (`CONVEX_URL`, `CLERK_PUBLISHABLE_KEY`) and deploy vars (`CONVEX_DEPLOY_KEY_PROD`, `CONVEX_DEPLOY_KEY_PREVIEW`).

**Preview Deployments:** Vercel preview deploys use isolated Convex preview backends via `--preview-run 'seedData'` for automatic seed data population and never share production deploy keys.

### React Compiler

**Integration:** `babel-plugin-react-compiler` configured in `app.config.ts` via Vite's babel plugin pipeline. Runs at build time — zero runtime overhead.

**Impact on Patterns:**
- Eliminates manual `useMemo`, `useCallback`, and `React.memo` — compiler handles memoization automatically
- Component re-render optimization is handled at the compiler level
- Convex reactive queries benefit from automatic memoization of derived computations in render

### LLM Pipeline Architecture

**Node.js Runtime Directive:** All Convex Action files that call external APIs (Vercel AI SDK, OpenAI, unpdf) MUST include `"use node";` as the first line of the file. This enables the Node.js runtime required by these libraries. Files containing only queries and mutations do NOT use this directive.

**Orchestration:** Chained Convex Actions with scheduling. Each triage pass is a separate Action:
1. `triageScope` — scope fit analysis against journal focus areas
2. `triageFormatting` — formatting and completeness validation
3. `triageCitations` — citation extraction and verification
4. `triageClaims` — technical claims analysis and evidence assessment

Each Action: runs LLM call via Vercel AI SDK `generateObject` → writes structured results to `triageReports` via internal mutation → schedules next Action. Every run gets a `triageRunId`, and each pass uses `idempotencyKey = submissionId + triageRunId + passName`; duplicate executions with the same key no-op. Passes are re-entrant, retries use bounded exponential backoff (max 3 attempts), and terminal failures mark the run as `"failed"` with `lastError`. Reactive queries on `triageReports` push progress to the editor dashboard automatically.

**External API Response Sanitization:** Actions MUST sanitize responses from external APIs (Claude, OpenAI) before writing results to the database. Never write raw API error messages or stack traces to client-visible tables — map failures to `EXTERNAL_SERVICE_ERROR` with a safe, generic message. Store raw error details only in server-side logs or internal-only fields (e.g., `lastError` on `triageReports`).

**Reviewer Matching:** Convex vector search. On reviewer profile creation, generate embedding via OpenAI text-embedding-3-large, store in reviewer document. On paper submission, generate paper embedding, run `ctx.vectorSearch()` against reviewer pool, return ranked matches with rationale generated by a follow-up LLM call.

### Decision Impact Analysis

**Implementation Sequence:**
1. Schema definition (single `schema.ts` with all tables, indexes, and validators)
2. Auth wrappers (Clerk integration + role-gated higher-order functions)
3. Editorial state machine (transition map + status-changing mutations)
4. File storage (PDF upload flow with Convex storage)
5. LLM triage pipeline (chained Actions with progress tracking)
6. Reviewer matching (embedding generation + vector search)
7. Review process (role-specific queries + threaded discussions)
8. Publication pipeline (article pages + dual abstract display)

**Cross-Component Dependencies:**
- Auth wrappers are required by every other component (build first)
- Schema must be defined before any mutations or queries
- State machine transitions gate the entire editorial workflow
- Triage pipeline depends on file storage (PDF text extraction)
- Reviewer matching depends on triage completion (paper embedding)
- Review process depends on reviewer matching (assignment)
- Publication depends on review completion (acceptance decision)

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Convex (Database & Backend):**
- Tables: camelCase plural — `submissions`, `triageReports`, `auditLogs`, `reviewerProfiles`
- Fields: camelCase — `submissionId`, `actorRole`, `createdAt`, `triageStatus`
- Indexes: `by_` prefix + fields — `by_submissionId`, `by_status`, `by_actorId_timestamp`
- Functions: domain prefix + camelCase verb — `submissions.create`, `reviews.getBySubmission`, `triage.runScope`
- Internal functions: prefixed with `internal.` — `internal.triage.writeResults`
- Convex files: domain-based kebab-case — `convex/submissions.ts`, `convex/triage.ts`

**Frontend (React & Routes):**
- Component files: kebab-case — `triage-report-card.tsx`, `progress-ring.tsx`
- Component names: PascalCase — `TriageReportCard`, `ProgressRing`
- Hook files: kebab-case with `use-` prefix — `use-submission-status.ts`
- Hook names: camelCase with `use` prefix — `useSubmissionStatus`
- Route files: kebab-case matching URL segments — `editor/dashboard.tsx`, `review/$id.tsx`
- Feature folders: kebab-case plural — `features/submissions/`, `features/reviews/`
- Barrel exports: `index.ts` per feature folder

**Shared:**
- TypeScript types/interfaces: PascalCase — `Submission`, `TriageReport`, `ReviewSection`
- Constants: UPPER_SNAKE_CASE — `VALID_TRANSITIONS`, `TRIAGE_PASSES`, `ROLE_PERMISSIONS`
- Enum-like unions: UPPER_SNAKE_CASE values — `"SUBMITTED" | "TRIAGING" | "UNDER_REVIEW"`

### Structure Patterns

**Convex Directory:**
```
convex/
  schema.ts              — single file, all tables + indexes + validators
  helpers/
    auth.ts              — role-gated wrappers (withEditor, withReviewer, etc.)
    errors.ts            — ConvexError codes and helpers
    transitions.ts       — state machine transition map
  submissions.ts         — queries + mutations for submissions
  reviews.ts             — queries + mutations for reviews
  triage.ts              — "use node"; Actions + internalMutations for results
  matching.ts            — "use node"; Actions + internalMutations for embeddings
  discussions.ts         — threaded discussion queries + mutations
  users.ts               — user management, role assignment
  audit.ts               — internalMutation for logging + queries for reading
  payments.ts            — payment calculation queries
  notifications.ts       — notification mutations
  storage.ts             — generateUploadUrl mutation + serving URL helpers
  seed.ts                — "use node"; seed data Action (preview deploy hook)
  crons.ts               — cron job definitions (targets internal functions only)
  __tests__/             — co-located Convex function tests
```

**Frontend Directory:**
```
app/
  features/
    submissions/
      submission-form.tsx
      submission-status.tsx
      pdf-upload.tsx
      index.ts
    triage/
      triage-report-card.tsx
      triage-progress-indicator.tsx
      index.ts
    reviews/
      review-section-form.tsx
      progress-ring.tsx
      review-workspace.tsx
      index.ts
    ... (per feature)
  components/
    ui/                  — shadcn/ui components (managed by CLI)
    confidentiality-badge.tsx
    status-chip.tsx
    ... (shared custom components)
  lib/
    utils.ts             — shared utilities (cn(), formatDate(), etc.)
    constants.ts         — app-wide constants
  styles/
    globals.css          — Tailwind imports, CSS variables, font imports
```

**Test Co-location:**
- Frontend: `submission-form.test.tsx` next to `submission-form.tsx`
- Convex: `convex/__tests__/submissions.test.ts`

### Format Patterns

**Convex Function Signatures:**
- Every query, mutation, and action MUST define both `args` and `returns` validators
- Queries return data directly (no wrapper) — Convex handles errors via exceptions
- Mutations return the created/updated document ID or void
- Actions return structured results or void (write results via internal mutations)

**Internal Function Pattern:**
- Mutations called from Actions (triage result writes, embedding storage, audit logging from scheduled functions) MUST use `internalMutation` / `internalAction`
- Cron job targets MUST use `internalMutation` or `internalAction` — never public functions
- Internal functions are imported via `internal` from `convex/_generated/api`
- Internal functions are NOT accessible from the client — only from other Convex functions via `ctx.runMutation(internal.*)` or `ctx.scheduler.runAfter()`

**Error Format:**
```typescript
throw new ConvexError({ code: "UNAUTHORIZED", message: "Editor role required" })
throw new ConvexError({ code: "INVALID_TRANSITION", message: "Cannot move from SUBMITTED to PUBLISHED" })
```

**Date Handling:**
- Storage: `Date.now()` (Unix ms timestamp) in Convex — stored as `v.number()`
- Display: Relative for recent ("2 hours ago"), absolute for older ("Feb 7, 2026")
- No timezone conversion — all timestamps UTC

### Process Patterns

**Loading States:**
- Route-level: React Suspense with skeleton component as fallback
- Convex queries: `useSuspenseQuery` for SSR-compatible loading
- Feature sections: Error Boundaries per feature section — one broken section doesn't crash the whole page
- Skeleton components match the layout of the loaded content (no layout shift)

**Error Handling:**
- Convex errors: Caught by Error Boundaries, displayed as inline error messages or toasts based on error code
- Network errors: Convex client handles reconnection automatically; UI shows "Reconnecting..." indicator
- Form validation errors: Inline below fields via Zod, shown on blur
- LLM API errors: Caught in Actions, written to `triageReports` with `"failed"` status, displayed in triage UI

**Pagination Pattern:**
- Editor dashboard submission list and audit log views MUST use cursor-based pagination via `paginationOptsValidator` and `usePaginatedQuery`
- Paginated queries use `.paginate(paginationOpts)` on the server and return `{ page, isDone, continueCursor }`
- Client uses `usePaginatedQuery` with `{ initialNumItems: 25 }` and `loadMore(25)` for infinite scroll
- Status values: `"CanLoadMore"`, `"LoadingMore"`, `"Exhausted"`

**Conditional Query Pattern:**
- For role-based views that conditionally fetch data, pass `"skip"` as the query argument instead of conditionally calling the hook
- NEVER conditionally call `useSuspenseQuery` — this violates React's rules of hooks
- Example: `useSuspenseQuery(api.reviews.getMyAssignments, userRole === "reviewer" ? { reviewerId } : "skip")`

**File Upload Pattern (PDF Submissions):**
1. Client validates file type (`application/pdf`) and size before upload
2. Client calls `generateUploadUrl` mutation to get a short-lived upload URL
3. Client POSTs the file to the upload URL with `Content-Type: application/pdf` header
4. Server returns a `storageId` (type `Id<"_storage">`)
5. Client calls a second mutation to save the `storageId` reference in the `submissions` table along with `fileName`, `fileSize`, and `fileType` metadata
- Serving: queries generate URLs via `ctx.storage.getUrl(storageId)` after access checks — never expose raw storage URLs to unauthorized users
- Deletion: when a submission is deleted, both the `_storage` file AND the database record must be removed to prevent orphaned files

**Auto-Save Pattern:**
- Debounce: 500ms after last keystroke
- Implementation: `useMutation` with debounced callback, enhanced with `.withOptimisticUpdate()` for instant UI feedback on save status
- Status indicator: "Saved" / "Saving..." / "Offline" — persistent in UI
- Conflict resolution: versioned writes (`revision`/`updatedAt` precondition). On mismatch, mutation returns `VERSION_CONFLICT`, keeps local draft intact, and shows merge/reload options (never silent overwrite).

**Import Order Convention:**
1. React/framework imports
2. Third-party libraries
3. Convex generated API (`convex/_generated/api`)
4. Feature imports (from other features)
5. Local imports (same feature)
6. Type-only imports last

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow the naming conventions exactly — no exceptions for "convenience"
- Define both `args` and `returns` validators on every Convex query, mutation, and action — no exceptions
- Use the role-gated auth wrappers for every Convex function that accesses user data
- Check the transition map before any status change — never set status directly
- Use `ConvexError` with typed codes — never throw plain `Error` in Convex functions
- Use `.withIndex()` for all database queries on indexed fields — never use `.filter()` when an index exists
- Use `internalMutation` / `internalAction` for all functions called from Actions, scheduled functions, or cron jobs — never expose these as public functions
- Add `"use node";` as the first line of any Convex Action file that imports Node.js APIs (Vercel AI SDK, unpdf, OpenAI client)
- Use `"skip"` for conditional query arguments — never conditionally call `useSuspenseQuery` hooks
- Use Suspense + Error Boundaries — never manual `isLoading` checks for Convex queries
- Use `usePaginatedQuery` for list views that may grow (submission list, audit log) — never fetch unbounded collections
- Place new components in the correct feature folder — never in a generic `components/` unless truly shared
- Co-locate tests with source files
- Keep `role-switcher` demo/local only — never render or enable impersonation controls in production
- Use the established CSS variable tokens — never raw HSL values for colors
- Sanitize external API responses in Actions before writing to client-visible tables — never expose raw API errors

### Anti-Patterns to Avoid

**Convex Backend:**
- Using `.filter()` instead of `.withIndex()` — this is the #1 Convex performance anti-pattern; always use `.withIndex()` for indexed fields
- Omitting `returns` validators on Convex functions — every query, mutation, and action needs both `args` and `returns`
- Using `v.any()` for argument or return validators — use precise types for safety; `v.any()` bypasses runtime validation
- Using public functions as cron job targets or Action callbacks — use `internalMutation` / `internalAction` for all server-to-server calls
- Forgetting `"use node";` in Action files that use Node.js APIs — causes runtime errors
- Calling external APIs from queries or mutations — only Actions can make external calls
- Using Actions for database-only operations — use queries (reads) or mutations (writes) instead
- Writing raw external API error messages to client-visible tables — sanitize and map to typed error codes
- Deleting submission records without also deleting the associated `_storage` file — causes orphaned files
- Mixing role-gated and ungated queries in the same file — keep auth boundary clear
- Using `ctx.db.patch` without checking the transition map for status fields
- Storing derived data (payment totals, review completion %) — compute in queries
- Creating REST-style Convex HTTP actions when a query/mutation suffices

**Frontend:**
- Using `useQuery` instead of `useSuspenseQuery` — breaks SSR hydration
- Conditionally calling `useSuspenseQuery` instead of passing `"skip"` — violates React hooks rules
- Fetching unbounded collections without pagination — use `usePaginatedQuery` for list views
- Using manual `useMemo`/`useCallback`/`React.memo` — React Compiler handles memoization automatically
- Creating a `utils/` or `helpers/` folder at the feature level — use `lib/` for shared, inline for feature-specific

**General:**
- Shipping `role-switcher` in production or relying on it for authorization
- Using `npm` or `npx` — use `bun` and `bunx` exclusively

## Project Structure & Boundaries

### Complete Project Directory Structure

```
alignment-journal/
├── README.md
├── package.json
├── bun.lock
├── tsconfig.json
├── app.config.ts                          # TanStack Start config (+ React Compiler plugin)
├── tailwind.config.ts                     # Tailwind + shadcn/ui theme tokens
├── components.json                        # shadcn/ui CLI config
├── .env.local                             # Local: CONVEX_URL, CLERK_PUBLISHABLE_KEY
├── .env.example                           # Template for required env vars
├── .gitignore
│
├── convex/                                # ── BACKEND (Convex Functions + Schema) ──
│   ├── _generated/                        # Auto-generated by Convex CLI (do not edit)
│   │   ├── api.d.ts
│   │   ├── api.js
│   │   ├── dataModel.d.ts
│   │   └── server.d.ts
│   ├── schema.ts                          # Single file: all tables, indexes, validators
│   ├── helpers/
│   │   ├── auth.ts                        # withAuthor, withReviewer, withEditor, etc.
│   │   ├── errors.ts                      # ConvexError codes + helper factories
│   │   └── transitions.ts                 # VALID_TRANSITIONS map + assertTransition()
│   ├── submissions.ts                     # Queries + mutations: create, update status, list
│   ├── reviews.ts                         # Role-gated queries + mutations: submit, update
│   ├── triage.ts                          # "use node"; Actions + internalMutations for results
│   ├── matching.ts                        # "use node"; Actions + internalMutations for embeddings
│   ├── discussions.ts                     # Queries + mutations: threads, messages
│   ├── users.ts                           # User management, role assignment, profiles
│   ├── audit.ts                           # internalMutation for logging + queries for reading
│   ├── payments.ts                        # Payment calculation queries
│   ├── notifications.ts                   # Notification record mutations
│   ├── storage.ts                         # generateUploadUrl mutation + serving URL helpers
│   ├── seed.ts                            # "use node"; seed data Action (preview deploy hook)
│   ├── crons.ts                           # Cron job definitions (targets internal functions only)
│   └── __tests__/
│       ├── submissions.test.ts
│       ├── reviews.test.ts
│       ├── triage.test.ts
│       ├── matching.test.ts
│       └── transitions.test.ts
│
├── app/                                   # ── FRONTEND (TanStack Start) ──
│   ├── client.tsx                         # Client entry point
│   ├── router.tsx                         # TanStack Router config + Convex/Clerk providers
│   ├── ssr.tsx                            # SSR entry point
│   ├── routeTree.gen.ts                   # Auto-generated route tree (do not edit)
│   │
│   ├── routes/                            # ── FILE-BASED ROUTES (role-based groups) ──
│   │   ├── __root.tsx                     # Root layout: header, cmd+K palette, demo-only role switcher
│   │   ├── index.tsx                      # Landing → role-based redirect
│   │   │
│   │   ├── editor/                        # Editor-in-Chief + Action Editor routes
│   │   │   ├── route.tsx                  # Editor layout: sidebar nav, pipeline chrome
│   │   │   ├── dashboard.tsx              # Pipeline view, submission list, status filters
│   │   │   └── submissions.$id.tsx        # Submission detail: triage, matching, audit, reviews
│   │   │
│   │   ├── review/                        # Reviewer routes
│   │   │   ├── route.tsx                  # Reviewer layout: minimal chrome, split-view
│   │   │   └── $id.tsx                    # Review workspace: PDF + review form + discussion
│   │   │
│   │   ├── submit/                        # Author routes
│   │   │   ├── route.tsx                  # Author layout: centered single-column
│   │   │   ├── index.tsx                  # New submission form (metadata + PDF upload)
│   │   │   └── $id.tsx                    # Submission status tracking + review interaction
│   │   │
│   │   ├── article/                       # Public routes (no auth required)
│   │   │   └── $id.tsx                    # Published article: dual abstracts, metadata, PDF download
│   │   │
│   │   └── admin/                         # Admin routes
│   │       ├── route.tsx                  # Admin layout
│   │       └── index.tsx                  # User management, role assignment, reviewer pool
│   │
│   ├── features/                          # ── FEATURE MODULES ──
│   │   ├── submissions/
│   │   │   ├── submission-form.tsx         # Metadata fields + validation
│   │   │   ├── submission-form.test.tsx
│   │   │   ├── submission-status.tsx       # Status badge + timeline
│   │   │   ├── pdf-upload.tsx             # Convex file storage upload widget
│   │   │   ├── submission-list.tsx         # Filterable list for editor dashboard
│   │   │   └── index.ts                   # Barrel export
│   │   │
│   │   ├── triage/
│   │   │   ├── triage-report-card.tsx     # Collapsed triage summary per dimension
│   │   │   ├── triage-report-detail.tsx   # Expanded triage findings
│   │   │   ├── triage-progress-indicator.tsx  # Real-time pipeline progress
│   │   │   └── index.ts
│   │   │
│   │   ├── reviews/
│   │   │   ├── review-section-form.tsx    # Structured review: summary, strengths, weaknesses, questions, recommendation
│   │   │   ├── review-section-form.test.tsx
│   │   │   ├── review-workspace.tsx       # Split-view: PDF left, form right
│   │   │   ├── progress-ring.tsx          # Section completion indicator
│   │   │   ├── reviewer-abstract-form.tsx # 150-500 word abstract drafting
│   │   │   └── index.ts
│   │   │
│   │   ├── discussions/
│   │   │   ├── threaded-discussion.tsx    # Thread container with semi-confidential rendering
│   │   │   ├── discussion-message.tsx     # Single message with author/anonymous attribution
│   │   │   └── index.ts
│   │   │
│   │   ├── editor/
│   │   │   ├── pipeline-view.tsx          # Status columns with submission cards
│   │   │   ├── submission-detail-panel.tsx # Editor's full view of a submission
│   │   │   ├── assignment-interface.tsx   # Action editor + reviewer assignment
│   │   │   └── index.ts
│   │   │
│   │   ├── matching/
│   │   │   ├── reviewer-match-card.tsx    # Match score + rationale + accept/reject
│   │   │   ├── match-list.tsx            # Ranked suggestions for a submission
│   │   │   └── index.ts
│   │   │
│   │   ├── publication/
│   │   │   ├── article-page.tsx           # Web-first reading layout
│   │   │   ├── dual-abstract-display.tsx  # Author + reviewer abstracts side-by-side
│   │   │   ├── article-metadata.tsx       # Authors, date, DOI, CC-BY, download
│   │   │   └── index.ts
│   │   │
│   │   ├── payments/
│   │   │   ├── payment-calculator.tsx     # Formula breakdown display
│   │   │   ├── payment-summary.tsx        # Per-reviewer summary table
│   │   │   └── index.ts
│   │   │
│   │   ├── audit/
│   │   │   ├── audit-timeline.tsx         # Chronological action log
│   │   │   ├── audit-entry.tsx            # Single audit event
│   │   │   └── index.ts
│   │   │
│   │   ├── auth/
│   │   │   ├── role-guard.tsx             # Client-side role check wrapper (defense-in-depth)
│   │   │   ├── role-switcher.tsx          # Demo/local mode role switching UI (never enabled in production)
│   │   │   ├── invitation-handler.tsx     # URL token → Clerk sign-up → review redirect
│   │   │   └── index.ts
│   │   │
│   │   └── notifications/
│   │       ├── notification-preview.tsx   # Email simulation display
│   │       └── index.ts
│   │
│   ├── components/                        # ── SHARED COMPONENTS ──
│   │   ├── ui/                            # shadcn/ui (managed by CLI — don't edit directly)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── command.tsx               # cmdk for cmd+K palette
│   │   │   └── ...                       # Added as needed via bunx shadcn@latest add
│   │   ├── confidentiality-badge.tsx      # "Confidential" / "Identity Revealed" indicator
│   │   ├── status-chip.tsx                # Color-coded submission status
│   │   ├── command-palette.tsx            # cmd+K global search and navigation
│   │   ├── error-boundary.tsx             # Feature-level error boundary wrapper
│   │   └── page-skeleton.tsx              # Route-level skeleton fallback
│   │
│   ├── hooks/
│   │   ├── use-auto-save.ts              # Debounced mutation with status indicator
│   │   └── use-role.ts                   # Current user role from Clerk/Convex
│   │
│   ├── lib/
│   │   ├── utils.ts                      # cn(), formatDate(), formatCurrency()
│   │   ├── constants.ts                  # TRIAGE_PASSES, ROLE_PERMISSIONS, STATUS_LABELS
│   │   ├── convex.ts                     # ConvexProvider + ConvexQueryClient setup
│   │   └── clerk.ts                      # ClerkProvider config
│   │
│   └── styles/
│       └── globals.css                   # Tailwind directives, CSS variables, @font-face
│
├── e2e/
│   ├── rbac-access.spec.ts               # Route and action access by role
│   ├── reviewer-identity-gating.spec.ts  # Identity visibility matrix by role/outcome
│   ├── invite-token-flow.spec.ts         # Valid, expired, replayed invite token cases
│   └── submission-transitions.spec.ts    # Invalid status transitions are rejected
└── public/
    └── fonts/
        ├── satoshi/                      # Satoshi variable font files
        └── jetbrains-mono/              # JetBrains Mono variable font files
```

### Architectural Boundaries

**API Boundaries:**
- **Client → Convex:** All data access through Convex query/mutation/action functions via type-safe `api` import. No REST endpoints, no direct database access from client.
- **Convex → External Services:** LLM calls (Claude Sonnet 4.5) and embedding calls (OpenAI) happen exclusively in Convex Actions. Actions write results back via internal mutations — never return large payloads to client.
- **Auth Boundary:** Clerk JWT validated in every Convex function via `convex/helpers/auth.ts` wrappers. No unauthenticated Convex functions except published article queries. Role checked before any data access. Demo role switching is client-only UX and cannot elevate permissions server-side.
- **File Storage Boundary:** PDFs uploaded via Convex file storage API. Serving URLs generated server-side in queries after access check — no direct storage URLs exposed to unauthorized users.

**Component Boundaries:**
- **Feature modules are self-contained:** Each `app/features/*` folder owns its UI components, tests, and barrel export. Features import from other features only through barrel exports.
- **Shared components are generic:** `app/components/` contains only components used by 2+ features. Feature-specific components stay in their feature folder.
- **Route files are thin:** Route files in `app/routes/` compose feature components and handle data loading via TanStack Start loaders — minimal logic.
- **shadcn/ui is a managed dependency:** `app/components/ui/` is owned by the shadcn CLI (`bunx shadcn@latest`). Customization happens via CSS variables in `globals.css`, not by editing component files.

**Data Boundaries:**
- **Single schema, domain-split functions:** `convex/schema.ts` defines all tables. Each `convex/*.ts` file owns queries/mutations for its domain tables. Cross-domain reads are allowed in queries; cross-domain writes require calling the owning domain's mutation.
- **Role-gated data access:** Author-facing queries in `convex/submissions.ts` and `convex/reviews.ts` never return reviewer identity fields. Editor-facing queries return full data. Separate function names per role — no conditional field stripping.
- **Audit trail is append-only:** `convex/audit.ts` exposes only `logAction` mutation and read queries. No update or delete mutations on audit logs.
- **Triage results are immutable and idempotent:** Once a triage pass writes results for an `idempotencyKey`, they are not modified. Re-triage creates a new `triageRunId` with new records.

### Requirements to Structure Mapping

**FR Category → Directory Mapping:**

| FR Category | FRs | Convex Files | Feature Folder | Routes |
|-------------|-----|-------------|----------------|--------|
| Authentication & Identity | FR1-4 | `users.ts`, `helpers/auth.ts` | `auth/` | `__root.tsx` |
| Submission Management | FR5-8 | `submissions.ts`, `storage.ts` | `submissions/` | `submit/` |
| LLM Triage Pipeline | FR9-15 | `triage.ts` | `triage/` | `editor/submissions.$id.tsx` |
| Reviewer Matching | FR16-19 | `matching.ts`, `users.ts` | `matching/` | `editor/submissions.$id.tsx` |
| Editor Dashboard & Workflow | FR20-27 | `submissions.ts`, `audit.ts`, `payments.ts` | `editor/`, `audit/`, `payments/` | `editor/` |
| Review Process | FR28-35 | `reviews.ts`, `discussions.ts` | `reviews/`, `discussions/` | `review/` |
| Reviewer Abstract | FR36-38 | `reviews.ts` | `reviews/` | `review/$id.tsx` |
| Publication | FR39-43 | `submissions.ts` | `publication/` | `article/$id.tsx` |
| Payment Tracking | FR44-46 | `payments.ts` | `payments/` | `editor/submissions.$id.tsx` |
| Seed Data | FR47-51 | `seed.ts` | — | — |
| Notifications | FR52-53 | `notifications.ts` | `notifications/` | (inline in editor routes) |

**Cross-Cutting Concerns → Location:**

| Concern | Primary Location | Referenced By |
|---------|-----------------|---------------|
| RBAC enforcement | `convex/helpers/auth.ts` | Every Convex function file |
| State machine transitions | `convex/helpers/transitions.ts` | `submissions.ts`, `reviews.ts` |
| Error codes | `convex/helpers/errors.ts` | All Convex functions, `error-boundary.tsx` |
| Return validators | Every Convex function (`args` + `returns`) | All Convex function files |
| Internal function boundary | `internalMutation` / `internalAction` | `triage.ts`, `matching.ts`, `audit.ts`, `crons.ts` |
| Node.js runtime directive | `"use node";` at top of Action files | `triage.ts`, `matching.ts`, `seed.ts` |
| Auto-save + optimistic updates | `app/hooks/use-auto-save.ts` | `review-section-form.tsx`, `reviewer-abstract-form.tsx` |
| Pagination | `usePaginatedQuery` + `paginationOptsValidator` | `submission-list.tsx`, `audit-timeline.tsx` |
| Conditional queries | `"skip"` pattern for role-based data | All role-dependent feature components |
| Loading states | `app/components/page-skeleton.tsx`, `error-boundary.tsx` | All route files |
| Confidentiality rendering | `app/components/confidentiality-badge.tsx` | `discussions/`, `reviews/`, `audit/` |
| File upload flow | `convex/storage.ts` (3-step: URL → POST → save) | `pdf-upload.tsx` |

### Integration Points

**Internal Communication:**
- **Routes → Features:** Route files import feature components via barrel exports and pass Convex query data as props
- **Features → Convex:** Feature components call `useSuspenseQuery` / `useMutation` with typed `api.*` references
- **Features → Features:** Explicit imports through barrel exports only (e.g., `editor/` imports from `triage/`, `matching/`, `audit/`, `payments/`)
- **Convex Functions → Convex Functions:** Internal mutations called from Actions via `ctx.runMutation(internal.*)`. Scheduled functions via `ctx.scheduler.runAfter()`

**External Integrations:**

| Service | Integration Point | Credential Location |
|---------|------------------|-------------------|
| Clerk (Auth) | `app/lib/clerk.ts` + `convex/helpers/auth.ts` | Convex Dashboard + Vercel env vars |
| Claude Sonnet 4.5 (LLM) | `convex/triage.ts` Actions via Vercel AI SDK | Convex Dashboard env var |
| OpenAI Embeddings | `convex/matching.ts` Actions | Convex Dashboard env var |
| unpdf (PDF parsing) | `convex/triage.ts` (in-Action, no API key) | N/A (library) |
| Convex File Storage | `convex/storage.ts` | Built-in (no separate credential) |
| Vercel (Hosting) | `app.config.ts` build output | `CONVEX_DEPLOY_KEY_PROD` + `CONVEX_DEPLOY_KEY_PREVIEW` in Vercel |

**Data Flow — Submission Lifecycle:**
```
Author uploads PDF → convex/storage.ts (file storage)
  → convex/submissions.ts create mutation (DRAFT → SUBMITTED)
  → convex/triage.ts runScope Action (scheduled)
    → writes results via internal mutation → schedules runFormatting
    → runFormatting → runCitations → runClaims (chained)
  → Reactive queries push progress to editor dashboard
  → Editor triggers convex/matching.ts findMatches Action
    → Vector search + LLM rationale → writes match results
  → Editor invites reviewers → convex/reviews.ts create assignments
  → Reviewer submits review → convex/reviews.ts submit mutation
  → Discussion via convex/discussions.ts
  → Editor decision → convex/submissions.ts transition (ACCEPTED/REJECTED)
  → If accepted: reviewer abstract → publication
```

### File Organization Patterns

**Configuration Files:**
- Root level: `package.json`, `bun.lock`, `tsconfig.json`, `app.config.ts`, `tailwind.config.ts`, `components.json`
- Environment: `.env.local` (local dev, gitignored), `.env.example` (template, committed)
- Convex backend env vars: managed in Convex Dashboard (not in `.env` files)

**Source Organization:**
- `convex/` — backend functions, schema, helpers. Flat structure with domain-based files + `helpers/` subfolder
- `app/routes/` — thin route files composing features. Grouped by role
- `app/features/` — self-contained UI modules with co-located tests
- `app/components/` — shared UI (shadcn/ui via `bunx shadcn@latest` + custom shared components)
- `app/hooks/` — shared React hooks (max 2-3 files; feature-specific hooks stay in features)
- `app/lib/` — provider setup, utilities, constants

**Test Organization:**
- Frontend: co-located `*.test.tsx` files next to source in feature folders
- Convex: `convex/__tests__/*.test.ts` (Convex test framework requires `__tests__` directory)
- E2E smoke tests: `e2e/*.spec.ts` covering RBAC, confidentiality gating, invite token lifecycle, and transition guards
- Expanded E2E coverage is deferred until after prototype scope

**Asset Organization:**
- `public/fonts/` — self-hosted font files (Satoshi, JetBrains Mono; Newsreader via Google Fonts CDN)
- Static assets served by Vite/Vercel from `public/`
- PDF files stored in Convex file storage (not in `public/`)

### Development Workflow Integration

**Development Server:**
- `bun dev` starts both Vite (frontend) and Convex dev server (backend) concurrently
- Convex dev server pushes schema/function changes to cloud dev backend automatically
- Hot Module Replacement via Vite for instant frontend updates
- React Compiler runs at build time via babel plugin — zero runtime overhead, automatic memoization
- TanStack Router generates `routeTree.gen.ts` on file changes in `app/routes/`

**Build Process:**
- `bun run build` → Vite + React Compiler transforms, Convex CLI validates and bundles backend functions
- `bunx convex deploy --cmd 'bun run build'` — single command deploys both layers
- TypeScript strict mode enforced at build time — zero type errors required

**Deployment:**
- Vercel production deploys from `main` only, using `CONVEX_DEPLOY_KEY_PROD`
- Vercel preview deploys from non-`main` branches only, using `CONVEX_DEPLOY_KEY_PREVIEW`
- Build script validates branch/context/project mapping and fails closed on mismatch
- Preview deployments use isolated Convex preview backends with `--preview-run 'seedData'`

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** PASS
- TanStack Start (RC) + Convex + Clerk + Vercel — established integration path, all packages compatible
- Bun as package manager — compatible with Convex CLI, Vite, Vercel builds
- React Compiler (`babel-plugin-react-compiler`) + Vite pipeline — supported via babel plugin config in `app.config.ts`
- shadcn/ui + Tailwind CSS — standard pairing with official TanStack Start support
- Vercel AI SDK `generateObject` in Convex Actions — runs in Node.js runtime within Actions, compatible
- Motion (Framer Motion) + React Compiler — compatible; Motion uses refs and internal state that the compiler respects
- No version conflicts detected between chosen packages

**Pattern Consistency:** PASS
- Naming conventions consistent across all areas (camelCase backend, kebab-case files, PascalCase components)
- Error handling pattern (ConvexError + typed codes) consistently applied across all Convex function files
- Loading pattern (Suspense + Error Boundaries) consistently mandated
- Minor fixes applied: `src/` → `app/` path references, `triage-pipeline.ts` → `triage.ts`, `npx` → `bunx`

**Structure Alignment:** PASS
- Feature-based frontend folders map 1:1 to FR categories
- Role-based route groups map to the 4 user personas (Editor, Reviewer, Author, Reader)
- Domain-based Convex files cover all 11 capability areas
- Integration boundaries clearly defined at API, component, and data layers

### Requirements Coverage Validation

**Functional Requirements Coverage:** 53/53 COVERED

| FR Range | Category | Architectural Support | Status |
|----------|----------|----------------------|--------|
| FR1-4 | Auth & Identity | Clerk + `convex/users.ts` + `convex/helpers/auth.ts` + `app/features/auth/` | COVERED |
| FR5-8 | Submission Mgmt | `convex/submissions.ts` + `convex/storage.ts` + `app/features/submissions/` + `app/routes/submit/` | COVERED |
| FR9-15 | LLM Triage | `convex/triage.ts` (4 chained Actions) + `app/features/triage/` + reactive progress queries | COVERED |
| FR16-19 | Reviewer Matching | `convex/matching.ts` (vector search + LLM rationale) + `app/features/matching/` | COVERED |
| FR20-27 | Editor Dashboard | `app/routes/editor/` + `app/features/editor/` + audit, payments, matching features | COVERED |
| FR28-35 | Review Process | `convex/reviews.ts` (role-gated) + `convex/discussions.ts` + semi-confidential identity gating | COVERED |
| FR36-38 | Reviewer Abstract | `reviewer-abstract-form.tsx` in reviews feature + `convex/reviews.ts` abstract mutations | COVERED |
| FR39-43 | Publication | `app/features/publication/` + `app/routes/article/$id.tsx` (public, no auth) | COVERED |
| FR44-46 | Payment Tracking | `convex/payments.ts` (calculation queries) + `app/features/payments/` | COVERED |
| FR47-51 | Seed Data | `convex/seed.ts` (Action, preview deploy hook) | COVERED |
| FR52-53 | Notifications | `convex/notifications.ts` + `app/features/notifications/` | COVERED |

**Non-Functional Requirements Coverage:**

| NFR | Architectural Support | Status |
|-----|----------------------|--------|
| Page loads < 2s | SSR via TanStack Start loaders + Convex query preloading + Vite build | COVERED |
| Triage < 5min | Convex Actions (10min timeout), 4 passes chained via scheduling | COVERED |
| Matching < 30s | Convex vector search + single LLM call for rationale | COVERED |
| Real-time < 1s | Convex reactive queries — automatic push, no polling | COVERED |
| HTTPS | Vercel + Convex both enforce HTTPS by default | COVERED |
| JWT on every request | `convex/helpers/auth.ts` wrappers mandated on all data-accessing functions | COVERED |
| Role enforcement at data layer | Separate role-gated query functions, no client-side-only checks | COVERED |
| Reviewer identity isolation | Author-facing queries never return identity fields; server-side enforcement | COVERED |
| API keys server-side | Convex Dashboard env vars, accessed only in Actions | COVERED |
| Invite token abuse prevention | Signed invite tokens (`jti`, `exp`) + one-time consume + revocation via `reviewInvites` | COVERED |
| Deployment environment isolation | Branch/context mapping + separate prod/preview deploy keys + fail-closed checks | COVERED |
| Auto-save conflict safety | Version preconditions + `VERSION_CONFLICT` handling with merge/reload UI | COVERED |
| WCAG 2.1 AAA | Accessible components + contrast tokens meeting 7:1 normal text and 4.5:1 large text + prefers-reduced-motion + prefers-contrast + forced-colors | COVERED |
| Keyboard navigation | shadcn/ui components + cmd+K palette (cmdk) | COVERED |
| Strict TypeScript | Enforced at build time, Convex codegen provides type safety | COVERED |
| Kebab-case files | Defined in naming conventions, enforced via guidelines | COVERED |

### Implementation Readiness Validation

**Decision Completeness:** PASS — critical/important decisions documented with rationale, including invitation token security, deployment isolation, conflict-safe auto-save, and triage idempotency semantics.

**Structure Completeness:** PASS — complete directory tree with backend/frontend/test boundaries, baseline E2E smoke suite, FR → directory mapping across all 11 categories, and explicit integration points.

**Pattern Completeness:** PASS — naming conventions cover all entity types, format patterns cover returns/errors/dates, process patterns cover loading/errors/auto-save/imports/retries, and enforcement guidelines include production impersonation restrictions.

### Gap Analysis Results

**Previously Identified Critical Risks:** Mitigated by explicit controls in this revision:
- Invitation token replay/expiry/revocation controls
- Branch-to-environment deploy isolation with fail-closed checks
- Demo-only role switcher policy with production disable requirement
- Conflict-safe auto-save semantics (no silent overwrite)
- Idempotent/retry-safe triage orchestration
- Baseline E2E smoke coverage for critical security/workflow paths

**Important Gaps:** None blocking.

**Nice-to-Have Gaps (deferred, not blocking):**
- OpenGraph meta tags for published articles not explicitly specified (implied by article route + PRD SEO section)
- Accessibility automation in CI (axe + keyboard-only smoke) is not yet wired into every PR pipeline
- Convex Agents component noted in context analysis but deliberately not used — chained Actions chosen for simplicity

**Convex Best Practices Audit (Completed):**
All gaps identified during skills-based architecture review have been resolved:
- Return validators mandated on all functions (convex-best-practices, convex-functions)
- `"use node"` directive specified for Action files (convex-functions)
- `withIndex` enforcement and `.filter()` anti-pattern documented (convex-best-practices)
- Internal function boundary clarified for Actions, crons, and scheduled functions (convex-functions, convex-security-check)
- Pagination pattern added for list views (convex-realtime)
- Conditional query `"skip"` pattern added (convex-realtime)
- Optimistic updates added to auto-save pattern (convex-realtime)
- File upload 3-step flow documented (convex-file-storage)
- External API response sanitization specified (convex-security-audit)
- `crons.ts` added to project structure (convex-cron-jobs)

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed (53 FRs, NFRs, constraints, cross-cutting concerns)
- [x] Scale and complexity assessed (medium-high, 15-20 modules)
- [x] Technical constraints identified (7-day build, solo dev, desktop-first)
- [x] Cross-cutting concerns mapped (8 concerns with locations)

**Architectural Decisions**
- [x] Critical decisions documented with rationale (decision set is implementation-complete for prototype scope)
- [x] Technology stack fully specified (TanStack Start + Convex + Clerk + Bun + React Compiler)
- [x] Integration patterns defined (Convex functions, Vercel AI SDK, Clerk JWT)
- [x] Performance considerations addressed (SSR, reactive queries, Action timeouts)
- [x] Invitation token security contract specified (signed, expiring, one-time, revocable)
- [x] Deployment isolation policy specified (branch mapping + separate deploy keys + fail-closed validation)
- [x] Triage idempotency and retry semantics specified (`triageRunId`, `idempotencyKey`, bounded retries)

**Implementation Patterns**
- [x] Naming conventions established (backend, frontend, shared)
- [x] Structure patterns defined (Convex directory, frontend directory, test co-location)
- [x] Communication patterns specified (routes → features → Convex, internal functions)
- [x] Process patterns documented (loading, error handling, auto-save, pagination, conditional queries, file upload, imports)
- [x] Conflict-safe auto-save pattern documented (version preconditions + optimistic updates + user-visible resolution)
- [x] Return validators mandated on all Convex functions (args + returns)
- [x] Internal function boundary specified (Actions → internalMutation, crons → internal functions)
- [x] Node.js runtime directive (`"use node"`) specified for Action files
- [x] Pagination pattern specified (cursor-based via usePaginatedQuery)
- [x] Conditional query pattern specified ("skip" for role-based views)
- [x] File upload flow documented (3-step: generateUploadUrl → POST → save reference)
- [x] External API response sanitization specified

**Project Structure**
- [x] Complete directory structure defined (~70+ files)
- [x] Component boundaries established (features, shared, routes)
- [x] Integration points mapped (internal + 6 external services)
- [x] Requirements to structure mapping complete (11 FR categories + 6 cross-cutting concerns)
- [x] Baseline E2E smoke suite defined for RBAC, confidentiality, invitations, and state transitions

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** HIGH — all requirements covered, all decisions coherent, clear implementation guidance for AI agents.

**Key Strengths:**
- Convex eliminates entire categories of infrastructure decisions (real-time, caching, deployment, WebSocket management)
- Role-gated auth wrappers create a single, auditable security boundary
- React Compiler + Convex reactive queries eliminate performance footgun categories (memoization, stale cache)
- Feature-based organization with FR mapping means any agent can find where to work
- Chained triage Actions with reactive progress provide both reliability and UX

**Areas for Future Enhancement:**
- Expanded E2E coverage beyond the baseline smoke suite
- CI/CD pipeline with automated Convex deploy (post-prototype)
- Rate limiting on public endpoints (post-prototype)
- Accessibility audit integration into build pipeline (post-prototype)
- Convex Agents component evaluation for triage pipeline if chained Actions prove cumbersome

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries — consult FR mapping table for file placement
- Refer to this document for all architectural questions
- Use `bun` and `bunx` exclusively — never `npm` or `npx`
- Never use manual memoization — React Compiler handles it

**First Implementation Priority:**
```bash
bunx create-convex -- -t tanstack-start
```
Then add: Clerk auth, Tailwind, shadcn/ui, React Compiler, Motion, Vercel AI SDK, unpdf, fonts — in that order per the Manual Additions table.
