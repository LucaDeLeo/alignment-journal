import { Outlet, createFileRoute } from '@tanstack/react-router'
import * as React from 'react'

import { ErrorBoundary } from '~/components/error-boundary'
import { RouteSkeleton } from '~/components/route-skeleton'

export const Route = createFileRoute('/article')({
  component: ArticleLayout,
})

function ArticleLayout() {
  return (
    <div data-mode="reader" className="min-h-[calc(100vh-3.5rem)] bg-background">
      <ErrorBoundary>
        <React.Suspense fallback={<RouteSkeleton variant="centered" />}>
          <Outlet />
        </React.Suspense>
      </ErrorBoundary>
    </div>
  )
}
