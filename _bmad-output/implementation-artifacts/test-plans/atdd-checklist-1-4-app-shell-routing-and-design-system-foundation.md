# ATDD Checklist: Story 1.4 — App Shell, Routing, and Design System Foundation

## AC1: Role-based route groups with placeholder pages

- [ ] Route groups exist at: `/editor/`, `/review/`, `/submit/`, `/article/`, `/admin/`
- [ ] Each route group has a layout route (`route.tsx`) that sets `data-mode` attribute
- [ ] Each layout wraps `<Outlet />` in a React Error Boundary
- [ ] Each route group has an `index.tsx` with heading and empty state
- [ ] `/article/` route is publicly accessible (no auth guard)
- [ ] All other route groups redirect to sign-in if unauthenticated (via `beforeLoad`)
- [ ] Route files follow kebab-case naming
- [ ] TanStack Router auto-generates route tree with new routes

## AC2: Mode-specific design system tokens

- [ ] `globals.css` has status colors: `--color-status-green`, `--color-status-amber`, `--color-status-red`, `--color-status-blue`, `--color-status-gray`
- [ ] Shadow system tokens: `--shadow-xs` through `--shadow-xl`
- [ ] `[data-mode="editor"]` overrides with cool palette
- [ ] `[data-mode="reviewer"]` overrides with neutral palette
- [ ] `[data-mode="author"]` overrides with slightly warmer palette
- [ ] `[data-mode="reader"]` overrides with warm cream/ivory palette
- [ ] `[data-mode="admin"]` overrides same as editor
- [ ] Existing font and border-radius tokens unchanged
- [ ] All color values use oklch

## AC3: cmd+K command palette

- [ ] cmd+K / ctrl+K opens command palette dialog
- [ ] "Switch Role" group visible only when `showRoleSwitcher` is true
- [ ] "Switch Role" lists all 5 roles with display names
- [ ] Selecting role calls `switchRole` mutation
- [ ] "Go To" group lists role-aware navigable routes
- [ ] "Search" group shows placeholder with "Coming soon"
- [ ] Palette closes on Escape, item selection, or outside click
- [ ] Kbd hints shown for shortcuts
- [ ] Trigger button in header

## AC4: Skeleton loading states with CSS shimmer

- [ ] `app/components/ui/skeleton.tsx` exists with base shimmer primitive
- [ ] CSS shimmer animation defined in globals.css
- [ ] Shimmer respects `prefers-reduced-motion`
- [ ] Route-level skeleton components created for each route group layout
- [ ] Skeletons used as Suspense fallbacks in layout routes

## AC5: Error boundaries per feature section

- [ ] Reusable `ErrorBoundary` component exists at `app/components/error-boundary.tsx`
- [ ] Error fallback shows description and "Try again" button
- [ ] Error boundary resets on "Try again"
- [ ] Error does not crash entire app (header/nav remain functional)

## AC6: Enhanced root layout with cmd+K trigger

- [ ] Existing header preserved (journal name, role badge, role switcher, user button)
- [ ] cmd+K trigger button added to header
- [ ] Trigger shows keyboard shortcut hint (⌘K)
- [ ] Header remains responsive

## Verification

- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes
