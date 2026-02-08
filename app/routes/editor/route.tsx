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
  const user = useCurrentUser(true)
  const navigate = useNavigate()

  if (user === undefined) {
    return <RouteSkeleton variant="sidebar" />
  }

  if (!user || !ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
    void navigate({ to: '/' })
    return null
  }

  return (
    <div data-mode="editor" className="min-h-[calc(100vh-3.5rem)] bg-background">
      <ErrorBoundary>
        <React.Suspense fallback={<RouteSkeleton variant="sidebar" />}>
          <Outlet />
        </React.Suspense>
      </ErrorBoundary>
    </div>
  )
}
