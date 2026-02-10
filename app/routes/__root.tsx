import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
  useSearch,
} from '@tanstack/react-router'
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
  useClerk,
} from '@clerk/tanstack-react-start'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { auth } from '@clerk/tanstack-react-start/server'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { SearchIcon } from 'lucide-react'

import type { ConvexQueryClient } from '@convex-dev/react-query'
import type { ConvexReactClient } from 'convex/react'
import type { QueryClient } from '@tanstack/react-query'
import { RoleSwitcher, useBootstrappedUser } from '~/features/auth'
import { Button } from '~/components/ui/button'
import { Kbd } from '~/components/ui/kbd'
import { Toaster } from '~/components/ui/sonner'
import { CommandPalette } from '~/components/command-palette'
import appCss from '~/styles/globals.css?url'

const fetchClerkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { getToken, userId } = await auth()
  if (!userId) {
    return { userId: null, token: null }
  }
  const token = await getToken({ template: 'convex' })

  return {
    userId,
    token,
  }
})

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  convexClient: ConvexReactClient
  convexQueryClient: ConvexQueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Alignment Journal',
      },
      {
        name: 'description',
        content:
          'A peer-reviewed journal for theoretical AI alignment research, featuring LLM-assisted editorial triage and open reviewer abstracts.',
      },
      // Open Graph
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:title',
        content: 'Alignment Journal',
      },
      {
        property: 'og:description',
        content:
          'A peer-reviewed journal for theoretical AI alignment research, featuring LLM-assisted editorial triage and open reviewer abstracts.',
      },
      {
        property: 'og:site_name',
        content: 'Alignment Journal',
      },
      // Twitter / X
      {
        name: 'twitter:card',
        content: 'summary',
      },
      {
        name: 'twitter:title',
        content: 'Alignment Journal',
      },
      {
        name: 'twitter:description',
        content:
          'A peer-reviewed journal for theoretical AI alignment research, featuring LLM-assisted editorial triage and open reviewer abstracts.',
      },
    ],
    links: [
      // Preload primary fonts to eliminate FOUT
      {
        rel: 'preload',
        href: '/fonts/satoshi/Satoshi-Variable.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: '/fonts/jetbrains-mono/JetBrainsMono-Variable.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap',
      },
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
    ],
  }),
  beforeLoad: async (ctx) => {
    const clerkAuth = await fetchClerkAuth()
    const { userId, token } = clerkAuth
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)
    }

    return {
      userId,
      token,
    }
  },
  component: RootComponent,
})

function RootComponent() {
  const context = useRouteContext({ from: Route.id })

  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={context.convexClient} useAuth={useAuth}>
        <RootDocument>
          <Outlet />
        </RootDocument>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}

/** Whether the role switcher UI should be visible. */
const showRoleSwitcher =
  import.meta.env.DEV || !!import.meta.env.VITE_SHOW_ROLE_SWITCHER

/** Route navigation items with role-based access. `roles: null` means public. */
const NAV_ITEMS: Array<{
  to: string
  label: string
  roles: ReadonlyArray<string> | null
}> = [
  { to: '/submit', label: 'Submit', roles: ['author', 'admin'] },
  { to: '/editor', label: 'Editor', roles: ['editor_in_chief', 'action_editor', 'admin'] },
  { to: '/review', label: 'Review', roles: ['reviewer', 'admin'] },
  { to: '/article', label: 'Articles', roles: null },
  { to: '/admin', label: 'Admin', roles: ['admin', 'editor_in_chief'] },
]

/** Renders nav links, greying out routes inaccessible to the current role. */
function NavLinks({ role }: { role: string | null | undefined }) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const accessible =
          item.roles === null || (role != null && item.roles.includes(role))

        if (accessible) {
          return (
            <Link
              key={item.to}
              to={item.to}
              className="px-2.5 py-1.5 text-sm font-medium transition-colors"
              activeProps={{ className: 'text-foreground' }}
              inactiveProps={{
                className: 'text-muted-foreground hover:text-foreground',
              }}
            >
              {item.label}
            </Link>
          )
        }

        return (
          <span
            key={item.to}
            className="px-2.5 py-1.5 text-sm font-medium text-muted-foreground/40"
          >
            {item.label}
          </span>
        )
      })}
    </>
  )
}

/**
 * Bootstraps the Convex user record and renders role-aware nav + header controls.
 * Only rendered inside `<SignedIn>` so Clerk auth is guaranteed.
 */
function AuthenticatedHeader() {
  const { user, isBootstrapped, bootstrapError } = useBootstrappedUser()
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false)

  return (
    <>
      <nav className="ml-6 hidden items-center gap-1 md:flex">
        <NavLinks role={user?.role ?? null} />
      </nav>
      <div className="ml-auto flex items-center gap-4">
        {bootstrapError ? (
          <>
            <span className="text-xs text-destructive">
              Failed to load user
            </span>
            <UserButton />
          </>
        ) : (
          <>
            {user && showRoleSwitcher && (
              <RoleSwitcher currentRole={user.role} />
            )}
            <CommandPaletteTrigger onToggle={() => setCommandPaletteOpen((prev) => !prev)} />
            <CommandPalette
              isBootstrapped={isBootstrapped}
              open={commandPaletteOpen}
              onOpenChange={setCommandPaletteOpen}
            />
            <UserButton />
          </>
        )}
      </div>
    </>
  )
}

/** Nav + sign-in controls for unauthenticated users. */
function UnauthenticatedHeader() {
  return (
    <>
      <nav className="ml-6 hidden items-center gap-1 md:flex">
        <NavLinks role={null} />
      </nav>
      <div className="ml-auto flex items-center gap-4">
        <SignInAutoOpen />
        <SignInButton mode="modal" />
      </div>
    </>
  )
}

/**
 * Opens the Clerk sign-in modal when `?signIn=true` is in the URL.
 * Used by protected route redirects to prompt unauthenticated users.
 */
function SignInAutoOpen() {
  const clerk = useClerk()
  const search = useSearch({ strict: false })
  const signIn = (search as Record<string, unknown>).signIn

  React.useEffect(() => {
    if (signIn && clerk.loaded) {
      clerk.openSignIn()
    }
  }, [signIn, clerk])

  return null
}

/** Detects whether the user is on a Mac platform. */
function useIsMac() {
  const [isMac, setIsMac] = React.useState(true)

  React.useEffect(() => {
    const nav = navigator as Navigator & {
      userAgentData?: { platform: string }
    }
    setIsMac(
      nav.platform.startsWith('Mac') ||
        nav.userAgentData?.platform === 'macOS',
    )
  }, [])

  return isMac
}

function CommandPaletteTrigger({ onToggle }: { onToggle: () => void }) {
  const isMac = useIsMac()

  return (
    <Button
      variant="outline"
      size="sm"
      className="hidden gap-2 text-muted-foreground md:inline-flex"
      onClick={onToggle}
    >
      <SearchIcon className="size-3.5" />
      <span className="text-xs">Search...</span>
      <Kbd>{isMac ? '\u2318K' : 'Ctrl+K'}</Kbd>
    </Button>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex h-14 max-w-7xl items-center px-6">
            <Link
              to="/"
              className="shrink-0 text-lg font-semibold tracking-tight"
            >
              Alignment Journal
            </Link>
            <SignedIn>
              <AuthenticatedHeader />
            </SignedIn>
            <SignedOut>
              <UnauthenticatedHeader />
            </SignedOut>
          </div>
        </header>
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}
