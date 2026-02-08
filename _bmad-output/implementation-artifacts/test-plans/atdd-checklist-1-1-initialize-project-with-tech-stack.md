# ATDD Checklist: Story 1.1 - Initialize Project with Tech Stack

## AC1: Project scaffolding from template
- [x] `package.json` exists with name `alignment-journal`
- [x] TanStack Start + Convex + React Query wiring present
- [x] TanStack Router file-based routing configured
- [x] ConvexProvider + ConvexQueryClient integration wired
- [x] TypeScript strict mode enabled in `tsconfig.json`

## AC2: All required dependencies installed
- [x] `@clerk/tanstack-react-start` installed (newer name for `@clerk/tanstack-start`)
- [x] `@convex-dev/react-query` installed
- [x] `tailwindcss`, `@tailwindcss/typography`, `@tailwindcss/vite` installed
- [x] `motion` installed
- [x] `babel-plugin-react-compiler` installed
- [x] `ai` and `@ai-sdk/anthropic` installed
- [x] `unpdf` installed
- [x] `zod` installed
- [x] `cmdk` installed
- [x] `clsx` and `tailwind-merge` installed
- [x] `lucide-react` installed
- [x] shadcn/ui initialized (via `bunx shadcn@latest add button`)

## AC3: Tailwind CSS v4 configured
- [x] `app/styles/globals.css` contains `@import "tailwindcss"` directive
- [x] CSS custom properties defined for design system color tokens
- [x] Tailwind Vite plugin configured in build config
- [x] `@tailwindcss/typography` plugin available via `@plugin` directive

## AC4: shadcn/ui initialized
- [x] `components.json` exists with correct aliases (`~/components/ui`, `~/lib/utils`)
- [x] `app/lib/utils.ts` exists with `cn()` utility function
- [x] `button` component installed to verify pipeline
- [x] shadcn/ui uses `new-york` style variant

## AC5: Font files and CSS configured
- [x] Satoshi variable font files in `public/fonts/satoshi/`
- [x] JetBrains Mono variable font files in `public/fonts/jetbrains-mono/`
- [x] `@font-face` declarations in `globals.css` for Satoshi and JetBrains Mono
- [x] Newsreader loaded via Google Fonts CDN link in `__root.tsx` head
- [x] CSS custom properties set font families (Satoshi sans, Newsreader serif, JetBrains Mono mono)

## AC6: React Compiler configured
- [x] `babel-plugin-react-compiler` configured in vite.config.ts via viteReact babel plugins
- [x] Compiler runs at build time with zero runtime overhead

## AC7: Environment configuration
- [x] `.env.local` is gitignored with placeholders for `VITE_CONVEX_URL` and `VITE_CLERK_PUBLISHABLE_KEY`
- [x] `.env.example` committed with placeholder values for all required env vars
- [x] Convex backend env vars documented as "set in Convex Dashboard"

## AC8: Development server starts successfully
- [x] `bun dev` script configured to start both Vite and Convex dev servers concurrently
- [x] TypeScript compiles with zero errors (`bun run typecheck`)

## AC9: Build succeeds
- [x] `bun run build` completes without TypeScript errors
- [x] `bun run build` completes without Vite/bundler errors

## Verification Command
```bash
bun run typecheck && bun run lint && bun run test
```

**Result: ALL PASSING**
