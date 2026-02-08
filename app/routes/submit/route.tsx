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

const ALLOWED_ROLES = ['author', 'admin'] as const

export const Route = createFileRoute('/submit')({
  beforeLoad: ({ context }) => {
    if (!context.userId) {
      throw redirect({ to: '/', search: { signIn: true } })
    }
  },
  component: SubmitLayout,
})

function SubmitLayout() {
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
    return <RouteSkeleton variant="centered" />
  }

  if (!hasAccess) {
    return <RouteSkeleton variant="centered" />
  }

  return (
    <div data-mode="author" className="min-h-[calc(100vh-3.5rem)] bg-background">
      <ErrorBoundary>
        <React.Suspense fallback={<RouteSkeleton variant="centered" />}>
          <Outlet />
        </React.Suspense>
      </ErrorBoundary>
    </div>
  )
}
