# ATDD Checklist: Story 2.4 — Real-Time Triage Progress and Report Display

## AC1: Triage progress indicator during TRIAGING status

- [ ] `TriageProgressIndicator` renders 4 steps: Scope Fit, Formatting, Citations, Claims Analysis
- [ ] Each step shows correct status icon: gray circle (pending), animated spinner (running), green check (complete), red X (failed)
- [ ] Step labels use correct styling: muted for pending, bold for running, normal for complete, destructive for failed
- [ ] Completed steps show finding text truncated to ~100 chars
- [ ] Container has `role="progressbar"` with `aria-valuenow` and `aria-valuemax="4"`
- [ ] Active step has `aria-current="step"`

## AC2: Real-time progress updates without page refresh

- [ ] `TriageDisplay` calls `useQuery(api.triage.getBySubmission, ...)` reactively
- [ ] `TriageDisplay` calls `useQuery(api.triage.getProgress, ...)` reactively
- [ ] Completed step transitions from spinner to check icon automatically
- [ ] Next pending step transitions to spinner when applicable
- [ ] Result preview text appears for completed steps
- [ ] No polling or manual refresh required (verified by Convex reactive pattern)

## AC3: Triage report cards for completed triage

- [ ] Four `TriageReportCard` components render for TRIAGE_COMPLETE submissions
- [ ] Each card shows severity indicator (colored dot + label)
- [ ] Severity mapping: `low` → green + "No issues", `medium` → amber + "Minor issues", `high` → red + "Critical issues"
- [ ] Expanded cards show full `finding` and `recommendation` text
- [ ] Cards are collapsed by default
- [ ] Clicking header toggles expand/collapse
- [ ] Cards use `Collapsible` with `aria-expanded` on trigger

## AC4: Staggered reveal animation on initial load

- [ ] Each card has fade-in + slide-up animation
- [ ] Stagger delay: 0ms, 50ms, 100ms, 150ms per card index
- [ ] Expand/collapse uses smooth height transition (~200ms)
- [ ] `prefers-reduced-motion` disables animations (cards appear immediately)

## AC5: Triage display integration in submission detail

- [ ] "Triage Analysis" section appears between Keywords and Pipeline Progress
- [ ] Section not rendered for DRAFT status
- [ ] Section not rendered for SUBMITTED status
- [ ] Section shows TriageProgressIndicator for TRIAGING status
- [ ] Section shows TriageReportCard components for TRIAGE_COMPLETE or later
- [ ] Section heading matches other headings: uppercase tracking-wider muted

## AC6: Failed pass handling

- [ ] In progress mode: failed step shows red X icon with destructive-colored label
- [ ] In progress mode: failed step shows `lastError` message below label
- [ ] In report mode: failed card shows destructive styling with error message
- [ ] All 4 dimensions always shown, failures don't hide dimensions

## AC7: Pass label display names

- [ ] `scope` → "Scope Fit" in both progress indicator and report cards
- [ ] `formatting` → "Formatting" in both contexts
- [ ] `citations` → "Citations" in both contexts
- [ ] `claims` → "Claims Analysis" in both contexts

## Verification

- [ ] `bun run typecheck` passes with zero errors
- [ ] `bun run lint` passes
- [ ] `bun run test` passes (existing tests not broken)
