import { createFileRoute } from '@tanstack/react-router'

import { ReviewerPool } from '~/features/admin'

export const Route = createFileRoute('/admin/')({
  component: AdminPanel,
})

function AdminPanel() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
      <p className="mt-2 text-muted-foreground">
        Manage users, roles, and platform settings.
      </p>
      <div className="mt-8">
        <ReviewerPool />
      </div>
    </main>
  )
}
