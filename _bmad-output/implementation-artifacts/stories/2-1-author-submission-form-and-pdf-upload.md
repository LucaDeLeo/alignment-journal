# Story 2.1: Author Submission Form and PDF Upload

## Story

**As an** author,
**I want** to fill out a submission form with title, authors, abstract, and keywords, and upload my PDF,
**So that** I can submit my paper to the journal.

## Status

**Epic:** 2 - Author Submission & LLM Triage Pipeline
**Status:** ready
**Priority:** Highest (first story of Epic 2, required by all subsequent Epic 2 stories)
**Depends on:** Story 1.4 (app shell, `/submit/` route group, design system, error boundaries, skeleton loading)

## Context

This story implements the author-facing submission creation experience — the moment Marcus (author archetype) fills out metadata and uploads his PDF. It's the entry point to the entire editorial pipeline. Everything downstream (triage, review, publication) begins here.

Story 1.4 established the `/submit/` route group with the author layout (`data-mode="author"`, warm-neutral palette), error boundary, skeleton loading, and a placeholder "No submissions yet" empty state at `/submit/index.tsx`. This story replaces that placeholder with a real submission form and adds the Convex backend to create submissions and handle PDF uploads.

**Key architectural decisions:**

- **Feature folder:** `app/features/submissions/` with `submission-form.tsx`, `pdf-upload.tsx`, and barrel `index.ts`. Components are co-located by feature, not sprinkled across generic component directories.
- **3-step PDF upload:** Client validates file type/size → calls `generateUploadUrl` mutation → POSTs file to Convex CDN → calls `submissions.create` mutation with the returned `storageId`. This is Convex's canonical file upload pattern.
- **Dual validation:** Zod schema on the frontend for instant inline feedback (validated on blur). Convex `v.*` validators on the backend for authoritative enforcement. TypeScript types bridge the two layers.
- **Auth enforcement:** The `submissions.create` mutation uses the `withAuthor` wrapper — only users with the `author` role can create submissions. The route layout already gates access.
- **Status flow:** New submissions are created with status `SUBMITTED` (skipping `DRAFT` for this prototype — authors don't need draft saving yet). Story 2.3 will trigger the triage pipeline by transitioning `SUBMITTED → TRIAGING`.

**Key architectural references:**
- File upload: architecture.md "File Upload Pattern (PDF Submissions)" — 3-step flow
- Feature structure: architecture.md "Frontend Architecture" — `app/features/submissions/`
- Convex functions: architecture.md "Convex Directory" — `convex/submissions.ts`, `convex/storage.ts`
- Validation: architecture.md "Validation Strategy" — Zod frontend, Convex validators backend
- Auth: architecture.md "RBAC Enforcement" — `withAuthor` wrapper
- Route: story 1.4 — `/submit/` route group with author layout
- Schema: `convex/schema.ts` — `submissions` table definition

## Acceptance Criteria

### AC1: Submission form with all required fields
**Given** an authenticated author
**When** they navigate to `/submit/`
**Then:**
- The page displays a "My Submissions" heading with a "New Submission" button
- Clicking "New Submission" shows a centered single-column form within the author layout (`data-mode="author"`)
- The form contains fields: title (text input), authors (repeatable name + affiliation pair), abstract (textarea with Newsreader serif font), and keywords (tag-style input)
- The authors field starts with one entry pre-filled with the current user's name and affiliation
- The authors field has "Add author" and remove controls for managing co-authors
- The keywords field allows adding/removing individual keyword tags
- All fields have visible `<Label>` elements and non-empty `placeholder` attributes

### AC2: PDF upload with progress and validation
**Given** the submission form
**When** the author uploads a PDF
**Then:**
- A file upload area accepts files via click-to-browse or drag-and-drop
- The file is validated client-side as `application/pdf` with a max size of 50MB
- Non-PDF files show an inline error: "Please upload a PDF file"
- Oversized files show an inline error: "File must be under 50MB"
- On valid file selection, the 3-step Convex upload flow executes:
  1. Call `generateUploadUrl` mutation to get a short-lived upload URL
  2. POST the file to the upload URL with `Content-Type: application/pdf`
  3. Store the returned `storageId` locally for use in form submission
- A progress indicator shows upload status (uploading → complete)
- The uploaded file name and size are displayed after successful upload
- The author can remove the uploaded file and upload a different one (FR6)

### AC3: Form submission creates a record with SUBMITTED status
**Given** a complete form (title, at least one author, abstract, at least one keyword, PDF uploaded)
**When** the author clicks "Submit Paper"
**Then:**
- The `submissions.create` mutation is called via the `withAuthor` wrapper with:
  - `title`, `authors` array, `abstract`, `keywords` array
  - `pdfStorageId`, `pdfFileName`, `pdfFileSize`
  - Status set to `SUBMITTED`
  - `authorId` set from `ctx.user._id`
  - `createdAt` and `updatedAt` set to `Date.now()`
- A Sonner toast appears with the text "Submission created successfully"
- The author is navigated back to the submissions list
- The new submission appears in the list with a `SUBMITTED` status chip (FR5, FR8)

### AC4: Inline validation with Zod on the frontend
**Given** an incomplete or invalid form
**When** the author interacts with the form
**Then:**
- Validation runs on blur for each field and on submit for the whole form
- Title: required, minimum 10 characters, maximum 300 characters
- Authors: at least one author required, each must have name (required) and affiliation (required)
- Abstract: required, minimum 100 characters, maximum 5000 characters
- Keywords: at least 1, maximum 10 keywords, each keyword 2-50 characters
- PDF: required (must be uploaded before submit)
- Error messages appear inline below the relevant field, matching the exact Zod messages defined in the Technical Notes schema (e.g., "Title must be at least 10 characters")
- The submit button is not disabled — clicking it triggers full form validation and scrolls to the first error
- Zod schema validates on the frontend; Convex `v.*` validators enforce on the backend

### AC5: Backend mutations with proper auth and validators
**Given** the Convex backend
**When** submission-related functions are defined
**Then:**
- `convex/storage.ts` exports a `generateUploadUrl` mutation:
  - Uses `withUser` wrapper (any authenticated user can get an upload URL)
  - `args: {}`, `returns: v.string()`
  - Returns `await ctx.storage.generateUploadUrl()`
- `convex/submissions.ts` exports a `create` mutation:
  - Uses `withAuthor` wrapper
  - `args`: `title` (string), `authors` (array of objects), `abstract` (string), `keywords` (array of strings), `pdfStorageId` (id of `_storage`), `pdfFileName` (string), `pdfFileSize` (number)
  - `returns: v.id('submissions')`
  - Creates the submission record with status `SUBMITTED`, `authorId` from `ctx.user._id`, `createdAt` and `updatedAt` as `Date.now()`
  - Returns the new submission ID
- `convex/submissions.ts` exports a `listByAuthor` query:
  - Uses `withUser` wrapper (not `withAuthor`) so that admin users can also view the submissions list — the `/submit` route allows `['author', 'admin']`
  - `args: {}`, `returns: v.array(...)` with submission shape
  - Queries `submissions` table with `.withIndex('by_authorId')` filtering to `ctx.user._id`
  - Returns submissions ordered by `createdAt` descending
  - Note: admins viewing this page see only their own submissions (if any); admin-wide submission views belong to the editor dashboard
- All functions define both `args` and `returns` validators

### AC6: Submissions list with real data
**Given** an author with submissions
**When** they navigate to `/submit/`
**Then:**
- The page displays a list of their submissions with: title, status (color-coded chip), submission date
- Each submission links to a future detail page (`/submit/$submissionId` — placeholder for story 2.2)
- If no submissions exist, the empty state from story 1.4 is shown with the "New Submission" button
- The list updates in real-time via Convex reactive queries (no page refresh needed)

## Technical Notes

### New files to create

```
convex/
  storage.ts                — generateUploadUrl mutation
  submissions.ts            — create mutation, listByAuthor query

app/features/submissions/
  submission-form.tsx       — form component with Zod validation
  pdf-upload.tsx            — PDF upload widget with drag-and-drop and progress
  submission-list.tsx       — list of author's submissions
  index.ts                  — barrel export
```

### Files to modify

```
app/routes/submit/index.tsx — replace placeholder with real submission list + "New Submission" flow
```

### Implementation sequence

1. **Create `convex/storage.ts`** — `generateUploadUrl` mutation with `withUser` wrapper, both `args` and `returns` validators.

2. **Create `convex/submissions.ts`** — `create` mutation (with `withAuthor`, all field validators, returns submission ID) and `listByAuthor` query (with `withUser` — not `withAuthor` — so admin users can also view the page; uses `by_authorId` index, returns array of submissions).

3. **Create `app/features/submissions/pdf-upload.tsx`** — Upload area component:
   - Drag-and-drop zone with click fallback
   - Client-side validation (PDF type, 50MB max)
   - 3-step Convex upload: `generateUploadUrl` → POST → return storageId
   - Progress indicator (uploading/complete/error states)
   - Display file name + size after upload
   - Remove/replace file capability

4. **Create `app/features/submissions/submission-form.tsx`** — Form component:
   - Zod schema for all fields with inline error messages
   - Title input, dynamic authors list (add/remove), abstract textarea, keyword tags
   - Integrates `PdfUpload` component
   - Pre-fills first author from current user data
   - Submit handler calls `api.submissions.create` mutation
   - Success toast and navigation back to list

5. **Create `app/features/submissions/submission-list.tsx`** — List component:
   - Uses `useQuery(api.submissions.listByAuthor, {})` from `convex/react`
   - Renders submission cards with title, status chip, date
   - Empty state when no submissions
   - "New Submission" button

6. **Create `app/features/submissions/index.ts`** — Barrel export for all submission components.

7. **Update `app/routes/submit/index.tsx`** — Replace placeholder with real `SubmissionList` and `SubmissionForm` flow. Use a boolean state toggle (`showForm`) — clicking "New Submission" sets `showForm = true` and renders `SubmissionForm` in place of the list; on successful submit or cancel, set `showForm = false` to return to the list.

8. **Verify typecheck, lint, and dev server** — `bun run typecheck`, `bun run lint`, `bun dev`.

### Zod schema (frontend validation)

```typescript
import { z } from 'zod'

const authorSchema = z.object({
  name: z.string().min(1, 'Author name is required'),
  affiliation: z.string().min(1, 'Affiliation is required'),
})

export const submissionFormSchema = z.object({
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(300, 'Title must be under 300 characters'),
  authors: z.array(authorSchema)
    .min(1, 'At least one author is required'),
  abstract: z.string()
    .min(100, 'Abstract must be at least 100 characters')
    .max(5000, 'Abstract must be under 5,000 characters'),
  keywords: z.array(
    z.string().min(2, 'Keyword must be at least 2 characters').max(50)
  )
    .min(1, 'At least one keyword is required')
    .max(10, 'Maximum 10 keywords'),
})
```

### Convex mutation signatures

```typescript
// convex/storage.ts
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: withUser(async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  }),
})

// convex/submissions.ts
export const create = mutation({
  args: {
    title: v.string(),
    authors: v.array(v.object({ name: v.string(), affiliation: v.string() })),
    abstract: v.string(),
    keywords: v.array(v.string()),
    pdfStorageId: v.id('_storage'),
    pdfFileName: v.string(),
    pdfFileSize: v.number(),
  },
  returns: v.id('submissions'),
  handler: withAuthor(async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert('submissions', {
      authorId: ctx.user._id,
      title: args.title,
      authors: args.authors,
      abstract: args.abstract,
      keywords: args.keywords,
      status: 'SUBMITTED',
      pdfStorageId: args.pdfStorageId,
      pdfFileName: args.pdfFileName,
      pdfFileSize: args.pdfFileSize,
      createdAt: now,
      updatedAt: now,
    })
  }),
})

export const listByAuthor = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id('submissions'),
    _creationTime: v.number(),
    title: v.string(),
    status: submissionStatusValidator,
    createdAt: v.number(),
  })),
  handler: withUser(async (ctx) => {
    const submissions = await ctx.db
      .query('submissions')
      .withIndex('by_authorId', (q) => q.eq('authorId', ctx.user._id))
      .order('desc')
      .collect()
    return submissions.map((s) => ({
      _id: s._id,
      _creationTime: s._creationTime,
      title: s.title,
      status: s.status,
      createdAt: s.createdAt,
    }))
  }),
})
```

### PDF upload component pattern

```typescript
// 3-step Convex file upload
const uploadUrl = await generateUploadUrl()
const result = await fetch(uploadUrl, {
  method: 'POST',
  headers: { 'Content-Type': file.type },
  body: file,
})
const { storageId } = await result.json()
```

### Status chip colors (from story 1.4 design tokens)

| Status | Color token |
|--------|-------------|
| SUBMITTED | `--color-status-blue` |
| TRIAGING | `--color-status-amber` |
| TRIAGE_COMPLETE | `--color-status-green` |
| DESK_REJECTED | `--color-status-red` |
| UNDER_REVIEW | `--color-status-blue` |
| ACCEPTED | `--color-status-green` |
| REJECTED | `--color-status-red` |
| PUBLISHED | `--color-status-green` |

### shadcn/ui components to use

- `Button` — submit, add author, remove, file upload trigger
- `Input` — title, author name, author affiliation
- `Textarea` — abstract
- `Badge` — status chips, keyword tags
- `Label` — field labels
- `Card` — submission list items (optional)
- `Sonner` / toast — success confirmation after submission

May need to install: `bunx shadcn@latest add sonner badge textarea label card input` (check which are already installed).

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `generateUploadUrl` requires auth but no specific role | Unauthorized users could waste storage | Use `withUser` wrapper (requires any auth) — role check happens at `submissions.create` |
| Large PDF uploads may timeout on slow connections | Poor UX, lost upload progress | Show progress indicator, validate file size client-side (50MB max) |
| Zod and Convex validator shapes may drift | Frontend allows data that backend rejects | Keep Zod schema aligned with Convex args; backend validators are authoritative |
| Dynamic author list state management | Complex form state with add/remove | Use `useFieldArray` pattern with React state; pre-fill from user data |
| Keyword input UX | Tags need custom interaction (enter to add, backspace to remove) | Build simple tag input or use a lightweight tag component |

### Dependencies on this story

- **Story 2.2 (Submission Status Tracking):** Uses the submission records and `listByAuthor` query, adds `/submit/$submissionId` detail route
- **Story 2.3 (PDF Text Extraction & Triage):** Uses `pdfStorageId` to extract text, triggers from `SUBMITTED` status
- **Story 2.4 (Triage Progress Display):** Extends the submission detail view with triage data

### What "done" looks like

- An author can navigate to `/submit/`, see their existing submissions (or empty state), click "New Submission", fill out the form with title, authors, abstract, keywords, and upload a PDF
- The PDF uploads via the 3-step Convex flow with visual progress feedback
- Inline validation catches incomplete/invalid fields with specific error messages on blur
- Submitting the form creates a record with `SUBMITTED` status and the author sees a success confirmation
- The new submission appears in the list with a status chip
- The list updates in real-time via Convex reactive queries
- `convex/submissions.ts` and `convex/storage.ts` exist with proper `withAuthor` (create) / `withUser` (listByAuthor, generateUploadUrl) wrappers and both `args` and `returns` validators
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes
- `bun dev` runs without errors

## Dev Notes

- The `/submit` route layout allows `['author', 'admin']` roles. The `create` mutation uses `withAuthor` (only authors create submissions). The `listByAuthor` query uses `withUser` (so admin users don't get UNAUTHORIZED when viewing the page). The "New Submission" button should only render when the user's role is `author`.
- The status is set directly to `SUBMITTED` (not `DRAFT → SUBMITTED`). The architecture defines `DRAFT → SUBMITTED` but for prototype scope, we skip the draft state. If draft saving is needed later, it can be added.
- The `listByAuthor` query returns a projection (not full documents) to avoid leaking unnecessary fields to the client.
- The abstract textarea should use Newsreader serif font to match how it will appear in the published article, reinforcing the connection between input and output.
- Import conventions: value imports before type imports, separate `import type` statements, `Array<T>` syntax.
- Use `useQuery(api.submissions.listByAuthor, {})` from `convex/react` for the submissions list — this is the standard Convex reactive query pattern used in this codebase (see `app/features/auth/use-current-user.ts` for the established pattern). The route-level Suspense boundary from story 1.4 handles the loading state.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 2 spec | Sprint Agent |
| 2026-02-08 | Fix: standardize mutation name to `submissions.create` (was inconsistent `createSubmission`); fix route ref to `/submit/$submissionId`; replace `useSuspenseQuery` with `useQuery` from `convex/react`; make AC labels/errors/toast testable; make step 7 atomic (state toggle); fix RBAC: `listByAuthor` uses `withUser` not `withAuthor` to avoid UNAUTHORIZED for admin | Sprint Agent |
