import {
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
  useNavigate,
} from '@tanstack/react-router'
import * as React from 'react'

import { ErrorBoundary } from '~/components/error-boundary'
import { RouteSkeleton } from '~/components/route-skeleton'
import { hasRole, useBootstrappedUser } from '~/features/auth'

const ALLOWED_ROLES = ['reviewer', 'admin'] as const

export const Route = createFileRoute('/review')({
  beforeLoad: ({ context, location }) => {
    // Allow accept route through without auth check (handles its own auth)
    if (location.pathname.startsWith('/review/accept/')) {
      return
    }
    if (!context.userId) {
      throw redirect({ to: '/', search: { signIn: true } })
    }
  },
  component: ReviewLayout,
})

function ReviewLayout() {
  const { user } = useBootstrappedUser()
  const navigate = useNavigate()
  const location = useLocation()

  const isAcceptRoute = location.pathname.startsWith('/review/accept/')

  const hasAccess =
    isAcceptRoute || (user && hasRole(user.role, ALLOWED_ROLES))

  React.useEffect(() => {
    if (!isAcceptRoute && user !== undefined && !hasAccess) {
      void navigate({ to: '/' })
    }
  }, [user, hasAccess, navigate, isAcceptRoute])

  // Accept route manages its own auth flow — render outlet directly
  if (isAcceptRoute) {
    return (
      <div data-mode="reviewer" className="min-h-[calc(100vh-3.5rem)] bg-background">
        <ErrorBoundary>
          <React.Suspense fallback={<RouteSkeleton variant="default" />}>
            <Outlet />
          </React.Suspense>
        </ErrorBoundary>
      </div>
    )
  }

  if (user === undefined) {
    return <RouteSkeleton variant="default" />
  }

  if (!hasAccess) {
    return <RouteSkeleton variant="default" />
  }

  return (
    <div data-mode="reviewer" className="min-h-[calc(100vh-3.5rem)] bg-background">
      <ErrorBoundary>
        <React.Suspense fallback={<RouteSkeleton variant="default" />}>
          <Outlet />
        </React.Suspense>
      </ErrorBoundary>
    </div>
  )
}
