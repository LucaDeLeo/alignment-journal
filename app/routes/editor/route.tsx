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
import { EditorSidebar } from '~/features/editor'

const ALLOWED_ROLES = ['editor_in_chief', 'action_editor', 'admin'] as const

export const Route = createFileRoute('/editor')({
  beforeLoad: ({ context }) => {
    if (!context.userId) {
      throw redirect({ to: '/', search: { signIn: true } })
    }
  },
  component: EditorLayout,
})

function EditorLayout() {
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
    return <RouteSkeleton variant="sidebar" />
  }

  if (!hasAccess) {
    return <RouteSkeleton variant="sidebar" />
  }

  return (
    <div data-mode="editor" className="flex min-h-[calc(100vh-3.5rem)] bg-background">
      <EditorSidebar />
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>
          <React.Suspense fallback={<RouteSkeleton variant="default" />}>
            <Outlet />
          </React.Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
