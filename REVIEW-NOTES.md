# Prototype Review Notes

Issues and improvement ideas from walkthrough testing (Feb 9, 2026). Each item validated against the codebase.

---

## Bugs

### 1. Payment summary shows wrong page count

- **Where:** `/editor/:submissionId` → Payment Summary card
- **Issue:** Shows "194 pages" for a paper, resulting in ~$3,980 base pay.
- **Root cause:** `BYTES_PER_PAGE = 3000` in `convex/payments.ts:23` is wildly inaccurate. Real academic PDFs are ~50,000-500,000 bytes per page. A 582KB PDF calculates as `582,000 / 3,000 = 194 pages`. Seed data doesn't hit this bug because seed submissions have no `pdfFileSize` and fall back to `DEFAULT_PAGE_COUNT = 15`.
- **Calculation path:** `convex/payments.ts:58-67` — if `pageCount` is not set explicitly, it divides `pdfFileSize` by `BYTES_PER_PAGE`.
- **Fix options:**
  1. Extract actual page count from PDF during upload (e.g. `pdf-parse` or `pdfjs-dist`)
  2. Increase `BYTES_PER_PAGE` to ~50,000 as a rough heuristic
  3. Let editors manually override page count in the payment section
- **Files:** `convex/payments.ts:23,58-67`, `app/features/editor/payment-summary-table.tsx:105`

### 2. Audit trail text truncation

- **Where:** `/editor/:submissionId` → Audit Trail timeline
- **Issue:** Long detail strings (e.g. invitation rationale) cut off mid-sentence with no way to read the rest.
- **Root cause:** Server-side `.slice(0, 100)` truncation **before** storing to the audit log, not CSS truncation. The UI renders `entry.details` in full — but the data is already truncated.
  - `convex/invitations.ts:230` — `rationale.slice(0, 100)` when logging reviewer invitations
  - `convex/decisions.ts:178-180` — `decisionNote.slice(0, 100)` when logging decisions
- **UI rendering:** `app/features/editor/audit-timeline.tsx:118-122` — plain `<p>` tag, no CSS truncation.
- **Fix options:**
  1. Store full text in audit log (remove the `.slice(0, 100)` calls)
  2. Add expand/collapse toggle in the UI for long entries
  3. Both — store full text and add UI toggle

---

## UX Improvements

### 3. Editor pipeline: next step should be prominent

- **Where:** `/editor/:submissionId` detail view
- **Issue:** No explicit "next step" guidance. Panels appear/hide based on status, but there's no banner or callout telling the editor what to do now.
- **Current behavior:** Conditional rendering shows relevant panels (e.g. ReviewerMatchPanel appears at `TRIAGE_COMPLETE`), but the editor must infer the next action from context.
- **Gap confirmed:** No status-specific help text, no "Waiting for X" indicators, no progress meter (e.g. "2 of 3 reviews complete").
- **Idea:** Add a status-aware banner at the top of the detail view:
  - `TRIAGE_COMPLETE`: "Triage done. Next: select reviewers and send invitations."
  - `UNDER_REVIEW`: "Waiting for reviews (2 of 3 submitted)."
  - `DECISION_PENDING`: "All reviews received. Make your editorial decision below."
- **File:** `app/features/editor/submission-detail-editor.tsx` (add after header, before metadata)

### 4. Status badge click — discoverability concern

- **Where:** `/editor/:submissionId` → status chip in the header
- **Validated:** The badge **does** have a chevron dropdown indicator (`ChevronDown` icon, `status-transition-chip.tsx:82`). It opens a dropdown with valid transitions.
- **Undo behavior:**
  - Decisions (accept/reject/revise) have a **10-second undo toast** (`decision-panel.tsx:133`, `convex/decisions.ts:247`)
  - Regular transitions (e.g. TRIAGE_COMPLETE → UNDER_REVIEW) have **no undo**
  - Desk Reject has a **confirmation dialog** but no undo (terminal state)
- **Remaining concern:** The chevron is small (`size-3`) and inside a colored badge — still easy to miss. Consider making the dropdown trigger more button-like, or adding a separate "Advance Status" button for discoverability.
- **Files:** `app/features/editor/status-transition-chip.tsx`, `app/features/editor/decision-panel.tsx`

### 5. Pipeline progress should be sticky

- **Where:** `/editor/:submissionId` → Pipeline Progress section
- **Confirmed:** The `StatusTimeline` component is positioned as the **13th of 15 sections** in the detail view, near the bottom. No sticky/fixed CSS exists. The page can be very long (12+ sections with conditional content).
- **Current position order:** Back link → Header → Metadata → Abstract → Authors → Keywords → Triage → Matching → Review Progress → Payment → Decision → **Pipeline Progress** → Notifications → Audit Trail
- **Idea:** Move pipeline progress to a sticky horizontal stepper pinned below the header, or a compact sidebar element. The current bottom-of-page position means editors lose sight of the pipeline state while working on the submission.
- **Files:** `app/features/editor/submission-detail-editor.tsx:228-234`, `app/features/submissions/status-timeline.tsx`

### 6. Email editing before sending invitations

- **Where:** `/editor/:submissionId` → invitation panel
- **Confirmed:** No preview or customization step exists. Clicking "Send Invitations" immediately creates records and sends notifications.
- **Email content:** Hardcoded template in `convex/invitations.ts:36-53` (`buildNotificationBody()`). Dynamic parts: paper title, matching rationale, and accept link. Subject: `"Invitation to Review: ${title}"`. Compensation and deadline are hardcoded strings.
- **Current flow:** Select reviewers → click "Send" → toast with 10-second undo → done.
- **After sending:** Editors can view what was sent in the "Notification Previews" section (`app/features/notifications/notification-preview-list.tsx`), but only after the fact.
- **Idea:** Add a preview/edit modal before confirming send. Show subject + body, let editors customize per-reviewer or use a template. Store the actual email body sent for audit.
- **Files:** `convex/invitations.ts:36-53,109-237`, `app/features/editor/invitation-panel.tsx:104-158`

### 7. Abstract minimum length may be too strict

- **Where:** `/submit` → submission form
- **Issue:** "Abstract must be at least 100 characters" — hard block at both client and server.
- **Validated locations:**
  - Client: `app/features/submissions/submission-form.tsx:31` — Zod `.min(100, ...)` on abstract field
  - Server: `convex/submissions.ts:55-57` — `if (args.abstract.length < 100)` guard in `create` mutation
  - Schema: `convex/schema.ts:28` — plain `v.string()`, no length constraint at DB level
- **Behavior:** Hard block — prevents form submission and mutation execution.
- **Consider:** Lower to 50 characters, or convert to a soft warning (yellow inline message) rather than a blocking validation error.
