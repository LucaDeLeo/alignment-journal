import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from '@tanstack/react-router'
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
} from '@clerk/tanstack-react-start'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { auth } from '@clerk/tanstack-react-start/server'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useMutation } from 'convex/react'

import { api } from '../../convex/_generated/api'

import type { ConvexQueryClient } from '@convex-dev/react-query'
import type { ConvexReactClient } from 'convex/react'
import type { QueryClient } from '@tanstack/react-query'
import { RoleBadge, RoleSwitcher, useCurrentUser } from '~/features/auth'
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
  const ensureUser = useMutation(api.users.ensureUser)
  const [isBootstrapped, setIsBootstrapped] = React.useState(false)
  const [bootstrapError, setBootstrapError] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    void ensureUser()
      .then(() => {
        if (!cancelled) {
          setIsBootstrapped(true)
        }
      })
      .catch(() => {
        // Auth timing or network failure — retry once after a short delay
        if (!cancelled) {
          setTimeout(() => {
            if (!cancelled) {
              void ensureUser()
                .then(() => {
                  if (!cancelled) {
                    setIsBootstrapped(true)
                  }
                })
                .catch(() => {
                  if (!cancelled) {
                    setBootstrapError(true)
                  }
                })
            }
          }, 2000)
        }
      })
    return () => {
      cancelled = true
    }
  }, [ensureUser])

  const user = useCurrentUser(isBootstrapped)

  if (bootstrapError) {
    return (
      <>
        <button
          className="text-xs text-destructive underline"
          onClick={() => {
            setBootstrapError(false)
            void ensureUser()
              .then(() => setIsBootstrapped(true))
              .catch(() => setBootstrapError(true))
          }}
        >
          Retry
        </button>
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
      <UserButton />
    </>
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
