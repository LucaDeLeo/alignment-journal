# Story 4.4: Semi-Confidential Threaded Discussion

## Story

**As a** reviewer, author, or editor,
**I want** to participate in threaded discussion on a submission where identity visibility follows the semi-confidential rules,
**So that** the review conversation is productive while maintaining appropriate confidentiality.

## Status

**Epic:** 4 - Review Process & Semi-Confidential Discussion
**Status:** ready
**Priority:** High (delivers FR30, FR31, FR32, FR33, FR34, FR35 — core semi-confidential discussion mechanics)
**Depends on:** Story 4.3 (structured review form, review submission/locking, `reviews` table with sections/status), Story 4.2 (split-view workspace, `ReviewPanel` with Discussion tab placeholder), Story 4.1 (reviewer invitation acceptance, reviewer role, review records), Story 3.7 (editorial decisions — ACCEPTED/REJECTED status on submissions, `publicConversation` field on submissions schema), Story 1.2 (schema with `discussions` table, `submissions.publicConversation` field)

## Context

This story replaces the placeholder "Discussion will be available after you submit your review" content in the Discussion tab of the review panel with a fully functional semi-confidential threaded discussion. It also builds the backend `convex/discussions.ts` module (which does not yet exist) and the frontend components for rendering, composing, editing, and retracting discussion messages with role-based identity gating.

**What exists today:**
- `convex/schema.ts` — `discussions` table with `submissionId`, `authorId` (the message author), `parentId` (optional, for threading), `content`, `isRetracted`, `editableUntil`, `createdAt`, `updatedAt`, index `by_submissionId`
- `convex/schema.ts` — `submissions` table with `publicConversation: v.optional(v.boolean())` field, `status` field with ACCEPTED/REJECTED states
- `app/features/review/review-panel.tsx` — tabbed panel with placeholder card in the Discussion tab: "Discussion will be available after you submit your review"
- `app/routes/review/$submissionId.tsx` — workspace route rendering `<ReviewPanel />` with review data props (no discussion data yet)
- `convex/helpers/auth.ts` — `withUser`, `withReviewer`, `withRole` HOF wrappers
- `convex/helpers/errors.ts` — structured `ConvexError` helpers including `validationError`, `notFoundError`, `unauthorizedError`
- `convex/helpers/roles.ts` — `EDITOR_ROLES` (editor_in_chief, action_editor, admin)
- `convex/reviews.ts` — `getSubmissionForReviewer` query returning review + submission data
- `app/features/review/confidentiality-badge.tsx` — existing green "Hidden from authors" badge
- `app/components/ui/avatar.tsx` — Avatar component (already installed, assumed from shadcn/ui)
- `app/components/ui/textarea.tsx` — Textarea component (already installed)
- `app/components/ui/badge.tsx` — Badge component (already installed)
- `app/components/ui/button.tsx` — Button component (already installed)
- `app/components/ui/separator.tsx` — Separator component (already installed)
- `app/components/ui/scroll-area.tsx` — ScrollArea component (already installed)

**What this story builds:**
1. New `convex/discussions.ts` module — all discussion queries and mutations
2. New `listBySubmission` query — fetches all discussion messages for a submission, enriched with author display info gated by viewer role
3. New `postMessage` mutation — creates a new discussion message (top-level or reply) with 5-minute edit window
4. New `editMessage` mutation — edits a message within the 5-minute edit window
5. New `retractMessage` mutation — retracts a message (hides content, shows placeholder) after the edit window
6. New `togglePublicConversation` mutation — allows author of a rejected submission to make the conversation public (FR35)
7. New `DiscussionThread` component in `app/features/review/discussion-thread.tsx` — the main threaded discussion container
8. New `DiscussionMessage` component in `app/features/review/discussion-message.tsx` — individual message with role badge, identity gating, threading
9. New `DiscussionComposer` component in `app/features/review/discussion-composer.tsx` — message input for new comments and replies
10. Updated `ReviewPanel` to render `DiscussionThread` in the Discussion tab instead of placeholder
11. Updated workspace route to pass viewer role info to the panel
12. Updated `app/features/review/index.ts` barrel exports

**Key architectural decisions:**

- **Identity gating at the query layer:** The `listBySubmission` query computes display names server-side based on the viewer's role and the submission status. Authors see "Reviewer 1" / "Reviewer 2" (consistent pseudonyms per submission), reviewers and editors see real names. After ACCEPTED, authors see real reviewer names by default. After REJECTED, reviewer identities remain permanently confidential to authors. This means the confidentiality logic is enforced server-side, not client-side — the frontend never receives real reviewer names when it shouldn't.

- **Consistent pseudonym assignment:** Reviewer pseudonyms ("Reviewer 1", "Reviewer 2", etc.) are assigned in the order reviewers first appear in the discussion. The query sorts all messages, identifies unique reviewer IDs, and assigns numbers in order of first appearance. This is deterministic per submission.

- **5-minute Tier 2 edit window:** When a message is posted, `editableUntil` is set to `Date.now() + 5 * 60 * 1000`. The `editMessage` mutation checks this deadline. After the window expires, the user can only retract (not edit). The `retractMessage` mutation sets `isRetracted: true` and replaces content with a placeholder. Retracted messages show "[This message has been retracted]" in the UI.

- **Threading with `parentId`:** Top-level messages have `parentId: undefined`. Replies have `parentId` pointing to the parent message. The UI renders replies indented under their parent with a left border. Only one level of nesting (no reply-to-reply nesting in the UI, though the schema allows it).

- **Public conversation toggle (FR35):** Rejected submissions show a toggle for the author to make the conversation public via `submissions.publicConversation`. This is a simple boolean field already in the schema. The mutation only allows the submission author when status is REJECTED.

- **Real-time updates:** Discussion messages use Convex reactive queries. New messages appear automatically. A subtle highlight background (accent with low opacity) fades after 3 seconds via CSS animation for newly appeared messages.

- **Participants:** Discussion is open to: the submission author, all assigned reviewers (with submitted/locked reviews — reviewers must submit their review before joining the discussion), and all editor-level roles (editor_in_chief, action_editor, admin — any editor can participate in any discussion). The `postMessage` mutation validates the user is a participant.

- **Viewer role derivation:** The `listBySubmission` query determines the viewer's effective discussion role server-side using this logic: if `ctx.user._id === submission.authorId` → viewer is "author". Else if `EDITOR_ROLES.includes(ctx.user.role)` → viewer is "editor". Else if user has a `reviews` record for this submission → viewer is "reviewer". Otherwise → unauthorized (return empty result). This derivation happens in the query, not on the frontend. The frontend receives `isAuthor`, `viewerRole`, and the appropriately gated messages.

- **Access from reviewer workspace:** The primary entry point is the reviewer workspace at `/review/$submissionId`. Reviewers see the Discussion tab in their review panel. The `DiscussionThread` component loads its own data via `useQuery(api.discussions.listBySubmission)` — it does NOT depend on ReviewPanel props for discussion data. This means the component is self-contained and can also be embedded in editor/author views in future stories. For this story, the reviewer workspace is the only entry point.

- **`isRetracted` field handling:** The schema defines `isRetracted: v.optional(v.boolean())`. New messages explicitly set `isRetracted: false` at insert time. Retraction checks use `message.isRetracted === true` (handles both `undefined` and `false` as "not retracted"). The `retractMessage` mutation patches to `isRetracted: true`.

**Key architectural references:**
- UX spec: `ThreadedDiscussion` — comment list with `role="log"`, `aria-live="polite"`, anonymous/named attribution, nested replies with left border, collapsible old messages
- UX spec: Tier 2 edit window — 5 minutes for discussion comments, "Delete" becomes "Retract" after window
- FR30: Authors and reviewers can participate in threaded discussion per submission
- FR31: Reviewer identities hidden from authors during review
- FR32: Reviewer identities visible to editors and other reviewers at all times
- FR33: On acceptance, reviewer identities revealed by default
- FR34: On rejection, reviewer identities remain permanently confidential
- FR35: On rejection, authors can opt to make review conversation public
- Architecture: `convex/discussions.ts` — threaded discussion queries + mutations

## Acceptance Criteria

### AC1: Threaded discussion with chronological messages
**Given** a submission with at least one submitted review
**When** the "Discussion" tab renders in the review panel
**Then:**
- Messages are displayed chronologically (oldest first) in a scrollable container
- Each message shows: author attribution (name or pseudonym), role badge ("Author" / "Reviewer" / "Editor"), relative timestamp (e.g., "2 minutes ago"), and message content
- Message content uses Newsreader serif font (`font-serif text-base leading-[1.6]`)
- Top-level messages display with full width
- Replies are indented with a `border-l-2 border-muted ml-6 pl-4` left border visual — replies to replies render at the same indent level (one level of nesting max in UI)
- Each message has a reply action button
- The comment list uses `role="log"` with `aria-live="polite"` for accessibility
- A composer input appears at the bottom of the thread for new messages
- The Discussion tab shows the placeholder message when the viewer is a reviewer whose review status is `assigned` or `in_progress` (review not yet submitted)
- For editors and authors (who don't have a review), the Discussion tab is available when at least one review has been submitted for the submission

### AC2: Semi-confidential identity gating — author view
**Given** an author viewing the discussion for their own submission
**When** messages from reviewers render
**Then:**
- Reviewer names are replaced with consistent pseudonyms: "Reviewer 1", "Reviewer 2", etc.
- Reviewer avatars show generic anonymous placeholders (initials derived from pseudonym, e.g., "R1", "R2")
- Editor names are visible (not anonymized)
- The author's own name is visible
- Pseudonym assignment is consistent: the same reviewer always appears as the same "Reviewer N" within a submission

### AC3: Semi-confidential identity gating — reviewer view
**Given** a reviewer viewing the discussion
**When** messages render
**Then:**
- Other reviewer real names are visible
- Author real names are visible
- Editor real names are visible
- All participants' role badges are visible

### AC4: Semi-confidential identity gating — editor view
**Given** an editor (editor_in_chief, action_editor, or admin) viewing the discussion
**When** messages render
**Then:**
- All participant real names are visible across all roles
- Role badges are visible for all participants

### AC5: Identity reveal on acceptance (FR33)
**Given** an ACCEPTED submission
**When** the author views the discussion
**Then:**
- Reviewer real names are now visible (identities revealed by default on acceptance)
- The display transitions from pseudonyms to real names
- A note appears: "Reviewer identities have been revealed following acceptance"

### AC6: Permanent confidentiality on rejection (FR34)
**Given** a REJECTED submission
**When** the author views the discussion
**Then:**
- Reviewer identities remain as pseudonyms ("Reviewer 1", "Reviewer 2")
- Reviewer identities are never revealed to the author

### AC7: Public conversation toggle for rejected submissions (FR35)
**Given** a REJECTED submission
**When** the author views the discussion
**Then:**
- A toggle/button appears: "Make this review conversation public"
- Clicking it calls `togglePublicConversation` mutation which sets `submissions.publicConversation` to `true`
- A confirmation dialog appears before toggling: "Making this conversation public will allow anyone to read the review discussion. Reviewer identities will remain confidential. This cannot be undone."
- After toggling, the button changes to "This conversation is public" (disabled state)
- The mutation only allows the submission's author to toggle, and only when status is REJECTED
- The mutation validates `publicConversation` is not already `true` (idempotent)

### AC8: Posting new discussion messages
**Given** a participant (author, reviewer with submitted/locked review, or editor) in the discussion
**When** they type a message and click "Post" (or press Cmd+Enter)
**Then:**
- A `postMessage` mutation is called with `submissionId`, `content`, and optional `parentId` (for replies)
- The mutation validates the user is a participant (author of the submission, reviewer with a review record, or editor-level role)
- The mutation sets `editableUntil` to `Date.now() + 5 * 60 * 1000`
- The mutation sets `isRetracted: false`
- The mutation uses `withUser` wrapper for auth
- The mutation defines both `args` and `returns` validators
- The new message appears in real-time for all participants via reactive query
- New messages have a subtle highlight background (`bg-accent/10`) that fades after 3 seconds via CSS animation
- The composer clears after successful post
- The composer uses Newsreader font to match message styling
- The composer has a character limit of 5000 characters with a count indicator when > 4000 characters
- The "Post" button is disabled when content exceeds 5000 characters (in addition to when empty)
- The character counter turns red when > 5000 characters

### AC9: 5-minute edit window
**Given** a posted discussion message within 5 minutes of posting
**When** the message author views it
**Then:**
- An "Edit" button appears on the message
- Clicking "Edit" switches the message to inline edit mode: the message content becomes an editable textarea with "Save" and "Cancel" buttons
- The `editMessage` mutation updates the content and sets `updatedAt`
- The mutation validates `Date.now() < editableUntil`
- After the 5-minute window, the "Edit" button disappears
- The edit window remaining time is not displayed (unlike the review 15-minute window)

### AC10: Message retraction after edit window
**Given** a posted discussion message after the 5-minute edit window
**When** the message author views it
**Then:**
- A "Retract" button appears (replacing "Edit" which is no longer available)
- Clicking "Retract" shows a confirmation: "Retract this message? The content will be hidden and replaced with a placeholder."
- The `retractMessage` mutation sets `isRetracted: true` on the message
- Retracted messages display as: "[This message has been retracted]" in muted italic text, with the original author attribution and timestamp still visible
- Retracted messages cannot be un-retracted

### AC11: New message real-time highlight
**Given** a discussion thread open
**When** a new message arrives from another participant via the reactive query
**Then:**
- The new message appears with a subtle `bg-accent/10` highlight background
- The highlight fades out over 3 seconds via CSS `animation: fadeHighlight 3s ease-out forwards`
- The scroll position adjusts to show the new message if the user was already scrolled near the bottom (within 100px of the bottom). If the user has scrolled up mid-thread, do NOT auto-scroll — instead, show a small "New messages" indicator at the bottom of the visible area that scrolls to bottom when clicked

### AC12: Composer input
**Given** the discussion thread
**When** a participant is able to post
**Then:**
- A composer appears at the bottom with a Textarea, "Post" button, and optional "Reply to [name]" indicator when replying
- Cmd+Enter (or Ctrl+Enter) submits the message
- The "Post" button is disabled when the textarea is empty
- When replying to a message, the composer shows "Replying to [display name]" with a cancel (X) button to clear the reply context
- The composer has `aria-label="Post a discussion message"`

## Technical Notes

### No schema changes required

The `discussions` table already has all needed fields: `submissionId`, `authorId`, `parentId`, `content`, `isRetracted`, `editableUntil`, `createdAt`, `updatedAt`. The `submissions` table already has `publicConversation: v.optional(v.boolean())`.

### New `convex/discussions.ts` module

Create a new file (default runtime, no `"use node"`):

1. **`listBySubmission` query** (uses `withUser`):
   - Args: `{ submissionId: v.id('submissions') }`
   - Viewer role derivation (server-side, in this order):
     1. If `ctx.user._id === submission.authorId` → viewer is "author"
     2. Else if `EDITOR_ROLES.includes(ctx.user.role)` → viewer is "editor"
     3. Else if user has a `reviews` record for this submission (via `by_submissionId_reviewerId` index) → viewer is "reviewer"
     4. Otherwise → return null (unauthorized viewer)
   - Fetches all discussions for the submission via `by_submissionId` index, sorted by `createdAt` ascending
   - Fetches the submission to determine status (for identity reveal logic)
   - For each message, looks up the poster's user record to get their name and role
   - Computes display names based on confidentiality rules:
     - **Viewer is author + status is not ACCEPTED:** Reviewer names become "Reviewer 1", "Reviewer 2" (assigned by order of first message appearance). Editor names visible.
     - **Viewer is author + status is ACCEPTED:** All names visible, reviewer identities revealed.
     - **Viewer is reviewer or editor:** All names visible.
   - Returns enriched message objects with: `_id`, `parentId`, `content`, `isRetracted`, `displayName`, `displayRole` ("author" | "reviewer" | "editor"), `isAnonymous` (boolean), `avatarInitials`, `isOwnMessage`, `editableUntil`, `createdAt`, `updatedAt`
   - Also returns metadata fields for the frontend
   - Returns `v.union(v.null(), v.object({ messages: v.array(...), submissionStatus: v.string(), isAuthor: v.boolean(), viewerRole: v.string(), publicConversation: v.optional(v.boolean()), canPost: v.boolean() }))`
   - `canPost` is computed: true if viewer is author/editor, or reviewer with submitted/locked review

2. **`postMessage` mutation** (uses `withUser`):
   - Args: `{ submissionId: v.id('submissions'), content: v.string(), parentId: v.optional(v.id('discussions')) }`
   - Validates content is non-empty and <= 5000 characters
   - Validates user is a participant: author of the submission, reviewer with a review record for this submission, or editor-level role
   - If reviewer, validates review status is `submitted` or `locked` (can't discuss before submitting)
   - If `parentId` is provided, validates the parent message exists and belongs to the same submission
   - Inserts discussion with `authorId: ctx.user._id`, `editableUntil: Date.now() + 5 * 60 * 1000`, `isRetracted: false`
   - Returns: `v.object({ _id: v.id('discussions') })`

3. **`editMessage` mutation** (uses `withUser`):
   - Args: `{ messageId: v.id('discussions'), content: v.string() }`
   - Validates the user is the message author (`authorId === ctx.user._id`)
   - Validates `Date.now() < message.editableUntil`
   - Validates content is non-empty and <= 5000 characters
   - Patches `content` and `updatedAt`
   - Returns: `v.null()`

4. **`retractMessage` mutation** (uses `withUser`):
   - Args: `{ messageId: v.id('discussions') }`
   - Validates the user is the message author
   - Validates `isRetracted` is not already `true` (idempotent guard)
   - Patches `isRetracted: true`, `updatedAt: Date.now()`
   - Returns: `v.null()`

5. **`togglePublicConversation` mutation** (uses `withUser`):
   - Args: `{ submissionId: v.id('submissions') }`
   - Validates the user is the author of the submission (`submission.authorId === ctx.user._id`)
   - Validates submission status is `REJECTED`
   - Validates `publicConversation` is not already `true`
   - Patches `publicConversation: true`, `updatedAt: Date.now()` on the submission
   - Returns: `v.null()`

### New UI components in `app/features/review/`

1. **`discussion-thread.tsx`** — `DiscussionThread` component:
   - Props: `submissionId: Id<'submissions'>`, `reviewStatus?: string` (optional — only passed from reviewer workspace, used to gate discussion visibility for reviewers who haven't submitted yet)
   - If `reviewStatus` is `'assigned'` or `'in_progress'`, renders the placeholder card: "Discussion will be available after you submit your review" (same as current placeholder)
   - Otherwise, calls `useQuery(api.discussions.listBySubmission, { submissionId })` for reactive data
   - The query returns `{ messages, submissionStatus, isAuthor, viewerRole, publicConversation, canPost }` — all access control is server-side
   - Groups messages into top-level + nested replies by `parentId` (max 1 level of nesting in UI — replies to replies render at the same indent level as first-level replies)
   - Renders messages chronologically
   - Tracks newly arrived message IDs for highlight animation using a ref to compare previous vs current message ID sets
   - Shows the composer at the bottom if `canPost` is true
   - Manages reply context state (which message is being replied to)
   - Renders the "Make conversation public" toggle for rejected submissions when `isAuthor` is true
   - Shows "Identity revealed" note for accepted submissions when `isAuthor` is true
   - Shows a loading skeleton when `useQuery` returns `undefined`
   - Auto-scroll behavior: if user is within 100px of bottom when new message arrives, scroll to bottom. Otherwise, show a "New messages" badge at bottom of visible area

2. **`discussion-message.tsx`** — `DiscussionMessage` component:
   - Props: `message` (the enriched message object from the query), `onReply`, `isHighlighted`, `onEdit`, `onRetract`
   - Renders: avatar with initials, display name + role badge, relative timestamp, message content (or retracted placeholder), action buttons (Reply, Edit, Retract)
   - Role badge styling: "Author" = warm badge, "Reviewer" = neutral badge, "Editor" = accent badge
   - Anonymous reviewers get a generic avatar with "R1", "R2" initials
   - Edit mode: inline textarea with Save/Cancel
   - Retracted: muted italic "[This message has been retracted]"
   - Highlight: `bg-accent/10` with fadeout animation for new messages

3. **`discussion-composer.tsx`** — `DiscussionComposer` component:
   - Props: `submissionId`, `replyTo` (optional `{ displayName: string, parentId: Id<'discussions'> }`), `onCancelReply`, `onPostSuccess`
   - Textarea with Newsreader font, "Post" button, Cmd+Enter shortcut
   - Character counter shown when content.length > 4000 (format: "4523 / 5000")
   - Character counter turns red and "Post" button disables when > 5000 characters
   - "Post" button also disables when content is empty or whitespace-only
   - "Replying to [name]" indicator with cancel (X) button when replying
   - Calls `useMutation(api.discussions.postMessage)` directly
   - Clears textarea and calls `onPostSuccess` callback on successful post
   - Shows brief error toast on mutation failure

### Files to create

```
convex/discussions.ts                              — NEW: discussion queries + mutations
app/features/review/discussion-thread.tsx          — NEW: threaded discussion container
app/features/review/discussion-message.tsx         — NEW: individual message component
app/features/review/discussion-composer.tsx         — NEW: message input composer
```

### Files to modify

```
app/features/review/review-panel.tsx               — MODIFY: replace Discussion tab placeholder with DiscussionThread
app/features/review/index.ts                       — MODIFY: export new discussion components
app/routes/review/$submissionId.tsx                — MODIFY: pass viewer role to ReviewPanel for discussion access
```

### Implementation sequence

1. **Create `convex/discussions.ts`** — all 5 functions: `listBySubmission`, `postMessage`, `editMessage`, `retractMessage`, `togglePublicConversation`.

2. **Create `app/features/review/discussion-message.tsx`** — individual message component with identity gating display, edit mode, retract display, highlight animation.

3. **Create `app/features/review/discussion-composer.tsx`** — message input with reply context, character counter, Cmd+Enter shortcut.

4. **Create `app/features/review/discussion-thread.tsx`** — thread container wiring query, grouping messages, managing reply state, rendering the public conversation toggle.

5. **Update `app/features/review/review-panel.tsx`** — replace Discussion tab placeholder with `<DiscussionThread>`, pass submissionId and viewer context.

6. **Update `app/routes/review/$submissionId.tsx`** — pass viewer role information to `<ReviewPanel>`.

7. **Update `app/features/review/index.ts`** — add new exports.

8. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`, `useMutation`
- Import from `~/components/ui/` for shadcn components
- Import from `~/features/review` for feature components (barrel export)
- Import from `convex/_generated/api` for API references

### shadcn/ui components to use

- `Textarea` — composer input (already installed)
- `Badge` — role badges (already installed)
- `Button` — post, edit, retract, reply actions (already installed)
- `Separator` — between thread sections (already installed)
- `ScrollArea` — thread scrolling (already installed)
- `AlertDialog` — retraction and public conversation confirmation (already installed)
- `Avatar`, `AvatarFallback` — participant avatars (already installed)
- lucide-react icons: `MessageSquareIcon`, `SendIcon`, `PencilIcon`, `XIcon`, `CornerDownRightIcon`, `ShieldIcon`, `EyeIcon`, `EyeOffIcon`, `GlobeIcon`, `CheckIcon`

### Component data flow

The `DiscussionThread` is self-contained — it loads its own data via `useQuery(api.discussions.listBySubmission)` and does NOT depend on ReviewPanel props for discussion data. The query handles viewer role derivation, identity gating, and access control server-side. The frontend only needs to pass the `submissionId`.

```
$submissionId.tsx (route)
  ├─ useQuery(api.reviews.getSubmissionForReviewer) → { submission, review }
  ├─ <ReviewPanel
  │    reviewId={review._id}
  │    submissionId={submission._id}
  │    sections={review.sections}
  │    revision={review.revision}
  │    status={review.status}
  │    submittedAt={review.submittedAt}
  │    reviewStatus={review.status}      ← for Discussion tab gating
  │  />
  │    ├─ Tab "Write Review": <ReviewForm ... /> (from Story 4.3)
  │    ├─ Tab "Discussion":
  │    │    └─ <DiscussionThread submissionId={...} reviewStatus={review.status} />
  │    │         ├─ If reviewStatus is 'assigned' | 'in_progress': show placeholder
  │    │         ├─ Else: useQuery(api.discussions.listBySubmission)
  │    │         │    → { messages, submissionStatus, isAuthor, viewerRole, publicConversation, canPost }
  │    │         ├─ Identity reveal note (if ACCEPTED + isAuthor)
  │    │         ├─ Public conversation toggle (if REJECTED + isAuthor)
  │    │         ├─ <DiscussionMessage ... /> (for each message)
  │    │         │    ├─ Avatar (anonymous or named)
  │    │         │    ├─ Role badge
  │    │         │    ├─ Content (or retracted placeholder)
  │    │         │    ├─ Reply / Edit / Retract actions
  │    │         │    └─ Nested replies (indented, max 1 level)
  │    │         └─ <DiscussionComposer ... /> (if canPost)
  │    │              ├─ Textarea (Newsreader font)
  │    │              ├─ Reply-to indicator
  │    │              ├─ Character counter (> 4000 of 5000)
  │    │              └─ Post button + Cmd+Enter
  │    └─ Tab "Guidelines": static content (unchanged)
```

### Pseudonym assignment algorithm

```typescript
// In listBySubmission query:
// 1. Collect all unique reviewer IDs from messages, ordered by first appearance
const reviewerOrder: Array<Id<'users'>> = []
for (const msg of sortedMessages) {
  if (msg.authorRole === 'reviewer' && !reviewerOrder.includes(msg.authorId)) {
    reviewerOrder.push(msg.authorId)
  }
}

// 2. Build pseudonym map
const pseudonymMap = new Map<string, string>()
reviewerOrder.forEach((reviewerId, index) => {
  pseudonymMap.set(reviewerId, `Reviewer ${index + 1}`)
})

// 3. Apply in message rendering based on viewer role + submission status
```

### Highlight animation CSS

Add to the component or use a Tailwind utility class:

```css
@keyframes fadeHighlight {
  0% { background-color: oklch(var(--accent) / 0.1); }
  100% { background-color: transparent; }
}

.animate-fade-highlight {
  animation: fadeHighlight 3s ease-out forwards;
}
```

### Identity visibility decision matrix

| Viewer Role | Submission Status | Reviewer Display | Author Display | Editor Display |
|------------|-------------------|-----------------|----------------|----------------|
| Author | UNDER_REVIEW / DECISION_PENDING | Pseudonym (Reviewer N) | Own name | Real name |
| Author | ACCEPTED | Real name (revealed) | Own name | Real name |
| Author | REJECTED | Pseudonym (permanent) | Own name | Real name |
| Reviewer | Any | Real names | Real name | Real name |
| Editor | Any | Real names | Real name | Real name |

### Participant validation rules

| Role | Condition to participate |
|------|------------------------|
| Author | `submission.authorId === ctx.user._id` |
| Reviewer | Has a `reviews` record for this submission with status `submitted` or `locked` |
| Editor | Role in `EDITOR_ROLES` (editor_in_chief, action_editor, admin) |

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Identity leak through UI — client receives real names and renders pseudonyms | Reviewer confidentiality violated | Server-side identity gating: the query NEVER returns real reviewer names to authors when status requires anonymity |
| Pseudonym assignment inconsistent across page loads | Author confusion about which reviewer is which | Deterministic: sorted by first message appearance (createdAt), computed fresh on each query. Since messages are never deleted (only retracted), the ordering is stable. For prototype scope this is sufficient; production would use a persistent pseudonym mapping table |
| 5-minute edit window race condition | User edits after deadline | Server-side `editableUntil` check in mutation; UI hides edit button proactively but server is authoritative |
| Long discussion threads slow down | Performance | Convex reactive queries are efficient; discussions per submission are unlikely to exceed hundreds of messages in prototype scope |
| Reply threading depth becomes confusing | UX | Limit to one level of nesting in the UI (replies to replies render at the same indent level as their parent reply) |
| `publicConversation` toggle accidentally applied | Author regret | Confirmation dialog with clear impact statement before toggling |

### Dependencies on this story

- **Story 5.1 (Reviewer Abstract):** Uses the discussion thread as source material when drafting the reviewer abstract.
- **Story 7.3 (Seed Data):** Seeds sample discussion threads with reviewer-author exchanges demonstrating semi-confidential threading (FR49).

### What "done" looks like

- `convex/discussions.ts` exists with `listBySubmission`, `postMessage`, `editMessage`, `retractMessage`, `togglePublicConversation`
- All new Convex functions define `args` and `returns` validators
- `app/features/review/discussion-thread.tsx` exists with threaded discussion container
- `app/features/review/discussion-message.tsx` exists with identity-gated message display
- `app/features/review/discussion-composer.tsx` exists with reply context and Cmd+Enter
- `app/features/review/review-panel.tsx` updated to render `DiscussionThread` in Discussion tab
- `app/features/review/index.ts` updated to export new components
- Identity gating enforced server-side: authors see pseudonyms, reviewers/editors see real names
- ACCEPTED submissions reveal reviewer identities to authors
- REJECTED submissions permanently hide reviewer identities from authors
- Rejected submission authors can toggle `publicConversation`
- Messages render with role badges, timestamps, Newsreader font
- Replies indented with left border, one level of nesting
- 5-minute edit window with inline edit mode
- Post-window retraction replaces content with "[This message has been retracted]"
- New messages highlight with `bg-accent/10` fading over 3 seconds
- Composer with Cmd+Enter, character counter, reply-to indicator
- `role="log"` + `aria-live="polite"` on discussion container
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The `withUser` wrapper is appropriate for all discussion functions since participants can be authors, reviewers, or editors. Do not use `withReviewer` (too restrictive — excludes authors and editors).
- The `discussions` table uses `authorId` to refer to the message poster (not the submission author). Be careful not to confuse `discussion.authorId` (who wrote this message) with `submission.authorId` (who wrote the paper).
- The `by_submissionId` index on `discussions` enables efficient fetching of all messages for a submission.
- For pseudonym consistency, always sort messages by `createdAt` before assigning reviewer numbers. This ensures "Reviewer 1" is always the reviewer who posted first.
- When computing `isOwnMessage`, compare `discussion.authorId` with `ctx.user._id`.
- The `editableUntil` field is set at insert time. The mutation checks `Date.now() < editableUntil` server-side. The UI should also check `editableUntil` client-side to hide/show the Edit button, but the server is authoritative.
- For the highlight animation on new messages, track the set of message IDs from the previous render using a ref. Any new IDs that appear in the current render are "new" and get the highlight class. Clear the highlight class after the animation completes.
- Convex `useQuery` returns `undefined` while loading. Show a loading spinner or skeleton in the Discussion tab during this state.
- The `togglePublicConversation` mutation patches the `submissions` table directly. Since discussions are fetched by `submissionId`, the `publicConversation` flag is read from the submission in the `listBySubmission` query and returned to the frontend.
- For relative timestamps, create an inline utility function `formatRelativeTime(timestamp: number): string` in `discussion-message.tsx`. Logic: "just now" (< 1 min), "N minutes ago" (< 60 min), "N hours ago" (< 24 hours), "N days ago" (>= 24 hours). No external date library needed.
- The `DiscussionThread` component handles the conditional rendering: if the viewer is a reviewer and their review is not yet submitted, show the placeholder message. Otherwise, show the full discussion.
- The `ScrollArea` wrapping already exists in `review-panel.tsx`. The `DiscussionThread` renders inside it.
- Use `EDITOR_ROLES` from `convex/helpers/roles.ts` for editor role checks in the backend. On the frontend, derive the viewer's effective role from the user context or pass it as a prop.
- CSS animation: use Tailwind's arbitrary animation syntax `animate-[fadeHighlight_3s_ease-out_forwards]` and define the `@keyframes fadeHighlight` in a `<style>` tag within the component, or as a component-level constant with inline styles. Prefer component encapsulation over modifying `globals.css`.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 4 spec | Sprint Agent |
| 2026-02-08 | Fixed: Added explicit viewer role derivation logic (server-side in `listBySubmission`). Added `viewerRole` and `canPost` to query return type. Clarified `isRetracted` field handling (explicit `false` at insert, check `=== true`). Clarified DiscussionThread is self-contained (loads own data). Added reply threading depth limit (1 level in UI). Added character counter red state and disable-on-overflow. Added auto-scroll behavior spec (100px threshold + "New messages" badge). Added pseudonym stability note. Added `formatRelativeTime` utility guidance. | Sprint Agent |
