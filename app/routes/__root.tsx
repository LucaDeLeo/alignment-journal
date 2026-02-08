import {
  HeadContent,
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
import { RoleBadge, RoleSwitcher, useBootstrappedUser } from '~/features/auth'
import { Button } from '~/components/ui/button'
import { Kbd } from '~/components/ui/kbd'
import { CommandPalette } from '~/components/command-palette'
import appCss from '~/styles/globals.css?url'

const fetchClerkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { getToken, userId } = await auth()
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
    ],
    links: [
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

/**
 * Bootstraps the Convex user record and renders role-aware header content.
 * Only rendered inside `<SignedIn>` so Clerk auth is guaranteed.
 */
function AuthenticatedHeader() {
  const { user, isBootstrapped, bootstrapError } = useBootstrappedUser()
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false)

  if (bootstrapError) {
    return (
      <>
        <span className="text-xs text-destructive">
          Failed to load user
        </span>
        <UserButton />
      </>
    )
  }

  return (
    <>
      {user && (
        <>
          <RoleBadge role={user.role} />
          {showRoleSwitcher && <RoleSwitcher currentRole={user.role} />}
        </>
      )}
      <CommandPaletteTrigger onToggle={() => setCommandPaletteOpen((prev) => !prev)} />
      <CommandPalette
        isBootstrapped={isBootstrapped}
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
      <UserButton />
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
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <span className="text-lg font-semibold tracking-tight">
              Alignment Journal
            </span>
            <div className="flex items-center gap-4">
              <SignedIn>
                <AuthenticatedHeader />
              </SignedIn>
              <SignedOut>
                <SignInAutoOpen />
                <SignInButton mode="modal" />
              </SignedOut>
            </div>
          </div>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
