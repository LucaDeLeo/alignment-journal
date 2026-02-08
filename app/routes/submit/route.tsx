import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import * as React from 'react'

import { ErrorBoundary } from '~/components/error-boundary'
import { RouteSkeleton } from '~/components/route-skeleton'
import { useCurrentUser } from '~/features/auth'

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
  const user = useCurrentUser(true)
  const navigate = useNavigate()

  if (user === undefined) {
    return <RouteSkeleton variant="centered" />
  }

  if (!user || !ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
    void navigate({ to: '/' })
    return null
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
