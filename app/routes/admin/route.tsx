import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import * as React from 'react'

import { ErrorBoundary } from '~/components/error-boundary'
import { RouteSkeleton } from '~/components/route-skeleton'
import { hasRole, useBootstrappedUser } from '~/features/auth'

const ALLOWED_ROLES = ['admin'] as const

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ context }) => {
    if (!context.userId) {
      throw redirect({ to: '/', search: { signIn: true } })
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  const { user } = useBootstrappedUser()
  const navigate = useNavigate()

  const hasAccess =
    user && hasRole(user.role, ALLOWED_ROLES)

  React.useEffect(() => {
    if (user !== undefined && !hasAccess) {
      void navigate({ to: '/' })
    }
  }, [user, hasAccess, navigate])

  if (user === undefined) {
    return <RouteSkeleton variant="default" />
  }

  if (!hasAccess) {
    return <RouteSkeleton variant="default" />
  }

  return (
    <div data-mode="admin" className="min-h-[calc(100vh-3.5rem)] bg-background">
      <ErrorBoundary>
        <React.Suspense fallback={<RouteSkeleton variant="default" />}>
          <Outlet />
        </React.Suspense>
      </ErrorBoundary>
    </div>
  )
}
