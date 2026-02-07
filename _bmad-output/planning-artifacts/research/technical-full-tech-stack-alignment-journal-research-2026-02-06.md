---
stepsCompleted: [1, 2, 3, 4, 5]
status: complete
inputDocuments:
  - "product-brief-alignment-journal-2026-02-06.md"
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Full tech stack for Alignment Journal editorial platform'
research_goals: 'Comparison of viable stacks with tradeoffs, particularly evaluating TanStack Start + Convex + Vercel'
user_name: 'Luca'
date: '2026-02-06'
web_research_enabled: true
source_verification: true
---

# Research Report: Technical

**Date:** 2026-02-06
**Author:** Luca
**Research Type:** Technical

---

## Research Overview

Full-stack technology evaluation for the Alignment Journal editorial platform — a custom-built web application covering the submission-to-publication pipeline with LLM-powered triage, intelligent reviewer matching, semi-confidential review, and real-time editor dashboards. Three stacks evaluated head-to-head: (A) TanStack Start + Convex + Vercel, (B) Next.js + Supabase + Inngest + Vercel, (C) Next.js + Neon + Clerk + Drizzle + Inngest + Vercel. Research conducted via parallel web search agents with 50+ sources verified across official documentation, community reports, and pricing data current as of February 2026.

---

## Technical Research Scope Confirmation

**Research Topic:** Full tech stack for Alignment Journal editorial platform
**Research Goals:** Comparison of viable stacks with tradeoffs, particularly evaluating TanStack Start + Convex + Vercel

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-02-06

## Technology Stack Analysis

### Programming Languages & Runtime

**TypeScript** is the clear choice across all viable stacks. Every framework under consideration (TanStack Start, Next.js, Remix, SvelteKit) has first-class TypeScript support. The key differentiator is *how much* type safety each stack provides end-to-end.

- **TanStack Start**: Superior end-to-end type inference — search params, path params, loaders, middleware, and server functions are all fully typed without manual annotation. ~30-35% smaller client bundles than Next.js.
- **Next.js App Router**: Strong TypeScript support but gaps at client/server boundaries with Server Components. Heavier framework runtime layer.
- **Runtime**: Node.js 20+ (LTS) for all stacks. TanStack Start also supports Bun and Deno deployment targets.

_Source: [TanStack Start vs Next.js Comparison](https://tanstack.com/start/latest/docs/framework/react/comparison), [Medium: Next.js vs TanStack Start](https://medium.com/@shahnoormujawar/next-js-vs-tanstack-start-a-technical-no-hype-comparison-a80b0d05741e)_

### Development Frameworks — Head-to-Head

#### Stack A: TanStack Start + Convex + Vercel (User's Primary Interest)

**TanStack Start** — Release Candidate (v1 RC), approaching v1.0 stable.
- Built on Vite (instant startup, fast HMR)
- File-based routing with code-based options
- Server functions with type-safe RPCs
- Selective SSR, ISR, SPA mode, streaming SSR
- Deployment-agnostic (Vercel, Cloudflare, Netlify, Node, Bun)
- **No React Server Components yet** (in active development, expected as non-breaking v1.x addition)
- Known issues: file uploads load entire file into memory (no streaming), some production deployment edge cases on certain platforms
- Community: 6,300+ Discord members, 9,000+ companies using TanStack ecosystem, 36 core contributors

**Convex** — Production-ready reactive database platform.
- Real-time reactivity: tracks query dependencies, auto-pushes updates via WebSocket
- Three function types: Queries (read, reactive), Mutations (read/write, ACID, 1s limit), Actions (external calls, 10min timeout)
- Built-in file storage (all file types, managed CDN)
- Built-in vector search (cosine similarity, 2-4096 dimensions, up to 256 results)
- Scheduled functions + cron jobs (durable, stored in DB)
- Auth via Clerk integration (recommended) or Convex Auth (beta)
- RBAC: flexible code-based authorization at each endpoint (no opinionated RLS framework)
- Open source (mitigates vendor lock-in partially)
- **Limitations**: No aggregate queries (COUNT requires iteration), no reference constraints (no CASCADE), no local dev without internet, per-developer pricing on Pro

_Source: [TanStack Start v1 RC](https://tanstack.com/blog/announcing-tanstack-start-v1), [Convex Overview](https://docs.convex.dev/understanding/), [Convex Pricing](https://www.convex.dev/pricing), [Convex Vector Search](https://docs.convex.dev/search/vector-search)_

#### Stack B: Next.js + Supabase + Vercel

**Next.js 15.0.5+** — Mature, battle-tested, production standard.
- App Router with React Server Components (RSC), server actions, streaming with Suspense
- Turbopack available in Next.js 16 (10x faster HMR)
- Massive ecosystem, extensive third-party integrations
- CVE-2025-66478 patched in 15.0.5+ and 16.0.7+

**Supabase** — All-in-one BaaS (Postgres + Auth + Storage + Real-time + Edge Functions).
- Native real-time via PostgreSQL logical replication + WebSocket (Elixir/Phoenix server)
- Row Level Security (RLS) for role-based access at DB level
- Built-in pgvector for semantic search / reviewer matching
- File storage with access policies
- Edge Functions (Deno-based, 150-400s duration, but **2s CPU time limit** — insufficient for LLM work)
- Pro plan: $25/month (8GB DB, 100GB storage, 100GB bandwidth)

_Source: [Supabase Docs](https://supabase.com/docs/guides/realtime), [Next.js Blog](https://nextjs.org/blog/CVE-2025-66478)_

#### Stack C: Next.js + Neon + Clerk + Inngest + Vercel

**Neon Serverless Postgres** — After Databricks acquisition (May 2025), storage dropped to $0.35/GB-month. Scale-to-zero, instant DB branching.

**Drizzle ORM** — SQL-first TypeScript wrapper. No code generation step, instant type updates, smaller bundles. Faster serverless cold starts than Prisma.

**Clerk** — Production auth in ~30 minutes. Native RSC components, built-in RBAC, 12.5ms avg latency, pre-built UI.

**Inngest** — Durable execution engine for background jobs. `step.run()` for reliable steps, `step.ai.wrap()` for AI workflows, automatic retries, priority queuing, real-time progress. First-class Next.js support.

**Vercel Blob** — S3-backed file storage with CDN integration.

_Source: [Neon Pricing 2026](https://vela.simplyblock.io/articles/neon-serverless-postgres-pricing-2026/), [Inngest Docs](https://www.inngest.com/docs/guides/background-jobs), [Clerk Auth Guide](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router), [Drizzle vs Prisma](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma)_

### Database and Storage Technologies

| Feature | Convex | Supabase (Postgres) | Neon (Postgres) |
|---------|--------|-------------------|----------------|
| **Data Model** | Document-oriented (JSON) | Relational (SQL) | Relational (SQL) |
| **Real-time** | Native reactive queries via WebSocket | Native via logical replication + WebSocket | Not built-in (add Pusher/Ably) |
| **Vector Search** | Built-in (cosine similarity, 2-4096 dims) | pgvector extension (HNSW, IVFFlat indexes) | pgvector extension |
| **File Storage** | Built-in (1GB free, $0.03/GB) | Built-in (1GB free on free tier) | Not built-in (pair with S3/Vercel Blob) |
| **Transactions** | ACID (mutations), 1s limit | Full ACID, no time limit | Full ACID, no time limit |
| **Aggregates** | No native COUNT/SUM — must iterate | Full SQL aggregates | Full SQL aggregates |
| **Migrations** | Schema.ts changes, online migration scripts | Standard SQL migrations | Standard SQL migrations (Drizzle kit) |
| **Auth** | Clerk integration or Convex Auth (beta) | Built-in auth + RLS | Pair with Clerk or Auth.js |
| **Pricing** | Free: 1M calls, 0.5GB. Pro: $25/dev/mo | Free: 500MB. Pro: $25/mo flat | Free: 500MB. Pro: usage-based |
| **Lock-in Risk** | Medium-high (open source but proprietary hosting) | Low (standard Postgres) | Low (standard Postgres) |
| **Offline Dev** | No — requires internet | Local via Docker | Local via Docker (branching) |

_Source: [Convex Limits](https://docs.convex.dev/production/state/limits), [Supabase Pricing](https://uibakery.io/blog/supabase-pricing), [Neon vs Supabase](https://vela.simplyblock.io/neon-vs-supabase/)_

### LLM Integration Layer

**PDF Text Extraction:**
- **unpdf** (recommended for TypeScript): Modern async/await API, excellent type definitions, cross-runtime. Newer but iterating fast.
- **pdf-parse**: Fastest for plain text extraction. Doesn't preserve table structure.
- **pdf.js-extract**: Wraps Mozilla's PDF.js, captures glyph position/font/styling. Good for layout-aware extraction.
- For academic papers with complex layouts, consider a two-pass approach: unpdf for text, then LLM for structured section extraction.

_Source: [Strapi: 7 PDF Parsing Libraries](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025), [unpdf on GitHub](https://github.com/unjs/unpdf)_

**LLM APIs for Triage:**
- **Claude API** (Anthropic): Sonnet 4.5 at $3/$15 per 1M input/output tokens. More consistent structured outputs. Prompt caching (-90%) and batch requests (-50%) available.
- **OpenAI API**: GPT-5 at $1.25/$10 per 1M input/output tokens. Cheaper at baseline. Native JSON mode and structured outputs.
- **Vercel AI SDK 6**: Unifies `generateObject` and `generateText` for multi-step tool calling + structured output. Streaming structured objects. New Agent abstraction for reusable AI pipelines. Works with both Claude and OpenAI.
- **Cost estimate** for 5-6 analysis passes per submission (~10K tokens input each): ~$0.15-$0.30 per submission with Claude Sonnet, ~$0.06-$0.12 with GPT-5. With caching, Claude drops to near-parity.

_Source: [OpenAI vs Claude for Production 2026](https://zenvanriel.nl/ai-engineer-blog/openai-vs-claude-for-production/), [AI SDK 6](https://vercel.com/blog/ai-sdk-6), [LLM Pricing Comparison](https://www.cloudidr.com/llm-pricing)_

**Embeddings for Reviewer Matching:**
- **Voyage-4-large**: Top MTEB performer, surpasses competitors by 1.8-14%. Best for specialized retrieval (academic/technical text). New MoE architecture.
- **OpenAI text-embedding-3-large**: Strong all-around, 1536 dims, competitive pricing ($0.13/1M tokens). Good default choice.
- **Cohere embed-v4**: Leads MTEB at 65.2, compression options, customizable for specific search types.
- For reviewer matching at journal scale (dozens of reviewers, 10-30 papers), any of these is sufficient. OpenAI is simplest to integrate; Voyage-4 is highest quality.

_Source: [Embedding Models 2026](https://elephas.app/blog/best-embedding-models), [Voyage-4 Announcement](https://blog.voyageai.com/2026/01/15/voyage-4/), [Text Embedding Models Compared](https://document360.com/blog/text-embedding-model-analysis/)_

### Async Processing / Background Jobs

| Approach | Works With | Max Duration | Retry Logic | Real-time Progress | Complexity |
|----------|-----------|-------------|-------------|-------------------|-----------|
| **Convex Actions** | Convex only | 10 min | Manual (schedule retry) | Yes (reactive queries) | Low |
| **Convex Workflow Component** | Convex only | Durable (multi-step) | Built-in | Yes (reactive queries) | Medium |
| **Inngest** | Any (Next.js, TanStack Start) | Configurable | Automatic + exponential backoff | Yes (streaming) | Medium |
| **Trigger.dev** | Any | Configurable | Built-in | Yes (observability UI) | Medium |
| **Supabase Edge Functions** | Supabase | 150-400s (2s CPU!) | Manual | Limited | Low |
| **Vercel Cron** | Vercel | 60s (Pro) | None | None | Low |

**For LLM triage pipeline:**
- **With Convex**: Use Convex Actions for LLM calls (10min timeout is plenty). Schedule from mutations. Progress updates are free via reactive queries — triage status updates in real-time on the editor dashboard automatically.
- **With Supabase/Neon**: Need Inngest or Trigger.dev as a separate service. Inngest's `step.ai.wrap()` is purpose-built for chained LLM calls. Add WebSocket or polling for progress.

_Source: [Convex Actions](https://docs.convex.dev/functions/actions), [Convex Workflow Component](https://www.convex.dev/components/workflow), [Inngest Background Jobs](https://www.inngest.com/blog/background-jobs-realtime-nextjs), [Trigger.dev](https://trigger.dev/)_

### Cloud Infrastructure and Deployment

All three stacks deploy to **Vercel** as the primary platform. Key differences:

- **TanStack Start on Vercel**: Supported via `vercel` preset. Also deployable to Cloudflare Workers, Netlify, Railway, Bun.
- **Next.js on Vercel**: First-class support, tightest integration. Preview deployments, edge middleware, analytics built-in.
- **Convex**: Hosted by Convex (separate from Vercel). EU hosting available (+30% surcharge).
- **Supabase**: Self-hosted or Supabase Cloud. Pro at $25/mo flat.
- **Neon**: Serverless Postgres, Vercel integration available. Scale-to-zero.

### Technology Adoption Trends

- **TanStack Start** is gaining traction among developers leaving Next.js, citing better type safety, Vite speed, and fewer framework opinions. However, it's still RC and the community is 10-50x smaller than Next.js.
- **Convex** is growing rapidly as a reactive BaaS, positioned as a "Firebase done right" for TypeScript. Open source since 2024. Startup program offers 1 year free Pro.
- **Supabase** continues to be the most popular open-source Firebase alternative. Massive community, well-documented.
- **Next.js** remains the dominant React framework by a wide margin, though some developer sentiment has shifted due to complexity and Vercel coupling.
- **Inngest** has emerged as the de facto standard for durable background jobs in the TypeScript ecosystem, increasingly preferred over Trigger.dev for simpler use cases.

_Source: [TanStack in 2026](https://www.codewithseb.com/blog/tanstack-ecosystem-complete-guide-2026), [Appwrite: Why Developers Leaving Next.js](https://appwrite.io/blog/post/why-developers-leaving-nextjs-tanstack-start), [Convex Startup Program](https://www.convex.dev/pricing)_

## Integration Patterns Analysis

### Authentication & Authorization Integration

**Pattern: Clerk + Convex (Stack A)**
Three-step integration: (1) Clerk handles login UI and session management, (2) Clerk issues JWT with `convex` template, (3) Convex validates JWT and resolves user identity in every function call. TanStack Start requires setting the token in `beforeLoad` via `ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)` for SSR. Client-side uses `<ConvexProviderWithClerk>` for auto-refreshing tokens. RBAC implemented in code at each Convex endpoint — create custom wrappers like `editorMutation`, `reviewerQuery` that check roles before executing.

**Pattern: Clerk + Next.js + Drizzle (Stack C)**
Clerk provides native RSC components (`<SignIn>`, `<UserProfile>`). Middleware protects routes. `auth()` helper in server components/actions returns user session. Roles stored in Drizzle schema, checked in server actions.

**Pattern: Supabase Auth + RLS (Stack B)**
Auth is built into Supabase. RLS policies enforce access at the database level — e.g., `CREATE POLICY "Reviewers see assigned papers" ON submissions FOR SELECT USING (auth.uid() IN (SELECT reviewer_id FROM assignments WHERE submission_id = submissions.id))`. Multi-tenant isolation achievable in ~2 hours. Real-time subscriptions automatically respect RLS policies. Trade-off: RLS policies can become complex for semi-confidential review mechanics (reviewer identity hidden from authors but visible to editors).

_Source: [Convex + Clerk + TanStack Start](https://docs.convex.dev/client/tanstack/tanstack-start/clerk), [Clerk Convex Integration](https://clerk.com/docs/guides/development/integrations/databases/convex), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)_

### PDF Upload → LLM Triage Pipeline Integration

**Pattern: Convex Client Upload + Actions (Stack A)**
1. Client calls mutation to get upload URL (`generateUploadUrl()`)
2. Client uploads PDF directly to Convex storage (bypasses TanStack Start's memory issue)
3. Client calls second mutation with storage ID → saves submission record + schedules triage action
4. Convex action runs: extracts text (unpdf in Node.js runtime), calls LLM APIs via Vercel AI SDK for each analysis pass, writes results back via mutations
5. Dashboard auto-updates via reactive queries — editor sees triage progress in real-time without polling

**Pattern: Supabase Storage + Inngest (Stack B)**
1. Client uploads PDF to Supabase Storage (access policies control who can upload)
2. Database trigger or server action sends event to Inngest
3. Inngest `step.run()` chain: download PDF → extract text → run LLM analyses sequentially with `step.ai.wrap()` → write results to Supabase
4. Real-time subscription on `triage_results` table pushes updates to dashboard

**Pattern: Vercel Blob + Inngest (Stack C)**
1. Client uploads to Vercel Blob via server action
2. Server action triggers Inngest event
3. Inngest processes (same as Stack B)
4. Dashboard polls or uses Pusher/Ably for updates (no built-in real-time)

**Key Difference:** Convex's reactive queries give you real-time triage progress for free. With Supabase you get it via real-time subscriptions (slight setup). With Stack C you need a separate real-time layer.

_Source: [Convex File Upload](https://docs.convex.dev/file-storage/upload-files), [Convex Actions](https://docs.convex.dev/functions/actions), [Streaming AI with Convex + Vercel AI SDK](https://www.arhamhumayun.com/blog/streamed-ai-response), [Inngest Background Jobs](https://www.inngest.com/blog/background-jobs-realtime-nextjs)_

### Real-Time Communication Patterns

**Convex Reactive Queries (Stack A):**
Every query function in Convex is automatically reactive. When any underlying data changes, all subscribed clients receive updates via persistent WebSocket. No setup required — write a query, use it in a component, and it's live.
- Editor dashboard: `useQuery(api.submissions.listWithStatus)` — auto-updates when any submission changes status
- Review discussion: `useQuery(api.messages.listByThread, { threadId })` — new messages appear instantly
- Triage progress: `useQuery(api.triage.getStatus, { submissionId })` — updates as each analysis pass completes

**Supabase Realtime (Stack B):**
Subscribe to Postgres changes via WebSocket channel. Uses PostgreSQL logical replication under the hood. Supports Broadcast (low-latency pub/sub), Presence (who's online), and Postgres Changes (INSERT/UPDATE/DELETE events). RLS applies to real-time channels.
- Requires explicit channel subscription setup per data type
- More granular control over what to subscribe to
- Slightly more boilerplate than Convex

**No Built-In Real-Time (Stack C):**
Neon/Drizzle has no real-time capability. Options: Pusher ($49/mo for 1M messages), Ably, or polling with SWR/React Query `refetchInterval`. Adds complexity and cost for a core feature the platform needs.

_Source: [Convex Realtime](https://docs.convex.dev/realtime), [Supabase Realtime](https://supabase.com/docs/guides/realtime/getting_started), [Supabase Subscriptions in Next.js 15](https://dev.to/lra8dev/building-real-time-magic-supabase-subscriptions-in-nextjs-15-2kmp)_

### LLM API Integration Patterns

**Vercel AI SDK 6 (Works with all stacks):**
The primary integration layer for LLM calls. Key patterns:
- `generateObject()` with Zod schema for structured triage reports — model output is validated against schema automatically
- `streamObject()` for streaming partial triage results to the UI as they generate
- Agent abstraction for reusable analysis pipelines (define once, use across scope check, formatting check, claims analysis, etc.)
- Provider-agnostic: swap between Claude and OpenAI without code changes

**Convex + AI SDK (Stack A):**
Convex actions run in Node.js runtime and can use Vercel AI SDK directly. The recommended pattern decouples LLM streaming from HTTP requests — persist every chunk via mutations so the reactive query layer broadcasts updates. Convex's `@convex-dev/persistent-text-streaming` component handles this pattern out of the box.

**Next.js + AI SDK (Stack B/C):**
Server actions or API routes call AI SDK functions. Inngest steps wrap each LLM call for durability and retry logic. Stream to client via server-sent events or Vercel AI SDK's `useChat`/`useCompletion` hooks.

_Source: [AI SDK 6](https://vercel.com/blog/ai-sdk-6), [Structured Outputs with AI SDK](https://www.aihero.dev/structured-outputs-with-vercel-ai-sdk), [Convex + Vercel AI SDK Streaming](https://www.arhamhumayun.com/blog/streamed-ai-response)_

### Vector Search / Reviewer Matching Integration

**Convex Vector Search (Stack A):**
Define vector index in schema → store embeddings in document fields → search via `ctx.vectorSearch()` in actions. Consistent and immediately up-to-date (write an embedding, search it instantly). Limit: only available in actions, not queries/mutations. Up to 4 vector indexes per table, 256 max results.
- Pattern: On reviewer profile creation/update → action generates embedding via OpenAI → stores in reviewer document. On paper submission → action generates paper embedding → vector search against reviewer pool → return ranked matches with rationale.

**pgvector via Supabase (Stack B):**
Native Postgres extension. Define `vector(1536)` column → create HNSW or IVFFlat index → search with `<=>` (cosine distance) operator or Supabase RPC function. Can join vector search with relational data in a single SQL query. RLS applies.
- Pattern: SQL function `match_reviewers(query_embedding, threshold, count)` returns reviewers ranked by similarity with full profile data in one query.

**pgvector via Neon + Drizzle (Stack C):**
Same as Supabase pattern but with Drizzle ORM. Drizzle supports pgvector via `drizzle-orm/pg-core` vector type. Write raw SQL for similarity search or use Drizzle's query builder.

_Source: [Convex Vector Search](https://docs.convex.dev/search/vector-search), [Supabase AI/Vector](https://supabase.com/docs/guides/ai), [pgvector vs Pinecone](https://supabase.com/blog/pgvector-vs-pinecone)_

### Email & Notification Integration

**MVP (All Stacks):** Simulated in-app notifications. Store notification records in DB, display in UI. No SMTP needed.

**Post-MVP (All Stacks):** Resend (modern email API, $0 for 100 emails/day) or Postmark for transactional email. Triggered by Convex scheduled functions or Inngest events.

### Integration Security Patterns

**JWT-Based Auth Flow (All Stacks):**
Clerk or Supabase Auth issues JWTs. Backend validates on every request. No API keys exposed to client.

**LLM API Key Management:**
Store API keys (OpenAI, Anthropic) as environment variables. In Convex: set via dashboard, accessible only in actions. In Next.js: Vercel environment variables, accessible only in server-side code.

**Semi-Confidential Review (Critical):**
All stacks handle this at the application layer — queries/mutations that resolve reviewer identity are gated by role. Editor endpoints return full reviewer data; author-facing endpoints strip reviewer identity. In Supabase, RLS can enforce this at the DB level. In Convex, custom query wrappers enforce it in code.

## Architectural Patterns and Design

### System Architecture: Serverless Monolith

**Recommended pattern for all three stacks:** Serverless monolith — a single codebase deployed as serverless functions, with async processing handled by a separate execution layer (Convex actions or Inngest).

**Why not microservices:** The Alignment Journal has ~30 active submissions at peak. The editorial workflow is inherently sequential (submit → triage → assign → review → decide → publish). There's no scaling bottleneck that microservices would solve, and the 1-week timeline makes microservices infeasible. A monolith keeps the codebase navigable and deployable by another developer.

**Why not a traditional monolith server:** Serverless gives you zero-ops deployment on Vercel, automatic scaling if traffic spikes (e.g., a published paper goes viral), and pay-per-use pricing at the journal's low traffic volume.

**Convex's hybrid model** (Stack A) is worth noting: Convex Components combine isolation benefits of service-oriented architecture with transactional simplicity of monoliths. Your queries, mutations, and actions live in a single `convex/` directory but each function is independently deployed and scaled by Convex. This is the simplest architecture for a solo developer on a 1-week build.

_Source: [Convex Backend Components](https://stack.convex.dev/backend-components), [Modern Full Stack Architecture with Next.js 15+](https://softwaremill.com/modern-full-stack-application-architecture-using-next-js-15/)_

### Data Architecture: Editorial State Machine

The editorial workflow is fundamentally a **state machine** for submissions:

```
DRAFT → SUBMITTED → TRIAGING → TRIAGE_COMPLETE →
  → DESK_REJECTED (terminal)
  → UNDER_REVIEW → DECISION_PENDING →
    → ACCEPTED → PUBLISHED (terminal)
    → REJECTED (terminal)
    → REVISION_REQUESTED → SUBMITTED (loop)
```

**Convex (Stack A):** Model this as a `status` field on the submission document. Mutations enforce valid transitions. Reactive queries filter by status for different dashboard views. No need for a separate state machine library — Convex mutations are ACID and handle concurrent access.

**Postgres (Stack B/C):** Model as an enum column with a `status_history` table for audit trail. Check constraints or application-level validation enforce transitions. Supabase RLS policies can gate access by status (e.g., authors can't see rejected triage details).

**Key entities and relationships:**
- `submissions` — core document with status, metadata, PDF reference
- `triage_reports` — structured LLM analysis results linked to submission
- `assignments` — links action-editors and reviewers to submissions
- `reviews` — structured review content with recommendation
- `discussion_threads` / `messages` — threaded conversation per submission
- `reviewer_profiles` — expertise, embedding vector, availability
- `payments` — computed amounts per reviewer per submission (display only)

**Convex trade-off:** Document model means no foreign key constraints or CASCADE deletes. You manually maintain referential integrity. For a small-scale journal, this is manageable. For a production system at scale, Postgres's relational guarantees are stronger.

**Supabase trade-off:** Full relational power (JOINs, aggregates, constraints) but RLS policies for semi-confidential review become complex — multiple policies per table, per role, per submission status.

### Rendering Architecture

**TanStack Start (Stack A):** Selective SSR — server-render the initial page load, then Convex reactive queries take over for live updates. Best pattern: `useSuspenseQuery` with `convexQuery` wrapper renders on server first, then updates live in browser. No "loading spinner on first visit" problem.

**Next.js App Router (Stack B/C):** Server Components for the shell, layout, and static content. Client Components for interactive elements (dashboard tables, discussion threads, review forms). Server Actions for mutations. Pattern: fetch initial data on server, layer TanStack Query or SWR on top for client-side freshness.

**For the Alignment Journal specifically:** The editor dashboard and review UI need to feel alive — new submissions appearing, triage progress updating, discussion messages streaming in. This favors architectures with built-in reactivity (Convex > Supabase real-time > polling).

_Source: [TanStack Start Selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr), [Next.js Architecture 2026](https://www.yogijs.tech/blog/nextjs-project-architecture-app-router)_

### Security Architecture

**Layer 1 — Authentication:** JWT-based (Clerk or Supabase Auth). Every request validated. Session tokens rotated automatically.

**Layer 2 — Authorization (Critical for Semi-Confidential Review):**

The most architecturally complex requirement. Reviewer identity must be hidden from authors during review but visible to editors. After acceptance, identities are revealed by default (with editor-granted exceptions).

- **Convex approach:** Create role-gated query functions. `reviewerView.getReview(submissionId)` returns review content without reviewer names. `editorView.getReview(submissionId)` returns full data. The application layer enforces what data each role sees. Clean, explicit, easy to reason about.
- **Supabase approach:** RLS policies per table. `CREATE POLICY "authors_see_anonymized_reviews" ON reviews FOR SELECT USING (auth.uid() IN (SELECT author_id FROM submissions WHERE id = reviews.submission_id) AND reviews.reviewer_name IS HIDDEN)`. More powerful (enforced at DB level) but complex to debug and test.
- **Next.js + Drizzle approach:** Server-side query functions per role. Similar to Convex but with SQL. Drizzle's type system ensures you don't accidentally return fields you shouldn't.

**Layer 3 — Data Isolation:** Each submission's triage data, reviews, and discussions are scoped to authorized users only. No cross-submission data leaks.

### Scalability and Performance Patterns

**Journal scale context:** 10-30 active submissions, ~50-100 registered users (authors, reviewers, editors), low concurrent users (maybe 5-10 at peak). This is a low-traffic application with occasional compute bursts (LLM triage on submission).

**Convex:** Auto-scales functions independently. WebSocket connections maintained by Convex infrastructure. 16 concurrent queries/mutations on free tier (sufficient for journal scale). The 1-second mutation timeout is the main constraint — keep mutations fast, push heavy work to actions.

**Supabase:** Pro plan handles this scale trivially. Real-time subscriptions scale to thousands of concurrent connections. Edge Functions are the bottleneck (2s CPU limit) but LLM work is offloaded to Inngest.

**Neon:** Scale-to-zero means zero cost when idle. Scales up automatically for traffic. Database branching useful for staging/testing without duplicating data.

**What could actually break at scale:**
- LLM API rate limits during concurrent submissions (mitigate with queuing)
- PDF file storage costs if accepting many large papers (mitigate with size limits)
- Convex action concurrency if many triage jobs run simultaneously (64 concurrent actions on free tier)

### Deployment Architecture

**All stacks deploy as:**
- **Frontend + API:** Vercel (serverless functions, edge CDN, preview deployments)
- **Database:** Convex Cloud / Supabase Cloud / Neon (managed, no ops)
- **Async processing:** Convex Actions / Inngest (managed, no ops)
- **File storage:** Convex Storage / Supabase Storage / Vercel Blob (managed)

**Zero infrastructure to manage.** No Docker, no Kubernetes, no servers. Appropriate for a solo developer on a 1-week build and a small team post-hire.

**CI/CD:** Push to GitHub → Vercel auto-deploys. Convex deploys via `npx convex deploy` (can be integrated into Vercel build step). Supabase migrations via `supabase db push` or migration files.

_Source: [Convex Best Practices](https://docs.convex.dev/understanding/best-practices/), [Convex Overview](https://docs.convex.dev/understanding/), [Next.js Full-Stack Architecture 2026](https://www.nucamp.co/blog/next.js-in-2026-the-full-stack-react-framework-that-dominates-the-industry)_

## Implementation Approaches and Technology Adoption

### Starter Templates & Bootstrapping

**Stack A (TanStack Start + Convex):**
The **Convex SaaS Starter** (`get-convex/convex-saas`) is a production-ready template with TanStack Start, Convex Auth, Stripe, Resend, Tailwind CSS, and shadcn/ui. Alternatively, `npm create convex@latest -- -t tanstack-start` gives a minimal starting point. shadcn/ui has official TanStack Start installation support. Estimated bootstrap time: **~1 hour** to running app with auth.

**Stack B (Next.js + Supabase):**
`npx create-next-app` + Supabase project setup. Supabase provides Next.js quickstart templates. shadcn/ui has first-class Next.js support. Many production-grade SaaS templates available (e.g., Makerkit, Shipfast). Estimated bootstrap time: **~1-2 hours**.

**Stack C (Next.js + Neon + Clerk + Inngest):**
`npx create-next-app` + Clerk setup + Drizzle schema + Neon connection + Inngest integration. More services to wire together. Estimated bootstrap time: **~2-3 hours**.

_Source: [Convex SaaS Starter](https://www.convex.dev/templates/convex-saas), [shadcn/ui TanStack Start](https://ui.shadcn.com/docs/installation/tanstack), [Convex Templates](https://www.convex.dev/templates)_

### 7-Day Implementation Roadmap

**Stack A: TanStack Start + Convex + Vercel**

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Bootstrap + Auth + Schema | Running app with Clerk auth, role-based access (author/reviewer/editor), Convex schema for all entities |
| 2 | Submission Flow + PDF Upload | Author can create account, fill metadata form, upload PDF to Convex storage, see confirmation |
| 3 | LLM Triage Pipeline | Convex action chain: PDF text extraction → scope fit → formatting → citations → claims analysis → structured triage report. Real-time progress on dashboard |
| 4 | Editor Dashboard + Reviewer Matching | Submissions list with status pipeline, triage results display, reviewer matching via vector search, assignment interface |
| 5 | Review UI + Discussions | Structured review form, threaded discussion (real-time via reactive queries), semi-confidential identity gating |
| 6 | Publication Pages + Seed Data | Web-first article view with dual abstracts, 5+ seed submissions at various stages, sample reviews, 1 published article |
| 7 | Polish + Deploy + README | UI polish, edge cases, Vercel deployment, seed data finalization, clean README |

**Stack B: Next.js + Supabase + Vercel**

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Bootstrap + Auth + Schema + RLS | Running app with Supabase Auth, database schema with migrations, RLS policies for all roles |
| 2 | Submission Flow + PDF Upload | Upload to Supabase Storage, metadata form, submission confirmation, status tracking |
| 3 | LLM Triage Pipeline + Inngest | Inngest event chain for triage, real-time subscription for progress updates |
| 4 | Editor Dashboard + Reviewer Matching | Dashboard with real-time subscriptions, pgvector-based matching, assignment UI |
| 5 | Review UI + Discussions | Review form, threaded discussion with real-time updates, RLS for identity isolation |
| 6 | Publication Pages + Seed Data | Article view, seed data via SQL scripts |
| 7 | Polish + Deploy + README | Same as Stack A |

**Stack C: Next.js + Neon + Clerk + Inngest + Vercel**

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Bootstrap + Auth + Schema | Clerk setup, Drizzle schema + Neon, basic routing |
| 2 | Submission Flow + PDF Upload | Vercel Blob upload, metadata form |
| 3 | LLM Triage Pipeline + Inngest | Same as Stack B but without real-time progress (polling instead) |
| 4 | Editor Dashboard | Dashboard with polling/SWR, matching, assignment |
| 5 | Review UI + Discussions | Review form, discussions (polling-based, no real-time) |
| 6 | Real-time + Publication + Seed | Add Pusher/Ably for real-time OR accept polling. Article view, seed data |
| 7 | Polish + Deploy + README | Same as above |

**Timeline risk:** Stack C loses ~0.5-1 day to real-time implementation. Stacks A and B include real-time natively.

### Development Workflow & Tooling

**All stacks share:**
- **UI**: Tailwind CSS + shadcn/ui (accessible, customizable component primitives)
- **Validation**: Zod schemas (shared between frontend forms and backend/LLM structured output)
- **LLM Integration**: Vercel AI SDK 6 (provider-agnostic, structured outputs, streaming)
- **PDF Parsing**: unpdf (TypeScript-first, async/await)
- **IDE**: VS Code/Cursor with TypeScript LSP, Tailwind IntelliSense
- **Version Control**: Git + GitHub

**Stack A specifics:**
- `npx convex dev` runs alongside Vite dev server — hot-reloads schema and function changes
- Convex Dashboard for data inspection, logs, and function execution
- No local database to manage — Convex cloud handles everything

**Stack B specifics:**
- `supabase start` for local development (Docker-based)
- Supabase Studio (local) for data inspection and SQL editing
- Inngest Dev Server for local background job testing

**Stack C specifics:**
- Neon branching for development database isolation
- Drizzle Studio for schema visualization
- Inngest Dev Server for background job testing

### Testing Strategy

**For the 1-week MVP, pragmatic testing is essential — focus on what matters most:**

**Critical paths to test:**
1. Submission flow end-to-end (upload → triage → report)
2. Role-based access (reviewer can't see other reviewer identities)
3. Review submission and discussion threading
4. Editor assignment workflow

**Convex testing (Stack A):**
- `convex-test` library for unit testing Convex functions (queries, mutations, actions)
- Mock Convex backend for React component tests (no network dependency)
- Preview deployments with seed data for integration testing
- Convex Dashboard for manual smoke testing

**Supabase testing (Stack B):**
- Local Supabase instance via Docker for integration tests
- RLS policy testing with different auth contexts
- pgTAP for database-level testing (optional)

**General:**
- Vitest for unit tests (fastest, Vite-native)
- Playwright for critical E2E flows if time permits (Day 7)
- Manual testing against seed data is realistic for a 1-week build

_Source: [Convex Testing](https://docs.convex.dev/testing), [Testing React Components with Convex](https://stack.convex.dev/testing-react-components-with-convex), [Convex Preview Deployments](https://docs.convex.dev/production/hosting/preview-deployments)_

### Deployment & Operations

**Convex + Vercel (Stack A):**
- Override Vercel build command: `npx convex deploy --cmd 'npm run build'`
- `CONVEX_DEPLOY_KEY` stored in Vercel environment variables
- Preview deployments get fresh Convex backends (isolated from production)
- `--preview-run 'seedData'` auto-seeds preview environments
- Convex Dashboard provides logs, function metrics, real-time analytics
- Zero infrastructure to manage

**Supabase + Vercel (Stack B):**
- Supabase CLI for migrations: `supabase db push` or migration files
- Vercel environment variables for Supabase URL and keys
- Supabase Dashboard for monitoring, logs, real-time metrics
- Inngest Dashboard for background job monitoring

**Neon + Vercel (Stack C):**
- Drizzle Kit for migrations: `drizzle-kit push` or `drizzle-kit generate` + `drizzle-kit migrate`
- Neon branching for preview environments
- Multiple dashboards to monitor (Vercel, Neon, Clerk, Inngest)

_Source: [Convex on Vercel](https://docs.convex.dev/production/hosting/vercel), [Convex Preview Deployments](https://docs.convex.dev/production/hosting/preview-deployments)_

### Cost Comparison (Monthly, Post-MVP)

| Service | Stack A (Convex) | Stack B (Supabase) | Stack C (Neon+Clerk+Inngest) |
|---------|-----------------|-------------------|------------------------------|
| Framework/Hosting | Vercel Hobby $0 | Vercel Hobby $0 | Vercel Hobby $0 |
| Database/Backend | Convex Free $0 | Supabase Pro $25 | Neon Free $0 |
| Auth | Clerk Free $0 (< 10K MAU) | Included in Supabase | Clerk Free $0 |
| Background Jobs | Included (Convex Actions) | Inngest Free ~$0 | Inngest Free ~$0 |
| File Storage | Included (1GB free) | Included (1GB free) | Vercel Blob ~$0 |
| Real-time | Included | Included | Pusher $0 (free tier) or polling |
| **Total (Free Tier)** | **$0** | **$25** | **$0** |
| **Total (Production)** | **$25/dev/mo** (Convex Pro) | **$25 + $20-50** (Inngest) | **$25** (Neon Pro) + **$20-50** (Inngest) |

**LLM costs (all stacks):** ~$0.10-$0.30 per submission for full triage. At 10 submissions/month = $1-$3/mo. Negligible.

**Convex Startup Program:** Up to 1 year free Professional tier — worth applying if eligible.

### Risk Assessment & Mitigation

| Risk | Stack A | Stack B | Stack C |
|------|---------|---------|---------|
| **Framework maturity** | HIGH — TanStack Start is RC, not v1.0. Production bugs possible. | LOW — Next.js is battle-tested. | LOW — Next.js is battle-tested. |
| **Vendor lock-in** | MEDIUM — Convex is open source but proprietary hosting. Migration requires rewriting backend functions. | LOW — Standard Postgres. Can migrate to any Postgres host. | LOW — Standard Postgres + independent services. |
| **Offline development** | HIGH — Convex requires internet. No local dev possible. | LOW — Local Supabase via Docker. | LOW — Local Postgres + local Inngest dev server. |
| **File upload edge case** | MEDIUM — TanStack Start memory issue with large PDFs. Workaround: direct client upload to Convex. | LOW — Supabase Storage handles large files natively. | LOW — Vercel Blob handles large files. |
| **Hiring/onboarding** | MEDIUM — Smaller Convex + TanStack Start talent pool. New hires need ramp-up time. | LOW — Huge Next.js + Supabase talent pool. Easy to onboard. | LOW — All mainstream technologies. Easy to onboard. |
| **Real-time reliability** | LOW — Convex's core strength. Battle-tested. | LOW — Supabase Realtime is production-grade. | HIGH — No built-in solution. Third-party dependency. |
| **1-week timeline risk** | MEDIUM — RC framework quirks could cost debugging time. | LOW — Well-trodden path. | MEDIUM — More services to wire together. |

**Mitigation for Stack A risks:**
- Lock all dependency versions (`pnpm` lockfile)
- Test on Vercel preview deployments early (Day 2)
- Use direct client upload to Convex for PDFs (bypass TanStack Start)
- Keep Convex schema simple — avoid patterns that fight the document model
- Budget 0.5 day for framework debugging

## Technical Research Recommendations

### Final Stack Recommendation

**For the 1-week prototype build, here is the recommendation matrix:**

#### If you want the best developer experience and fastest real-time features:
**Stack A: TanStack Start + Convex + Clerk + Vercel**

Convex's reactive query model is a genuine superpower for this application. The editor dashboard, triage progress, threaded discussions, and reviewer matching all benefit from real-time updates that require zero additional code. The LLM triage pipeline fits naturally into Convex actions. The Convex SaaS starter template gives you auth + routing + UI out of the box. TanStack Start's type safety is best-in-class.

**The risk is real:** TanStack Start is RC, Convex is a newer platform, and you're betting on two less-proven technologies simultaneously. If you hit a framework bug on Day 3, it could derail the timeline.

#### If you want the safest path with strong real-time:
**Stack B: Next.js + Supabase + Inngest + Vercel**

The most batteries-included option. Auth, real-time, storage, pgvector all in one platform. Next.js is proven. Supabase real-time subscriptions give you live dashboards without Convex's reactive magic but with solid reliability. The main cost is needing Inngest as a separate service for LLM processing (Supabase Edge Functions can't handle it). RLS adds complexity but enforces access control at the database level.

#### If you want maximum control and maturity:
**Stack C: Next.js + Neon + Clerk + Drizzle + Inngest + Vercel**

Every piece is best-in-class and independently replaceable. But you'll spend more time wiring services together, and you have no built-in real-time — a significant gap for an editorial dashboard that should feel alive.

### Implementation Recommendation

**My recommendation: Stack A (TanStack Start + Convex + Clerk + Vercel) if you're comfortable with the maturity risk. Stack B (Next.js + Supabase + Inngest + Vercel) if you want the safer bet.**

The deciding factor is your risk tolerance. Convex's real-time reactivity is genuinely transformative for this particular application — it turns what would be a complex WebSocket/subscription layer into zero-effort automatic updates. That's worth 1-2 days of development time saved. But TanStack Start's RC status means you could lose that time to framework debugging instead.

**Pragmatic approach:** Start with Stack A. If you hit blocking TanStack Start issues by Day 2, pivot to Next.js + Convex (keep Convex, swap the framework). This preserves the real-time advantage while falling back to a proven framework. Convex has official Next.js support that's more mature than its TanStack Start integration.

### Shared Technology Choices (All Stacks)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| UI Components | shadcn/ui + Tailwind CSS | Accessible, customizable, fast to build with |
| Validation | Zod | Shared schemas for forms, API, and LLM structured output |
| LLM SDK | Vercel AI SDK 6 | Provider-agnostic, structured outputs, streaming |
| LLM Provider | Claude Sonnet 4.5 (primary) | Best structured output consistency; OpenAI GPT-5 as fallback |
| PDF Extraction | unpdf | TypeScript-first, cross-runtime, modern API |
| Embeddings | OpenAI text-embedding-3-large | Good default, 1536 dims, simple integration |
| Auth | Clerk | 30-min setup, RBAC, RSC components (unless Stack B → Supabase Auth) |

### Success Metrics

| Metric | Target | How to Verify |
|--------|--------|---------------|
| End-to-end pipeline works | All 4 user journeys navigable | Manual walkthrough on deployed URL |
| LLM triage is substantive | Useful scope/formatting/claims analysis | Upload a real alignment paper (e.g., from MIRI/ARC) |
| Reviewer matching feels smart | Suggestions include clear rationale | Add 5+ reviewer profiles with different expertise, submit papers in different areas |
| Time-to-first-review-action | < 60 seconds | Reviewer clicks invite link → reading paper in under 1 minute |
| Seed data tells a story | Platform feels alive | 5+ submissions, sample reviews, 1 published article |
| Code is clean | Another developer can onboard | Clear README, consistent patterns, no dead code |
