# Story 3.4: Reviewer Profile Management and Embedding Generation

## Story

**As an** admin or editor,
**I want** a reviewer pool with expertise profiles and vector embeddings,
**So that** the system can match reviewers to papers intelligently.

## Status

**Epic:** 3 - Editor Dashboard & Reviewer Assignment
**Status:** ready
**Priority:** High (fourth story of Epic 3, delivers FR19)
**Depends on:** Story 1.2 (schema with `reviewerProfiles` table, `by_userId` index, `by_embedding` vector index with 1536 dimensions), Story 1.3 (user management, `users` table, `withAdmin` wrapper), Story 3.3 (editor feature folder pattern, `EDITOR_ROLES` constant, `listEditors` query)

## Context

This story adds reviewer profile management and automatic embedding generation for the reviewer-paper matching system. It provides the data foundation that Story 3.5 (Intelligent Reviewer Matching) depends on.

**What exists today:**
- `convex/schema.ts` — `reviewerProfiles` table with fields: `userId`, `researchAreas`, `publications` (title/venue/year), `embedding` (optional float64 array), `createdAt`, `updatedAt`; indexes: `by_userId`, vector index `by_embedding` (1536 dimensions)
- `convex/users.ts` — `listUsers` (admin-only), `getUserById` (public profile), `listEditors`, `me`, `ensureUser`, `updateRole`, `switchRole`
- `convex/helpers/auth.ts` — `withUser`, `withAdmin`, `withEditor` wrappers
- `convex/helpers/errors.ts` — `notFoundError`, `validationError`, `externalServiceError`, `unauthorizedError`
- `app/routes/admin/route.tsx` — admin layout with auth guard (admin role only)
- `app/routes/admin/index.tsx` — placeholder admin panel with "User management coming soon"
- No `convex/matching.ts` file exists yet (will be created here)
- No `app/features/admin/` feature folder exists yet (will be created here)

**What this story builds:**
1. A new Convex file `convex/matching.ts` with `"use node";` directive containing:
   - `createOrUpdateProfile` mutation — creates/updates a reviewer profile (admin/editor-gated)
   - `getProfileByUserId` query — fetches a reviewer profile by user ID (editor-gated)
   - `listProfiles` query — lists all reviewer profiles with user details (editor-gated)
   - `listReviewerUsers` query — lists users with `reviewer` role (editor-gated, used by the profile form's user selector)
   - `generateEmbedding` internalAction — generates a vector embedding via OpenAI text-embedding-3-large and stores it
   - `saveEmbedding` internalMutation — writes the embedding to the reviewer profile document
2. A new `app/features/admin/` feature folder with:
   - `reviewer-pool.tsx` — main page component listing all reviewer profiles in a table
   - `reviewer-profile-form.tsx` — form for creating/editing a reviewer profile
   - `index.ts` — barrel exports
3. Updated `app/routes/admin/index.tsx` — replaces placeholder with the reviewer pool management UI

**Key architectural decisions:**

- **File placement:** `convex/matching.ts` is the home for all reviewer matching and embedding logic per the architecture spec. This file uses `"use node";` because it calls the OpenAI API. The file contains both the profile management mutations/queries AND the embedding generation action, since they are tightly coupled.
- **Embedding model:** OpenAI `text-embedding-3-large` per architecture spec. The schema defines 1536 dimensions for the vector index. The embedding input is a concatenation of research areas and publication titles, creating a rich text representation of the reviewer's expertise.
- **Deferred embedding generation:** When a profile is created or updated, the mutation schedules `generateEmbedding` via `ctx.scheduler.runAfter(0, ...)`. This keeps the mutation fast and handles the async OpenAI call in an Action context. The embedding is written back via `saveEmbedding` internalMutation.
- **Admin/editor access:** Profile management mutations require admin or editor_in_chief role (per the epic spec: "admin or editor" can manage the reviewer pool). All editor-level roles (editor_in_chief, action_editor, admin) can read profiles.
- **Route:** The reviewer pool is viewable and manageable from `/admin/` per the epic spec. The admin route currently has an auth guard for admin role only — this story updates the route guard's `ALLOWED_ROLES` to include `editor_in_chief` so editors can also manage the reviewer pool (per the epic spec: "admin or editor").
- **API key:** The OpenAI API key is stored in the Convex environment variable `OPENAI_API_KEY`. The action validates it exists before calling.
- **Error handling:** OpenAI API failures are caught, logged to console, and the profile is left without an embedding (graceful degradation). The profile is still usable — it just won't appear in vector search results until embedding generation succeeds.
- **Schema already correct:** The `reviewerProfiles` table schema already matches what we need — no schema changes required.

**Key architectural references:**
- Architecture: `convex/matching.ts` — `"use node";` Actions + internalMutations for embeddings
- Schema: `reviewerProfiles` table with `by_userId` index, `by_embedding` vector index (1536 dimensions)
- Architecture: reviewer matching uses OpenAI text-embedding-3-large
- Architecture: external API response sanitization before writing to client-visible tables
- Architecture: internal functions for all server-to-server calls
- FR19: System maintains reviewer profiles with expertise areas, research interests, and expertise matching data

## Acceptance Criteria

### AC1: Reviewer profile creation
**Given** an authenticated admin or editor_in_chief
**When** they create a reviewer profile via the admin UI
**Then:**
- The `createOrUpdateProfile` mutation creates a new `reviewerProfiles` document
- The profile stores: `userId` (must be an existing user with `reviewer` role), `researchAreas` (1-10 string entries), `publications` (3+ entries with title, venue, year)
- The mutation validates that the target user exists and has the `reviewer` role
- The mutation validates minimum 3 publications and minimum 1 research area
- On success, the profile appears in the reviewer pool list
- The mutation defines both `args` and `returns` validators

### AC2: Reviewer profile update
**Given** an existing reviewer profile
**When** the admin edits it via the admin UI
**Then:**
- The `createOrUpdateProfile` mutation uses upsert semantics: if a profile exists for the `userId`, it updates it; if not, it creates a new one
- Research areas and publications are replaced entirely (not merged)
- The `updatedAt` timestamp is set to `Date.now()`
- After update, embedding generation is automatically triggered

### AC3: Automatic embedding generation
**Given** a reviewer profile is created or updated
**When** the mutation completes
**Then:**
- The mutation schedules `generateEmbedding` via `ctx.scheduler.runAfter(0, internal.matching.generateEmbedding, { profileId })`
- The `generateEmbedding` internalAction:
  - Reads the profile via `ctx.runQuery(internal.matching.getProfileInternal, { profileId })`
  - Concatenates research areas and publication titles into a single text string
  - Calls OpenAI text-embedding-3-large with **explicit `dimensions: 1536`** parameter to match the schema's vector index configuration (default is 3072 — must be overridden)
  - Writes the embedding via `ctx.runMutation(internal.matching.saveEmbedding, { profileId, embedding, updatedAt: profile.updatedAt })` (passes `updatedAt` for stale-check)
- The file `convex/matching.ts` includes `"use node";` as the **first line** of the file (before all imports), required because the `openai` package needs the Node.js runtime
- `getProfileInternal` (internalQuery) and `saveEmbedding` (internalMutation) are **internal functions** accessible only via `internal.matching.*` — they are NOT exposed to client code
- All Convex functions in this file (`createOrUpdateProfile`, `getProfileByUserId`, `listProfiles`, `listReviewerUsers`, `generateEmbedding`, `saveEmbedding`, `getProfileInternal`) define both `args` and `returns` validators
- The action sanitizes any API errors before logging — no raw OpenAI error messages written to client-visible tables
- If the OpenAI call fails, the profile remains without an embedding (graceful degradation)

### AC4: Reviewer pool list view
**Given** an admin navigating to `/admin/`
**When** the page loads
**Then:**
- A table displays all reviewer profiles with columns: reviewer name, affiliation, research areas (as tags), publication count, embedding status (generated/pending)
- Each row is clickable to open the edit form
- A "New Profile" button opens the creation form
- The page fetches data via `useQuery(api.matching.listProfiles)`
- Empty state: "No reviewer profiles yet. Add profiles to enable intelligent reviewer matching."

### AC5: Profile form with publications
**Given** the profile form (create or edit mode)
**When** it renders
**Then:**
- Fields: user selector (dropdown of users with `reviewer` role), research areas (tag input, 1-10 items), publications list (3+ entries, each with title, venue, year fields)
- "Add publication" button appends a new empty row
- "Remove" button on each publication row (minimum 3 enforced — disabled when at 3)
- On submit: calls `createOrUpdateProfile` mutation
- In edit mode: form is pre-populated with existing data
- User selector shows users from `useQuery(api.matching.listReviewerUsers)` (editor-gated query returning only users with `reviewer` role)
- Validation: at least 1 research area, at least 3 publications, each publication must have title and venue

### AC6: Profile management restricted to admin/editor
**Given** the reviewer pool management system
**Then** the following access rules apply:

**Route-level access:**
- The `/admin/` route guard's `ALLOWED_ROLES` is updated from `['admin']` to `['admin', 'editor_in_chief']` so editors can access the reviewer pool management page via the UI
- Users without `admin` or `editor_in_chief` role are redirected away from `/admin/`

**Write access (mutations):**
- The `createOrUpdateProfile` mutation throws UNAUTHORIZED for any user without `admin` or `editor_in_chief` role (server-side defense-in-depth)
- `action_editor` users cannot create or modify profiles

**Read access (queries):**
- The `listProfiles`, `getProfileByUserId`, and `listReviewerUsers` queries restrict to `EDITOR_ROLES` (`editor_in_chief`, `action_editor`, `admin`)
- `action_editor` users can read profiles programmatically (needed by Story 3.5 matching) but cannot access the `/admin/` route UI

### AC7: Embedding status visibility
**Given** the reviewer pool list
**When** a profile's embedding status is shown
**Then:**
- If `embedding` field exists and is non-empty: green badge "Embedding ready"
- If `embedding` field is undefined/null: amber badge "Pending"
- This gives admins visibility into which reviewers are ready for matching

## Technical Notes

### New files to create

```
convex/matching.ts                    — "use node"; profile management + embedding generation
app/features/admin/reviewer-pool.tsx  — reviewer pool list page
app/features/admin/reviewer-profile-form.tsx — profile create/edit form
app/features/admin/index.ts           — barrel exports
```

### Files to modify

```
app/routes/admin/route.tsx            — update ALLOWED_ROLES to include 'editor_in_chief'
app/routes/admin/index.tsx            — replace placeholder with ReviewerPool component
```

### Implementation sequence

1. **Create `convex/matching.ts`** with `"use node";` directive:

   **Internal helpers:**
   - `getProfileInternal` internalQuery — fetches profile by ID (for the embedding action)
   - `saveEmbedding` internalMutation — writes embedding array to profile document; accepts `updatedAt` timestamp from the profile read and skips the write if the profile's current `updatedAt` is newer (stale-check to prevent concurrent job overwrites)

   **Public functions:**
   - `createOrUpdateProfile` mutation:
     - Args: `userId: v.id('users')`, `researchAreas: v.array(v.string())`, `publications: v.array(v.object({ title: v.string(), venue: v.string(), year: v.number() }))`
     - Uses `withUser` + manual role check for `admin` or `editor_in_chief`
     - Validates target user exists and has `reviewer` role
     - Validates min 1 research area, max 10, min 3 publications
     - Upserts: checks `by_userId` index; if exists, patches; if not, inserts
     - Schedules `generateEmbedding` via `ctx.scheduler.runAfter(0, ...)`
     - Returns the profile ID

   - `getProfileByUserId` query:
     - Args: `userId: v.id('users')`
     - Uses `withUser` + `EDITOR_ROLES` check
     - Returns profile or null

   - `listProfiles` query:
     - Args: none
     - Uses `withUser` + `EDITOR_ROLES` check
     - Collects all `reviewerProfiles`, resolves each `userId` to user name/affiliation
     - Returns enriched profile list

   - `listReviewerUsers` query:
     - Args: none
     - Uses `withUser` + `EDITOR_ROLES` check
     - Returns all users with `reviewer` role (id, name, affiliation)
     - Used by the profile form's user selector dropdown (replaces admin-only `listUsers`)

   - `generateEmbedding` internalAction:
     - Args: `profileId: v.id('reviewerProfiles')`
     - Reads profile via `ctx.runQuery(internal.matching.getProfileInternal, ...)`
     - Builds text: `"Research areas: ${areas.join(', ')}. Publications: ${titles.join('; ')}"`
     - Calls OpenAI embeddings API (text-embedding-3-large, 1536 dimensions)
     - On success: calls `ctx.runMutation(internal.matching.saveEmbedding, { profileId, embedding, updatedAt: profile.updatedAt })`
     - On failure: logs error, does not throw (profile remains without embedding)

   ```typescript
   "use node";

   import { v } from 'convex/values'
   import OpenAI from 'openai'

   import {
     action,
     internalAction,
     internalMutation,
     internalQuery,
     mutation,
     query,
   } from './_generated/server'
   import { internal } from './_generated/api'
   import { withUser } from './helpers/auth'
   import {
     notFoundError,
     unauthorizedError,
     validationError,
   } from './helpers/errors'

   import type { Doc, Id } from './_generated/dataModel'
   import type { MutationCtx, QueryCtx } from './_generated/server'
   ```

2. **Update `app/routes/admin/route.tsx`** — change `ALLOWED_ROLES` from `['admin']` to `['admin', 'editor_in_chief']` so editor_in_chief users can access the reviewer pool management page. This must be done before the UI components are added so the route is accessible for testing.

3. **Create `app/features/admin/reviewer-pool.tsx`**:
   - Uses `useQuery(api.matching.listProfiles)` to fetch all profiles
   - Renders a table with columns: Name, Affiliation, Research Areas, Publications, Embedding Status
   - Research areas rendered as `Badge` components
   - Embedding status: green/amber `Badge`
   - "New Profile" button in header
   - Each row clickable → opens form in edit mode (via local state, not routing)
   - Uses shadcn `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, `TableHead`
   - Uses shadcn `Badge`, `Button`
   - Uses lucide icons: `PlusIcon`, `UserIcon`, `CheckCircle2`, `Clock`

   ```tsx
   // Component structure:
   // <div className="space-y-6">
   //   <div className="flex items-center justify-between">
   //     <div>
   //       <h2>Reviewer Pool</h2>
   //       <p>Manage reviewer profiles for intelligent paper matching.</p>
   //     </div>
   //     <Button onClick={() => setEditing('new')}><PlusIcon /> New Profile</Button>
   //   </div>
   //
   //   {editing ? <ReviewerProfileForm ... /> : null}
   //
   //   <Table>
   //     ... table rows with profile data
   //   </Table>
   // </div>
   ```

4. **Create `app/features/admin/reviewer-profile-form.tsx`**:
   - Props: `onClose: () => void`, `existingProfile?: ProfileData`, `userId?: Id<'users'>`
   - Uses `useQuery(api.matching.listReviewerUsers)` to get reviewer users for dropdown
   - Research areas: simple tag input with add/remove (text input + "Add" button + removable tags)
   - Publications: dynamic list of {title, venue, year} rows with add/remove
   - On submit: calls `useMutation(api.matching.createOrUpdateProfile)`
   - Renders in a card overlay (not dialog — simpler for form-heavy content)
   - Validation: inline error messages for empty fields, minimum counts

   ```tsx
   // Form structure:
   // <Card className="border-2 border-primary/20">
   //   <CardHeader>Create Reviewer Profile / Edit Reviewer Profile</CardHeader>
   //   <CardContent>
   //     <Select> user dropdown </Select>
   //     <div> research areas tag input </div>
   //     <div> publications list with add/remove </div>
   //   </CardContent>
   //   <CardFooter>
   //     <Button variant="outline" onClick={onClose}>Cancel</Button>
   //     <Button onClick={handleSubmit}>Save Profile</Button>
   //   </CardFooter>
   // </Card>
   ```

5. **Create `app/features/admin/index.ts`**:
   ```typescript
   export { ReviewerPool } from './reviewer-pool'
   export { ReviewerProfileForm } from './reviewer-profile-form'
   ```

6. **Update `app/routes/admin/index.tsx`**:
   - Replace the placeholder content with the `ReviewerPool` component
   - Import from `~/features/admin`

7. **Install OpenAI package** (if not already installed):
   - `bun add openai`

8. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`, `useMutation`
- Import from `~/components/ui/` for shadcn components
- Import from relative paths for sibling feature components

### shadcn/ui components to use

- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, `TableHead` — reviewer pool table (may need to install: `bunx --bun shadcn@latest add table`)
- `Badge` — research area tags, embedding status (already installed)
- `Button` — form actions, add publication (already installed)
- `Card`, `CardContent`, `CardFooter`, `CardHeader` — profile form container (already installed)
- `Input` — text fields (already installed)
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` — user dropdown (already installed)
- `Label` — form labels (already installed)
- lucide-react icons: `PlusIcon`, `UserIcon`, `CheckCircle2`, `Clock`, `XIcon`, `Trash2Icon`

### Component data flow

```
AdminPanel (routes/admin/index.tsx)
  └─ ReviewerPool (features/admin/reviewer-pool.tsx)
       ├─ useQuery(api.matching.listProfiles)  — all profiles with user details
       ├─ Table display with embedding status
       ├─ "New Profile" button → setEditing('new')
       ├─ Row click → setEditing(profileData)
       └─ ReviewerProfileForm (features/admin/reviewer-profile-form.tsx)
            ├─ useQuery(api.matching.listReviewerUsers)  — reviewer users for dropdown
            ├─ useMutation(api.matching.createOrUpdateProfile)
            ├─ Research areas tag input
            ├─ Publications dynamic list
            └─ On submit → mutation → onClose()
```

### Embedding generation flow

```
createOrUpdateProfile mutation
  ├─ Upsert reviewerProfiles document
  └─ ctx.scheduler.runAfter(0, internal.matching.generateEmbedding, { profileId })
       │
       ▼
generateEmbedding internalAction
  ├─ ctx.runQuery(internal.matching.getProfileInternal, { profileId })
  ├─ Build text from research areas + publication titles
  ├─ OpenAI text-embedding-3-large API call
  └─ ctx.runMutation(internal.matching.saveEmbedding, { profileId, embedding, updatedAt: profile.updatedAt })
       │
       ▼
saveEmbedding internalMutation
  ├─ Read current profile.updatedAt; if newer than passed-in updatedAt, skip write (stale guard)
  └─ ctx.db.patch(profileId, { embedding, updatedAt: Date.now() })
```

### Convex environment variable

The following environment variable must be set in the Convex Dashboard:
- `OPENAI_API_KEY` — OpenAI API key for text-embedding-3-large

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenAI API key not configured | Embedding generation fails silently | Action checks for `OPENAI_API_KEY` and logs a clear warning; profile still created without embedding |
| OpenAI API rate limiting | Embedding generation delayed | Single embedding per profile creation; batch operations not needed at prototype scale |
| 1536 dimensions mismatch | Vector search won't work | Use `text-embedding-3-large` which produces 3072 dims by default; explicitly request `dimensions: 1536` in the API call to match schema |
| `openai` package not installed | Import error | Step 6 installs it; package.json will be updated |
| `Table` shadcn component not installed | Import error | Step pre-checks and installs if needed |
| User with non-reviewer role assigned to profile | Data inconsistency | Server-side validation checks target user's role is `reviewer` |
| Large number of publications in embedding text | Token limit | At prototype scale (3-10 pubs per reviewer), well within OpenAI's 8191 token limit for embedding input |
| Stale embedding overwrite from concurrent deferred jobs | Rapid profile edits trigger multiple `generateEmbedding` jobs; a slow earlier job could overwrite a newer embedding | `saveEmbedding` checks the profile's `updatedAt` before writing — if the profile has been updated since the embedding job started, skip the write (compare `updatedAt` from the profile read inside `generateEmbedding` with the current `updatedAt` at save time) |

### Dependencies on this story

- **Story 3.5 (Intelligent Reviewer Matching):** Directly depends on reviewer profiles with embeddings. Uses `ctx.vectorSearch('reviewerProfiles', 'by_embedding', ...)` to find matching reviewers. Will also add `findMatches` action to `convex/matching.ts`.
- **Story 7.2 (Seed Reviewer Pool):** Will use `createOrUpdateProfile` or direct inserts to seed 5+ reviewer profiles with research areas and publications.

### What "done" looks like

- `convex/matching.ts` exists with `"use node";` as the **first line** (before imports) and contains: `createOrUpdateProfile` mutation, `getProfileByUserId` query, `listProfiles` query, `listReviewerUsers` query, `generateEmbedding` internalAction, `saveEmbedding` internalMutation, `getProfileInternal` internalQuery
- All seven Convex functions define both `args` and `returns` validators
- `getProfileInternal` and `saveEmbedding` are internal functions (not exposed to client)
- Profile creation validates: target user exists, target user has `reviewer` role, minimum 1 research area, minimum 3 publications
- Embedding generation is triggered automatically on profile create/update via deferred scheduling
- OpenAI API call explicitly passes `dimensions: 1536` to match the schema's vector index
- The `/admin/` route guard is updated to allow `admin` and `editor_in_chief` roles
- The `/admin/` route shows a reviewer pool table with profile data and embedding status
- The form allows creating and editing reviewer profiles with research areas and publications
- Access is restricted: mutations require admin or editor_in_chief; queries require EDITOR_ROLES
- `openai` package is installed as a dependency
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The schema already defines `reviewerProfiles` with the correct shape including optional `embedding: v.array(v.float64())` and vector index `by_embedding` with 1536 dimensions. No schema migration needed.
- `text-embedding-3-large` produces 3072 dimensions by default. We must explicitly pass `dimensions: 1536` in the API call to match the schema's vector index configuration.
- The `"use node";` directive is required at the file level for `convex/matching.ts` because it imports the `openai` package which requires Node.js APIs.
- The `openai` package should be imported as `import OpenAI from 'openai'` (default export).
- The `saveEmbedding` internalMutation must accept `embedding: v.array(v.float64())` to match the schema type.
- For the embedding text input, concatenating research areas and publication titles creates a semantically meaningful representation for the embedding model. Format: `"Research areas: corrigibility, agent foundations, decision theory. Publications: Corrigibility as a Safety Problem; On the Formal Foundations of Agent Alignment; Decision Theory for Autonomous Systems"`
- The `listProfiles` query resolves user details (name, affiliation) by doing `ctx.db.get` lookups on each profile's `userId`. At prototype scale (5-50 reviewers), this is efficient.
- The admin route currently has `ALLOWED_ROLES = ['admin']`. This story updates it to `['admin', 'editor_in_chief']` so editors can access the reviewer pool management page. The Convex mutations/queries add their own server-side checks as defense-in-depth.
- The existing `api.users.listUsers` is admin-only (`withAdmin` wrapper). This story adds `api.matching.listReviewerUsers` (editor-gated via `EDITOR_ROLES` check) so editor_in_chief users can populate the user selector in the profile form.
- Future story 3.5 will add `findMatches` action to `convex/matching.ts` that uses `ctx.vectorSearch` against the `by_embedding` index.
- The form uses local React state for the dynamic publications list and research areas — no need for a form library since Convex mutations handle validation.
- The `Card` wrapper for the form provides visual separation when it appears inline above the table. Using a dialog would be too constrained for the form's length.
- The `saveEmbedding` internalMutation includes a stale-check: it compares the passed-in `updatedAt` (captured when the embedding job read the profile) against the current profile's `updatedAt`. If the profile was updated after the embedding job started, the write is skipped to prevent overwriting a newer embedding.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 3 spec | Sprint Agent |
| 2026-02-08 | Validator fixes: explicit dimensions:1536 in AC3, all functions need validators, "use node" as first line, internal function enforcement, admin route guard updated for editor_in_chief | Sprint Agent |
| 2026-02-08 | Fix 5 issues: (1) Replace admin-only `listUsers` with editor-gated `listReviewerUsers` in matching.ts; (2) Clarify AC6 read vs write access separation; (3) Add explicit admin/route.tsx update step in implementation sequence; (4) Add `listReviewerUsers` backend query task; (5) Add stale embedding overwrite risk/mitigation with `updatedAt` guard in `saveEmbedding` | Sprint Agent |
