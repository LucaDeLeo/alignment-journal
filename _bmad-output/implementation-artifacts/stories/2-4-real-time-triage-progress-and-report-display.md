# Story 2.4: Real-Time Triage Progress and Report Display

## Story

**As an** author or editor,
**I want** to see triage progress in real-time and read the structured triage report when complete,
**So that** I get immediate, actionable feedback on submissions.

## Status

**Epic:** 2 - Author Submission & LLM Triage Pipeline
**Status:** ready
**Priority:** High (completes Epic 2, delivers FR14 + FR15)
**Depends on:** Story 2.3 (triage pipeline, `getBySubmission` and `getProgress` queries, `triageReports` table), Story 2.2 (submission detail page at `/submit/$submissionId` with `SubmissionDetail` component and `StatusTimeline`), Story 2.1 (submission creation, PDF upload)

## Context

This story adds the frontend display for LLM triage data on the submission detail page. Story 2.3 built the entire backend triage pipeline (chained Actions, reactive queries) but no frontend to consume it. This story creates two new components — `TriageProgressIndicator` and `TriageReportCard` — and integrates them into the existing `SubmissionDetail` component.

The triage display has two modes based on submission status:

1. **In-progress mode (`TRIAGING`):** Shows a `TriageProgressIndicator` — a vertical sequence of 4 steps (Scope Fit → Formatting → Citations → Claims Analysis) with live status icons per step (pending circle / active spinner / complete check / failed X). As each pass completes via Convex reactive queries, the indicator updates in real-time with no page refresh needed.

2. **Complete mode (`TRIAGE_COMPLETE` or later):** Shows `TriageReportCard` components — one collapsible card per triage dimension, each displaying the structured finding, severity indicator, and editor-facing recommendation. Cards appear with staggered spring animation on first render (50ms delay between cards).

Both modes use the existing `triage.getBySubmission` and `triage.getProgress` queries from story 2.3 — these are already exported and use `withUser` authorization (author access via `assertTriageAccess`).

**Key architectural decisions:**

- **Component structure:** Two new files in `app/features/submissions/`: `triage-progress.tsx` (the `TriageProgressIndicator` component) and `triage-report-card.tsx` (the `TriageReportCard` component). A wrapper `triage-display.tsx` coordinates which mode to show based on submission status and progress data.
- **Query pattern:** `TriageDisplay` calls `useQuery(api.triage.getBySubmission, ...)` and `useQuery(api.triage.getProgress, ...)` from `convex/react`. These are reactive — Convex automatically re-renders when triage reports update. The `TriageDisplay` conditionally renders progress indicator vs report cards based on the data.
- **Conditional rendering:** Triage components only render for submissions in `TRIAGING`, `TRIAGE_COMPLETE`, or later statuses. For `SUBMITTED` status (before triage starts), nothing is shown. For `DRAFT`, nothing is shown.
- **Severity mapping:** The backend stores severity as `'low' | 'medium' | 'high'`. The UX spec defines display labels as `pass` / `minor` / `critical` / `info`. The mapping is: `low` → "No issues" (green), `medium` → "Minor issues" (amber), `high` → "Critical issues" (red). The `info` variant is not produced by the current triage pipeline but could be added later.
- **Animation:** Uses CSS transitions for the staggered card reveal (50ms delay between cards via `transition-delay` + `animation-delay`). Collapsible cards use CSS `grid-template-rows` animation for expand/collapse. No Motion (Framer Motion) dependency needed — CSS handles these patterns cleanly.
- **Collapsible pattern:** Each `TriageReportCard` uses Radix's `Collapsible` primitive (already available via shadcn/ui) for accessible expand/collapse with `aria-expanded`.

**Key architectural references:**
- Triage queries: `convex/triage.ts` — `getBySubmission`, `getProgress` (story 2.3)
- Submission detail: `app/features/submissions/submission-detail.tsx` (story 2.2)
- Status utils: `app/features/submissions/status-utils.ts` — `STATUS_COLOR_VAR`, CSS variable pattern
- UX spec: `TriageReportCard` component spec (collapsible, severity indicators, staggered reveal)
- UX spec: `TriageProgressIndicator` component spec (vertical steps, live status icons, spinner)
- Design tokens: `app/styles/globals.css` — `--color-status-green`, `--color-status-amber`, `--color-status-red`, `--color-status-blue`

## Acceptance Criteria

### AC1: Triage progress indicator during TRIAGING status
**Given** a submission in `TRIAGING` status
**When** the submission detail page renders
**Then:**
- A `TriageProgressIndicator` displays below the status timeline section
- It shows a vertical sequence of 4 steps: "Scope Fit", "Formatting", "Citations", "Claims Analysis"
- Each step shows a status icon: pending (gray circle), running (animated spinner), complete (green check), failed (red X icon)
- Each step label uses appropriate styling: muted for pending, bold for running, normal for complete, destructive for failed
- When a pass completes, its result preview text (the `finding` field, truncated to ~100 chars) appears below the step label
- The indicator uses `role="progressbar"` with `aria-valuenow` reflecting the completed count and `aria-valuemax="4"`
- Active steps have `aria-current="step"`

### AC2: Real-time progress updates without page refresh
**Given** a submission in `TRIAGING` status displayed on the detail page
**When** a triage pass completes in the backend
**Then:**
- The progress indicator updates automatically via Convex reactive queries
- The completed step transitions from spinner to check icon
- The next pending step transitions to spinner (if applicable)
- The result preview text for the completed step appears
- No page refresh, polling, or manual action is required
- This is achieved via `useQuery(api.triage.getProgress, { submissionId })` and `useQuery(api.triage.getBySubmission, { submissionId })`

### AC3: Triage report cards for completed triage
**Given** a submission in `TRIAGE_COMPLETE` status (or any later status)
**When** the submission detail page renders
**Then:**
- Four `TriageReportCard` components render, one per triage dimension: Scope Fit, Formatting, Citations, Claims Analysis
- Each card shows: a severity indicator (colored dot + label), dimension title, and an expand/collapse chevron
- Severity mapping: `low` → green dot + "No issues", `medium` → amber dot + "Minor issues", `high` → red dot + "Critical issues"
- Expanded cards show: the full `finding` text and the `recommendation` text
- Cards are collapsed by default; clicking the header toggles expand/collapse
- Cards use the `Collapsible` primitive with `aria-expanded` on the header

### AC4: Staggered reveal animation on initial load
**Given** triage report cards rendering for the first time
**When** the cards appear
**Then:**
- Each card appears with a fade-in + slide-up animation
- Cards are staggered: each dimension appears 50ms after the previous one (0ms, 50ms, 100ms, 150ms)
- The expand/collapse animation uses a smooth height transition (~200ms)
- Animations respect `prefers-reduced-motion` — when reduced motion is preferred, cards appear immediately with no animation

### AC5: Triage display integration in submission detail
**Given** the submission detail page
**When** it renders
**Then:**
- A "Triage Analysis" section appears between the Keywords section and the Pipeline Progress section
- For `SUBMITTED` status (triage not yet started), the section is not rendered
- For `TRIAGING` status, the section shows the `TriageProgressIndicator`
- For `TRIAGE_COMPLETE` or any later status, the section shows `TriageReportCard` components
- For `DRAFT` status, the section is not rendered
- The section heading is "Triage Analysis" with the same styling as other section headings (uppercase tracking-wider muted)

### AC6: Failed pass handling
**Given** a triage pass that failed after 3 retry attempts
**When** the progress indicator or report cards render
**Then:**
- In progress mode: the failed step shows a red X icon with the label styled in destructive color, and the `lastError` message is shown below the label
- In report mode: a failed pass card shows a destructive-styled card with the error message instead of findings/recommendation
- The overall triage display still shows all 4 dimensions — failures don't hide the dimension, they clearly indicate the failure

### AC7: Pass label display names
**Given** triage report data from the backend
**When** pass names render in the UI
**Then:**
- `scope` → "Scope Fit"
- `formatting` → "Formatting"
- `citations` → "Citations"
- `claims` → "Claims Analysis"
- These display names are consistent across both the progress indicator and report cards

## Technical Notes

### New files to create

```
app/features/submissions/
  triage-display.tsx         — wrapper component: chooses progress indicator vs report cards based on status
  triage-progress.tsx        — TriageProgressIndicator component (live vertical steps)
  triage-report-card.tsx     — TriageReportCard component (collapsible severity card)
```

### Files to modify

```
app/features/submissions/submission-detail.tsx  — integrate TriageDisplay between keywords and pipeline progress
app/features/submissions/index.ts               — add new exports
```

### Implementation sequence

1. **Create `app/features/submissions/triage-report-card.tsx`** — The collapsible report card component:
   - Props: `passName: string`, `displayName: string`, `status: 'complete' | 'failed'`, `result?: { finding: string, severity: 'low' | 'medium' | 'high', recommendation: string }`, `lastError?: string`, `index: number` (for stagger delay)
   - Uses Radix `Collapsible` via `@radix-ui/react-collapsible` (already available through shadcn/ui dependencies)
   - Header row: severity dot (colored circle using CSS variable), severity label, dimension title, chevron icon
   - Body: `finding` text and `recommendation` text, styled with Newsreader serif font for the finding text
   - Failed state: destructive card with `lastError` message
   - Staggered animation via `style={{ animationDelay: '${index * 50}ms' }}` with CSS `@keyframes` for fade-in + slide-up
   - `prefers-reduced-motion` query disables animation (via CSS `@media (prefers-reduced-motion: reduce)`)
   - Severity color mapping:
     ```typescript
     const SEVERITY_CONFIG: Record<'low' | 'medium' | 'high', { color: string; label: string }> = {
       low: { color: '--color-status-green', label: 'No issues' },
       medium: { color: '--color-status-amber', label: 'Minor issues' },
       high: { color: '--color-status-red', label: 'Critical issues' },
     }
     ```

2. **Create `app/features/submissions/triage-progress.tsx`** — The live progress indicator:
   - Props: `reports: Array<{ passName, status, result?, lastError? }>`, `progress: { total, complete, running, failed, pending }`
   - Renders a vertical step list with 4 entries
   - Each step: status icon + display name + optional result preview
   - Icons: `Circle` (pending, muted), `Loader2` with `animate-spin` (running), `CheckCircle2` (complete, green), `XCircle` (failed, red) — all from `lucide-react`
   - Result preview: truncated `finding` text (~100 chars) with `text-sm text-muted-foreground`
   - Container has `role="progressbar"` with `aria-valuenow={progress.complete}` and `aria-valuemax={progress.total}`
   - Active step has `aria-current="step"`
   - Pass display name mapping:
     ```typescript
     const PASS_DISPLAY_NAMES: Record<string, string> = {
       scope: 'Scope Fit',
       formatting: 'Formatting',
       citations: 'Citations',
       claims: 'Claims Analysis',
     }
     ```

3. **Create `app/features/submissions/triage-display.tsx`** — The wrapper component:
   - Props: `submissionId: Id<'submissions'>`, `submissionStatus: SubmissionStatus`
   - Conditionally calls `useQuery(api.triage.getBySubmission, ...)` and `useQuery(api.triage.getProgress, ...)` — only when submission status warrants it (not `DRAFT` or `SUBMITTED`)
   - Uses the Convex "skip" pattern: pass `"skip"` as the second arg to `useQuery` when triage data shouldn't be fetched
   - Renders `TriageProgressIndicator` when any report has `status !== 'complete'` (i.e., triage is still in progress)
   - Renders `TriageReportCard` list when all reports are complete (or when submission is in `TRIAGE_COMPLETE` or later status)
   - Handles loading state: returns `null` when `useQuery` returns `undefined` (Suspense boundary handles)
   - Handles empty state: if no triage reports exist yet (e.g., pipeline just started), shows the progress indicator with all steps pending

4. **Modify `app/features/submissions/submission-detail.tsx`** — Add triage display:
   - Import `TriageDisplay` from `./triage-display`
   - Add a new section between the Keywords section and the Pipeline Progress section:
     ```tsx
     {/* Triage Analysis */}
     <TriageDisplay submissionId={submissionId} submissionStatus={submission.status} />
     ```
   - The `TriageDisplay` handles its own section heading and conditional rendering, so the integration is a single line

5. **Update `app/features/submissions/index.ts`** — Add new exports:
   - `export { TriageDisplay } from './triage-display'`
   - `export { TriageProgressIndicator } from './triage-progress'`
   - `export { TriageReportCard } from './triage-report-card'`

6. **Verify typecheck and lint** — `bun run typecheck`, `bun run lint`.

### Component data flow

```
SubmissionDetail
  └─ useQuery(api.submissions.getById) → submission data
  └─ TriageDisplay (submissionId, submissionStatus)
       ├─ useQuery(api.triage.getBySubmission) → reports array
       ├─ useQuery(api.triage.getProgress) → progress counts
       ├─ if (in progress) → TriageProgressIndicator
       │    └─ renders 4 steps with live status icons
       └─ if (complete) → TriageReportCard × 4
            └─ collapsible cards with finding/severity/recommendation
```

### Convex query usage pattern

```typescript
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

// In TriageDisplay component:
const shouldFetchTriage = status !== 'DRAFT' && status !== 'SUBMITTED'

const reports = useQuery(
  api.triage.getBySubmission,
  shouldFetchTriage ? { submissionId } : 'skip',
)
const progress = useQuery(
  api.triage.getProgress,
  shouldFetchTriage ? { submissionId } : 'skip',
)
```

### Stagger animation CSS

```css
/* In the component via Tailwind arbitrary values or inline styles */
@keyframes triage-card-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.triage-card-enter {
  animation: triage-card-enter 200ms ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .triage-card-enter {
    animation: none;
  }
}
```

The stagger delay is applied per-card via inline `style={{ animationDelay: '${index * 50}ms' }}`.

### Collapsible expand/collapse pattern

```typescript
import * as Collapsible from '@radix-ui/react-collapsible'
// OR if shadcn/ui has a collapsible component:
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'
```

If the shadcn/ui `collapsible` component is not yet installed, install it:
```bash
bunx shadcn@latest add collapsible
```

### Severity display mapping

```typescript
const SEVERITY_CONFIG = {
  low: {
    colorVar: '--color-status-green',
    label: 'No issues',
    dotClass: 'bg-[var(--color-status-green)]',
  },
  medium: {
    colorVar: '--color-status-amber',
    label: 'Minor issues',
    dotClass: 'bg-[var(--color-status-amber)]',
  },
  high: {
    colorVar: '--color-status-red',
    label: 'Critical issues',
    dotClass: 'bg-[var(--color-status-red)]',
  },
} as const
```

### Pass display names

```typescript
const PASS_DISPLAY_NAMES: Record<string, string> = {
  scope: 'Scope Fit',
  formatting: 'Formatting',
  citations: 'Citations',
  claims: 'Claims Analysis',
}
```

### Import conventions

Follow the codebase pattern:
- Value imports before type imports
- Separate `import type` statements
- `Array<T>` syntax, not `T[]`
- Import from `convex/react` for `useQuery`
- Import from `~/components/ui/` for shadcn components
- Import from relative paths for sibling feature components

### shadcn/ui components to use

- `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` — expand/collapse for report cards (may need to install)
- `Badge` — severity indicator labels (already installed)
- lucide-react icons: `CheckCircle2`, `Circle`, `XCircle`, `Loader2`, `ChevronDown`, `ChevronRight` (or `ChevronUp`)

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `useQuery` returns `undefined` during initial Convex sync | Flash of no triage section | Return `null` from `TriageDisplay` when data is undefined — Suspense boundary handles loading |
| Triage queries fail for unauthorized users | Error thrown from query | `assertTriageAccess` in backend handles auth; frontend wrapped in route-level ErrorBoundary from story 1.4 |
| No triage reports exist for older submissions created before story 2.3 | Empty array from `getBySubmission` | `TriageDisplay` handles empty reports gracefully — doesn't render anything if no reports and not in `TRIAGING` status |
| Collapsible component not installed | Import error | Check if `collapsible` is available; if not, install via `bunx shadcn@latest add collapsible` |
| Large finding text overflows card | Poor layout | Truncate finding preview in progress mode (~100 chars); full text in report card body wraps naturally |
| Animation jank on low-end devices | Poor UX | CSS-only animations (no JS animation library), `prefers-reduced-motion` support |

### Dependencies on this story

- **Story 3.1 (Editor Pipeline Dashboard):** May reuse `TriageReportCard` in the editor's submission detail view
- **Story 3.2 (Submission Detail View with Triage Results):** Reuses `TriageReportCard` and `TriageProgressIndicator` in the editor context

### What "done" looks like

- When a submission is in `TRIAGING` status, the submission detail page at `/submit/$submissionId` shows a live `TriageProgressIndicator` with 4 steps updating in real-time as each LLM pass completes
- When triage is complete (`TRIAGE_COMPLETE` or later), 4 `TriageReportCard` components render with severity indicators, findings, and recommendations in collapsible cards
- Cards appear with staggered fade-in animation (50ms between cards, respects `prefers-reduced-motion`)
- Failed passes show destructive styling with the sanitized error message
- The triage section integrates seamlessly into the existing submission detail page layout
- All triage data updates in real-time via Convex reactive queries — no polling or page refresh
- Collapsible cards use Radix `Collapsible` with proper `aria-expanded` accessibility
- Progress indicator uses `role="progressbar"` with `aria-valuenow` / `aria-valuemax`
- `bun run typecheck` succeeds with zero errors
- `bun run lint` passes

## Dev Notes

- The `getBySubmission` query already filters to the latest triage run and sorts by pass order (scope → formatting → citations → claims). The frontend does not need to re-sort.
- The `getProgress` query always reports `total: 4` even if some reports haven't been created yet (the contract is 4 passes). This means the progress indicator can safely show 4 steps from the start.
- The `assertTriageAccess` function in `convex/triage.ts` already handles authorization — authors can see their own triage data, editors/admins can see any. No additional client-side auth checks needed.
- Use the Convex "skip" pattern (`useQuery(api.triage.getBySubmission, shouldFetch ? { submissionId } : 'skip')`) to avoid firing triage queries for submissions that haven't entered the triage pipeline yet. This prevents unnecessary Convex function calls.
- Import conventions: value imports before type imports, separate `import type` statements, `Array<T>` syntax.
- The `Loader2` icon from lucide-react with `className="animate-spin"` provides the spinner for the running step — no separate Spinner component needed.
- The stagger animation uses CSS `animation-delay` with an `@keyframes` rule. The animation is defined in the component file using Tailwind's arbitrary property syntax or inline styles — no globals.css changes needed.
- For the collapsible height animation, use `grid-template-rows: 0fr` → `1fr` transition on a wrapper grid, which provides smooth height animation without measuring DOM height. Alternatively, Radix `CollapsibleContent` handles this with its own animation support.
- The triage section heading ("Triage Analysis") follows the same pattern as "Abstract", "Authors", "Keywords" — `text-sm font-medium uppercase tracking-wider text-muted-foreground`.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story created from Epic 2 spec | Sprint Agent |
