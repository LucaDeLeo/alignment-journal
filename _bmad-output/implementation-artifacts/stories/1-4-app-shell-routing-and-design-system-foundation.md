# Story 1.4: App Shell, Routing, and Design System Foundation

## Story

**As a** user,
**I want** a polished app shell with role-based routing, the design system applied, and a cmd+K palette,
**So that** I can navigate the platform with a consistent, professional experience.

## Status

**Epic:** 1 - Project Foundation & Authentication
**Status:** done
**Priority:** High (establishes navigation and visual foundation for all subsequent stories)
**Depends on:** Story 1.3 (user management, role badge, role switcher, useCurrentUser hook)

## Context

This story builds the navigational skeleton, design system tokens, and foundational UI patterns that every subsequent story depends on. Story 1.3 established the auth flow (Clerk + Convex user sync, role badge, role switcher). This story layers on top: role-based route groups with placeholder pages, the cmd+K command palette, mode-specific design tokens, skeleton loading states, and error boundaries.

The key architectural decisions:

- **Route groups:** TanStack Router file-based routing creates route groups at `/editor/`, `/review/`, `/submit/`, `/article/`, `/admin/`. Each group gets a layout route that wraps its children with mode-appropriate styling (via a `data-mode` attribute on the layout wrapper).
- **Mode-specific color tokens:** The design system uses CSS custom property overrides driven by a `data-mode` attribute. Editor mode is coolest, reviewer mode is neutral, author mode is slightly warmer, reader mode is warmest (cream/ivory background). Tokens shift subtly — same design language, different atmosphere.
- **cmd+K command palette:** Uses shadcn/ui `Command` component (built on cmdk). Groups: "Switch Role" (demo only, same visibility rules as role switcher), "Go To" (role-aware navigation), "Search" (placeholder for future submission search). Global `cmd+K` / `ctrl+K` keyboard shortcut.
- **Skeleton loading states:** CSS-only shimmer animation for route-level Suspense fallbacks. Skeleton components match the expected layout of each route group.
- **Error boundaries:** Per-feature-section error boundaries so one broken section doesn't crash the whole page. Each route group wraps its outlet in an error boundary with a user-friendly fallback.
- **Empty states:** Placeholder pages for each route group show purposeful empty states with next-action guidance (e.g., "No submissions yet. Create your first submission." for `/submit/`).

**Key architectural references:**
- Route structure: architecture.md — `app/routes/editor/`, `review/`, `submit/`, `article/`, `admin/`
- Design tokens: UX design specification — mode-specific color shifts, spacing scale, shadow system, border radius
- Component strategy: architecture.md — shadcn/ui `Command` for cmd+K palette
- Loading patterns: architecture.md — React Suspense with skeleton fallbacks, Error Boundaries per feature section
- Animation: UX spec — spring-based 150-250ms, skeleton shimmer via CSS animation
- Accessibility: NFR10-NFR13a — WCAG 2.1 AAA, keyboard navigation, prefers-reduced-motion support

## Acceptance Criteria

### AC1: Role-based route groups with placeholder pages
**Given** the app
**When** routes are defined
**Then:**
- Route groups exist at: `/editor/` (dashboard, submission detail), `/review/` (review workspace), `/submit/` (author submission, submission detail), `/article/` (public articles), `/admin/` (user management)
- Each route group has a layout route (`_layout.tsx` or `route.tsx`) that:
  - Sets a `data-mode` attribute on its wrapper element (`editor`, `reviewer`, `author`, `reader`, `admin`)
  - Wraps `<Outlet />` in a React Error Boundary with a user-friendly fallback
- Each route group has an `index.tsx` with a placeholder page that includes:
  - A heading describing the section
  - An empty state with purposeful next-action guidance
- The `/article/` route is publicly accessible (no auth required)
- All other route groups render inside `<SignedIn>` or redirect to sign-in if unauthenticated
- Route files follow kebab-case naming convention
- TanStack Router's file-based routing auto-generates the route tree

### AC2: Mode-specific design system tokens
**Given** the design system
**When** CSS variables are configured
**Then:**
- `app/styles/globals.css` extends the existing `@theme` block with additional tokens:
  - Status colors: `--color-status-green`, `--color-status-amber`, `--color-status-red`, `--color-status-blue`, `--color-status-gray`
  - Shadow system: `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`
- Mode-specific CSS custom property overrides are defined using `[data-mode]` attribute selectors:
  - `[data-mode="editor"]`: Coolest palette — base cool gray background, indigo-blue accent
  - `[data-mode="reviewer"]`: Neutral palette — base background, elevated white for content areas
  - `[data-mode="author"]`: Slightly warmer — neutral background shift
  - `[data-mode="reader"]`: Warmest palette — cream/ivory background (`oklch` equivalent of warm off-white), warm accent shift
  - `[data-mode="admin"]`: Same as editor (cool operational feel)
- Existing font tokens (Satoshi, Newsreader, JetBrains Mono) remain unchanged
- Existing border radius tokens remain unchanged
- All color values use oklch color space (consistent with existing tokens)
- Mode transitions are instant (no animation on `data-mode` change — just a quiet tonal shift)

### AC3: cmd+K command palette
**Given** a user
**When** they press cmd+K (Mac) or ctrl+K (Windows/Linux)
**Then:**
- A command palette dialog opens (shadcn/ui `Command` component, via `CommandDialog`)
- The palette has grouped results:
  - **"Switch Role"** group (only visible when `showRoleSwitcher` is true — same condition as the header role switcher): lists all 5 roles with display names (Author, Reviewer, Action Editor, Editor-in-Chief, Admin). Selecting a role calls the `switchRole` mutation
  - **"Go To"** group: lists navigable routes with keyboard shortcut hints. Routes shown are role-aware — editors see editor routes, authors see submit routes, etc. All users see: Home, Published Articles. Role-specific routes include: Editor Dashboard, Submit Paper, Admin Panel, Review Workspace
  - **"Search"** group: a placeholder search input that shows "Search submissions..." with a "Coming soon" indicator (search functionality implemented in future stories)
- The palette is accessible via keyboard (cmd+K / ctrl+K globally) and a subtle trigger in the header
- The palette closes on Escape, on selecting an item, or on clicking outside
- The palette renders `<Kbd>` hints for keyboard shortcuts next to navigable items
- Palette appears with the shadcn/ui `CommandDialog` overlay (no custom animation needed for prototype)

### AC4: Skeleton loading states with CSS shimmer
**Given** any route within the app
**When** it is loading (React Suspense boundary triggered)
**Then:**
- A skeleton component renders as the Suspense fallback that matches the expected layout shape of the route
- The skeleton uses a CSS-only shimmer animation (no Motion/Framer Motion overhead for loading states)
- The shimmer animation respects `prefers-reduced-motion` (becomes static skeleton when reduced motion is preferred)
- A shared `Skeleton` component is added to `app/components/ui/skeleton.tsx` (via shadcn/ui CLI or manual creation) that provides the base shimmer primitive
- Route-level skeleton components are created for each route group layout (e.g., `EditorSkeleton`, `SubmitSkeleton`, `ArticleSkeleton`)

### AC5: Error boundaries per feature section
**Given** a runtime error in any route section
**When** the error is thrown during render
**Then:**
- The error is caught by the nearest Error Boundary (configured per route group layout)
- A user-friendly fallback renders with: an error description, a "Try again" button that resets the boundary, and styling consistent with the design system
- The error does NOT crash the entire application — the header, navigation, and other sections remain functional
- The Error Boundary component is reusable and configurable (accepts a `fallback` prop or uses a default)

### AC6: Enhanced root layout with cmd+K trigger
**Given** the root layout
**When** it renders
**Then:**
- The existing header (journal name, role badge, role switcher, user button) is preserved
- A subtle cmd+K trigger is added to the header (a search-style button or icon that opens the palette)
- The cmd+K trigger shows the keyboard shortcut hint (e.g., "⌘K")
- The header layout remains responsive at 1024px+ minimum width

## Technical Notes

### Route file structure

```
app/routes/
  __root.tsx              — existing, enhanced with cmd+K palette
  index.tsx               — existing home page
  editor/
    route.tsx             — editor layout (data-mode="editor", error boundary, sidebar placeholder)
    index.tsx             — editor dashboard placeholder
  review/
    route.tsx             — reviewer layout (data-mode="reviewer", error boundary, minimal chrome)
    index.tsx             — review workspace placeholder
  submit/
    route.tsx             — author layout (data-mode="author", error boundary, centered single-column)
    index.tsx             — submission list/form placeholder
  article/
    route.tsx             — reader layout (data-mode="reader", error boundary, warm palette)
    index.tsx             — published articles list placeholder
  admin/
    route.tsx             — admin layout (data-mode="admin", error boundary)
    index.tsx             — admin panel placeholder
```

### New components to create

```
app/components/ui/
  skeleton.tsx            — shadcn/ui Skeleton primitive with CSS shimmer
  command.tsx             — shadcn/ui Command components (CommandDialog, CommandInput, CommandList, etc.)
  dialog.tsx              — shadcn/ui Dialog (dependency for CommandDialog)
  kbd.tsx                 — Keyboard shortcut display component

app/components/
  command-palette.tsx     — App-level command palette wiring (groups, role switching, navigation)
  error-boundary.tsx      — Reusable error boundary with styled fallback
  route-skeleton.tsx      — Generic route-level skeleton layout component
```

### Files to modify

```
app/styles/globals.css   — Add status color tokens, shadow tokens, mode-specific overrides
app/routes/__root.tsx    — Add command palette component, cmd+K keyboard listener, trigger button in header
```

### shadcn/ui components to install

The `Command` component from shadcn/ui depends on `cmdk` and `Dialog`. Install via:
```bash
bunx shadcn@latest add command dialog
```

This will create `app/components/ui/command.tsx` and `app/components/ui/dialog.tsx` with all necessary imports.

### Mode-specific CSS architecture

```css
/* Mode-specific overrides applied via data-mode attribute on route layout wrappers */
[data-mode="editor"] {
  --color-background: oklch(0.99 0.002 240);    /* cool gray (base) */
  --color-accent: oklch(0.35 0.08 260);          /* indigo-blue */
}

[data-mode="reviewer"] {
  --color-background: oklch(0.99 0.002 240);    /* neutral (same as base) */
}

[data-mode="author"] {
  --color-background: oklch(0.985 0.003 220);   /* slightly warmer neutral */
}

[data-mode="reader"] {
  --color-background: oklch(0.97 0.01 80);      /* warm cream/ivory */
  --color-primary: oklch(0.38 0.07 250);         /* warmer accent shift */
}

[data-mode="admin"] {
  --color-background: oklch(0.99 0.002 240);    /* same as editor */
}
```

### Keyboard shortcut implementation

The cmd+K listener is registered at the root level via a `useEffect` in the command palette component:

```typescript
React.useEffect(() => {
  const down = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      setOpen((open) => !open)
    }
  }
  document.addEventListener('keydown', down)
  return () => document.removeEventListener('keydown', down)
}, [])
```

### Skeleton shimmer CSS

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    var(--color-muted) 25%,
    var(--color-muted-foreground, oklch(0.92 0.01 260)) 50%,
    var(--color-muted) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer {
    animation: none;
  }
}
```

### Auth guard for route groups

For authenticated route groups (editor, review, submit, admin), the layout route should check auth state:
- If inside `<SignedIn>` (which is already in `__root.tsx`), child routes can rely on the Clerk auth context
- Route-level auth: each layout route's `beforeLoad` can check for `userId` from the route context and redirect to sign-in if absent
- The `/article/` route group does NOT require auth — it's publicly accessible

### TanStack Router route group pattern

Layout routes in TanStack Router use the `createFileRoute` pattern. The `route.tsx` file in each directory acts as the layout:

```typescript
// app/routes/editor/route.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/editor')({
  component: EditorLayout,
})

function EditorLayout() {
  return (
    <div data-mode="editor">
      <ErrorBoundary fallback={<ErrorFallback />}>
        <React.Suspense fallback={<EditorSkeleton />}>
          <Outlet />
        </React.Suspense>
      </ErrorBoundary>
    </div>
  )
}
```

### Task Breakdown (ordered)

1. **Install shadcn/ui Command and Dialog components** — Run `bunx shadcn@latest add command dialog` to get the Command palette primitives. Manually create `kbd.tsx` and `skeleton.tsx` if not provided by shadcn. (AC3, AC4)
2. **Extend design system tokens in `globals.css`** — Add status colors (green, amber, red, blue, gray) as oklch values. Add shadow tokens. Add mode-specific CSS custom property overrides using `[data-mode]` selectors. Add skeleton shimmer keyframe animation. (AC2, AC4)
3. **Create reusable Error Boundary component** — `app/components/error-boundary.tsx` with styled fallback, "Try again" reset button, and configurable props. (AC5)
4. **Create route-level skeleton component** — `app/components/route-skeleton.tsx` as a generic layout skeleton using the `Skeleton` primitive. Create variants for different route layouts. (AC4)
5. **Create route group layouts and placeholder pages** — For each group (editor, review, submit, article, admin): create `route.tsx` with `data-mode` attribute, Error Boundary, Suspense boundary with skeleton fallback, and `<Outlet />`. Create `index.tsx` with placeholder content and empty state. (AC1)
6. **Build the command palette component** — `app/components/command-palette.tsx` using shadcn/ui `CommandDialog`. Wire up: "Switch Role" group (gated on `showRoleSwitcher`), "Go To" group with role-aware navigation items, "Search" group as placeholder. Register global cmd+K keyboard shortcut. (AC3)
7. **Integrate command palette into root layout** — Add the `CommandPalette` component and a header trigger button to `app/routes/__root.tsx`. Preserve existing header layout. (AC3, AC6)
8. **Verify typecheck, lint, and dev server** — Run `bun run typecheck`, `bun run lint`, and confirm `bun dev` starts without errors. (—)

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `cmdk` / shadcn Command component may require specific Dialog version | Build error or runtime mismatch | Install both `command` and `dialog` together via shadcn CLI which handles version alignment |
| Mode-specific CSS overrides may not cascade to shadcn components using CSS variables | Colors don't shift in child components | shadcn/ui components are built on CSS variables (`--color-*`). The `[data-mode]` selector overrides these variables on a wrapper element, and CSS inheritance ensures child components pick them up. Verify with visual testing. |
| TanStack Router layout routes may not support `beforeLoad` for auth guards in all cases | Unauthenticated users see flash of protected content | Use route-level `beforeLoad` that checks `context.userId` and throws `redirect({ to: '/' })` if absent. Also wrap in `<SignedIn>` at root level as belt-and-suspenders. |
| Skeleton components may cause layout shift when actual content loads | Jarring visual transition | Design skeleton shapes to match actual content dimensions. Use fixed heights/widths on skeleton blocks that match the loaded content structure. |
| `prefers-reduced-motion` may be inconsistently supported | Accessibility gap for motion-sensitive users | Test with `prefers-reduced-motion: reduce` emulation in DevTools. Fallback is a static skeleton (no shimmer), which is acceptable. |

### Dependencies on this story

- **Story 2.1 (Author Submission Form):** Uses `/submit/` route group, author layout, skeleton loading, error boundary
- **Story 2.4 (Triage Progress):** Uses design system status colors and skeleton loading
- **Story 3.1 (Editor Pipeline Dashboard):** Uses `/editor/` route group, editor layout with sidebar, status colors
- **Story 4.2 (Split-View Review Workspace):** Uses `/review/` route group, reviewer layout
- **Story 5.3 (Published Article Page):** Uses `/article/` route group, reader layout with warm palette
- **All subsequent stories:** Use skeleton loading, error boundaries, design system tokens, and cmd+K navigation

### What "done" looks like

- All 5 route groups exist with layout routes, placeholder pages, and empty states
- Navigating between route groups shows subtle background color temperature shifts
- cmd+K opens the command palette with Switch Role, Go To, and Search groups
- Selecting a role in the palette calls `switchRole` and updates the role badge
- Selecting a navigation item navigates to the correct route
- Route-level Suspense fallbacks show skeleton loading with CSS shimmer
- Error boundaries catch route-level errors without crashing the whole app
- `prefers-reduced-motion` disables shimmer animation
- Status color tokens (green, amber, red, blue, gray) are available as CSS variables
- Shadow system tokens are available as CSS variables
- `bun run typecheck` succeeds with zero errors
- `bun dev` runs without errors
- All new components follow the project's lint rules (separate `import type`, value imports first, `Array<T>` syntax)

## Dev Notes

- The `Command` component from shadcn/ui wraps `cmdk` which provides the fuzzy search, keyboard navigation, and grouping primitives. The `CommandDialog` variant includes the Dialog overlay.
- Route-level auth guards use TanStack Router's `beforeLoad` hook which runs before the component renders, preventing any flash of protected content.
- The `data-mode` attribute approach was chosen over React context or CSS classes because it works with pure CSS cascading, requires no React re-renders for mode switching, and is compatible with server-side rendering.
- For this story, the editor sidebar is a placeholder (simple nav links). The full sidebar with pipeline filters is built in Story 3.1.
- The `Kbd` component is a simple styled `<kbd>` element showing keyboard shortcut text (e.g., "⌘K"). It adjusts display based on platform detection (Mac vs Windows).
- Import conventions: value imports before type imports, separate `import type` statements.
- Use `Array<T>` syntax, not `T[]`.
- All new route files should use `createFileRoute` from `@tanstack/react-router`.

## Senior Developer Review (AI)

**Review Date:** 2026-02-08
**Reviewer:** Senior Developer Review (AI)
**Outcome:** APPROVED_WITH_IMPROVEMENTS
**TypeScript:** Pass | **ESLint:** Pass

### AC Validation

| AC | Status | Evidence |
|----|--------|----------|
| AC1: Role-based route groups | IMPLEMENTED | All 5 route groups at `/editor/`, `/review/`, `/submit/`, `/article/`, `/admin/` with layout routes, data-mode attributes, ErrorBoundary wrapping, placeholder pages with empty states |
| AC2: Mode-specific design tokens | IMPLEMENTED | `globals.css`: status colors (green, amber, red, blue, gray), shadow system (xs-xl), 5 data-mode overrides in oklch |
| AC3: cmd+K command palette | IMPLEMENTED | `command-palette.tsx`: CommandDialog with Switch Role (gated), Go To (role-aware), Search (placeholder); global cmd+K/ctrl+K listener |
| AC4: Skeleton loading states | IMPLEMENTED | `skeleton.tsx` primitive + `route-skeleton.tsx` with 3 variants (default/centered/sidebar) + CSS shimmer + prefers-reduced-motion |
| AC5: Error boundaries | IMPLEMENTED | `error-boundary.tsx`: class-based ErrorBoundary with styled fallback, "Try again" reset, configurable fallback prop |
| AC6: Enhanced root with trigger | IMPLEMENTED | `__root.tsx`: CommandPaletteTrigger in header with SearchIcon, "Search..." label, Kbd hint |

### Issues Found

#### Medium (5)

- **M1: ErrorBoundary custom fallback has no reset mechanism** [`app/components/error-boundary.tsx:38-39`] -- Custom `fallback` prop is `ReactNode`, not a render function receiving `onReset`. Custom fallbacks cannot clear error state.
- **M2: CommandPaletteTrigger uses synthetic KeyboardEvent** [`app/routes/__root.tsx:169-175`] -- Dispatches fake KeyboardEvent instead of sharing state or callback. Fragile coupling that breaks if event chain changes.
- **M3: ROLES constant duplicated across 3 files** [`app/components/command-palette.tsx:34`, `app/features/auth/role-switcher.tsx:16`, `app/features/auth/role-badge.tsx:5`] -- Same role-to-label mapping in three places violates DRY.
- **M4: Type assertion bypasses safety in role checks** [`app/routes/editor/route.tsx:29` and all protected layouts] -- `user.role as (typeof ALLOWED_ROLES)[number]` casts away type narrowing. Use a type guard function instead.
- **M5: Kbd hints show route paths, not keyboard shortcuts** [`app/components/command-palette.tsx:155`] -- `<Kbd>{item.to}</Kbd>` renders URL paths inside keyboard key elements, misleading for accessibility.

#### Low (3)

- **L1: skeleton-shimmer class applied redundantly** [`app/components/route-skeleton.tsx`] -- Skeleton component already includes `skeleton-shimmer`; RouteSkeleton adds it again.
- **L2: showRoleSwitcher logic duplicated** [`app/components/command-palette.tsx:31`, `app/routes/__root.tsx:109`] -- Same env check in two files.
- **L3: Trigger always shows Mac shortcut** [`app/routes/__root.tsx:181`] -- Hardcoded `⌘K` with no platform detection for Ctrl+K.

### Action Items

These are tracked as tech debt (TD-005 through TD-009) and should be addressed in follow-up work. None block subsequent stories.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Story implemented (route groups, design tokens, command palette, skeletons, error boundaries) | Dev Agent |
| 2026-02-08 | Senior Developer Review: APPROVED_WITH_IMPROVEMENTS -- 5 medium, 3 low issues identified | AI Reviewer |
