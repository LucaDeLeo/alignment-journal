# Story 1.1: Initialize Project with Tech Stack

## Story

**As a** developer,
**I want** the project initialized with TanStack Start + Convex + all required dependencies,
**So that** I have a working development environment to build on.

## Status

**Epic:** 1 - Project Foundation & Authentication
**Status:** complete
**Priority:** Highest (blocks all subsequent stories)

## Context

This is the first implementation story. It scaffolds the project from the official Convex TanStack Start minimal template, then layers on all required dependencies per the architecture document. The architecture explicitly specifies this as the first implementation priority.

**Tech stack defined in architecture:**
- **Framework:** TanStack Start (RC) with file-based routing via TanStack Router
- **Backend:** Convex (reactive database, serverless functions, file storage)
- **Auth:** Clerk via `@clerk/tanstack-start`
- **Styling:** Tailwind CSS + shadcn/ui
- **Animation:** Motion (Framer Motion)
- **Build optimization:** React Compiler via `babel-plugin-react-compiler`
- **LLM integration:** Vercel AI SDK (`ai`)
- **PDF extraction:** `unpdf`
- **Fonts:** Satoshi (geometric sans-serif, self-hosted), Newsreader (transitional serif, Google Fonts CDN), JetBrains Mono (monospace, self-hosted)
- **Package manager:** Bun exclusively (`bun install`, `bun dev`, `bunx`)
- **Deployment target:** Vercel

## Acceptance Criteria

### AC1: Project scaffolding from template
**Given** a fresh project directory
**When** the TanStack Start + Convex template is initialized
**Then:**
- The project scaffolds with TanStack Start + Convex + React Query wiring
- `package.json` exists with correct project name (`alignment-journal`)
- TanStack Router file-based routing is configured
- Convex client integration is wired (ConvexProvider + ConvexQueryClient)
- The project uses TypeScript with strict mode enabled

### AC2: All required dependencies installed
**Given** the scaffolded project
**When** all architecture-specified dependencies are added
**Then** the following packages are installed without version conflicts:
- `@clerk/tanstack-start` + `@clerk/clerk-react` — Clerk authentication
- `@convex-dev/react-query` — Convex + React Query bridge
- `tailwindcss` + `@tailwindcss/typography` + `@tailwindcss/vite` — Tailwind CSS v4
- `motion` — Animation library (Framer Motion)
- `babel-plugin-react-compiler` — React Compiler
- `ai` + `@ai-sdk/anthropic` — Vercel AI SDK with Anthropic provider
- `unpdf` — PDF text extraction
- `zod` — Frontend form validation + AI SDK structured output
- `cmdk` — Command palette foundation
- `clsx` + `tailwind-merge` — Utility class merging (for `cn()` helper)
- `lucide-react` — Icon library
- shadcn/ui components installed via `bunx shadcn@latest init`

### AC3: Tailwind CSS v4 configured
**Given** the installed dependencies
**When** Tailwind CSS is configured
**Then:**
- `app/styles/globals.css` contains Tailwind v4 `@import "tailwindcss"` directive
- CSS custom properties are defined for the design system color tokens (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart colors)
- The Tailwind Vite plugin is configured in `app.config.ts`
- `@tailwindcss/typography` plugin is available for prose styling

### AC4: shadcn/ui initialized
**Given** Tailwind CSS is configured
**When** shadcn/ui is initialized
**Then:**
- `components.json` exists with correct configuration (aliases pointing to `app/components/ui`, `app/lib/utils`)
- `app/lib/utils.ts` exists with the `cn()` utility function
- At least the `button` component is installed to verify the pipeline works
- shadcn/ui uses the `new-york` style variant

### AC5: Font files and CSS configured
**Given** the project structure
**When** fonts are configured
**Then:**
- Satoshi variable font files are placed in `public/fonts/satoshi/`
- JetBrains Mono variable font files are placed in `public/fonts/jetbrains-mono/`
- `@font-face` declarations in `globals.css` load Satoshi and JetBrains Mono from local files
- Newsreader is loaded via Google Fonts CDN link
- CSS custom properties set Satoshi as the default sans-serif, Newsreader as the serif, and JetBrains Mono as the monospace font

### AC6: React Compiler configured
**Given** the project dependencies
**When** `app.config.ts` is configured
**Then:**
- `babel-plugin-react-compiler` is configured in the Vite babel plugin pipeline
- The compiler runs at build time with zero runtime overhead
- No manual `useMemo`, `useCallback`, or `React.memo` are needed

### AC7: Environment configuration
**Given** the project
**When** environment files are set up
**Then:**
- `.env.local` is gitignored and contains placeholders for `CONVEX_URL` and `CLERK_PUBLISHABLE_KEY`
- `.env.example` is committed with placeholder values documenting all required env vars
- Convex backend env vars (API keys) are documented as "set in Convex Dashboard"

### AC8: Development server starts successfully
**Given** the fully configured project
**When** `bun dev` is executed
**Then:**
- Both Vite frontend dev server and Convex dev server start concurrently
- The app renders in the browser without errors
- TypeScript compiles with zero errors in strict mode
- Hot Module Replacement works (edit a component, see update without refresh)
- Convex client connects successfully (connection status visible in browser console)

### AC9: Build succeeds
**Given** the configured project
**When** `bun run build` is executed
**Then:**
- The build completes without TypeScript errors
- The build completes without Vite/bundler errors
- The output is deployable to Vercel

## Technical Notes

### Initialization sequence (architecture-specified order)
1. `bunx create-convex -- -t tanstack-start` — scaffold project
2. Install Clerk packages + configure Convex Clerk integration
3. Install and configure Tailwind CSS v4
4. Initialize shadcn/ui
5. Install Motion (Framer Motion)
6. Configure React Compiler in `app.config.ts`
7. Install Vercel AI SDK + Anthropic provider
8. Install unpdf
9. Set up fonts (download Satoshi, JetBrains Mono; configure Google Fonts for Newsreader)
10. Create `.env.example` and `.env.local`

### Key architectural constraints
- Use `bun` and `bunx` exclusively — never `npm` or `npx`
- TypeScript strict mode must be enabled
- Tailwind CSS v4 uses `@import "tailwindcss"` not `@tailwind` directives
- shadcn/ui aliases must point to `app/` paths (not `src/`)
- React Compiler eliminates the need for manual memoization hooks
- Convex dev server requires internet connection (cloud-hosted dev backend)

### File structure to create/verify
```
alignment-journal/
├── package.json
├── bun.lock
├── tsconfig.json
├── app.config.ts                    # TanStack Start + React Compiler
├── tailwind.config.ts               # (if needed for v4, otherwise CSS-only)
├── components.json                  # shadcn/ui config
├── .env.local                       # CONVEX_URL, CLERK_PUBLISHABLE_KEY
├── .env.example                     # Template for required vars
├── .gitignore
├── convex/
│   ├── _generated/                  # Auto-generated by Convex
│   └── ...                          # Template files
├── app/
│   ├── client.tsx
│   ├── router.tsx
│   ├── ssr.tsx
│   ├── routes/
│   │   ├── __root.tsx
│   │   └── index.tsx
│   ├── components/
│   │   └── ui/                      # shadcn/ui components
│   │       └── button.tsx           # Verify shadcn pipeline
│   ├── lib/
│   │   └── utils.ts                 # cn() helper
│   └── styles/
│       └── globals.css              # Tailwind + fonts + CSS vars
└── public/
    └── fonts/
        ├── satoshi/                 # Variable font files
        └── jetbrains-mono/          # Variable font files
```

### Dependencies NOT installed in this story
- Clerk + Convex integration wiring — packages are installed here but auth provider setup and webhook integration happen in Story 1.3
- Convex schema definition (Story 1.2)
- Route structure beyond template defaults (Story 1.4)
- Any feature components (later stories)

### What "done" looks like
- `bun dev` starts both servers, app renders in browser
- `bun run build` completes with zero errors
- All fonts render correctly in the browser
- shadcn/ui Button component renders with correct styling
- React Compiler is active (no warnings about missing memoization)
- Tailwind classes apply correctly
- No version conflicts in `bun.lock`

## Dev Notes

- The Convex template may come with a sample `convex/` function — leave it for now, Story 1.2 will replace it with the real schema
- Clerk packages are installed here but full auth integration (webhook, Convex user sync) happens in Story 1.3
- The architecture specifies Tailwind CSS v4 — check for any breaking changes vs v3 patterns
- Font files (Satoshi, JetBrains Mono) can be downloaded from Fontshare and Google Fonts respectively
- If `create-convex` template includes demo pages/components, they can be simplified but keep the core wiring intact
- **Config file note:** The architecture references `app.config.ts` but TanStack Start RC now uses `vite.config.ts` with the `tanstackStart()` plugin from `@tanstack/react-start/plugin/vite`. Use whichever config file the template generates and configure Tailwind and React Compiler plugins there.
