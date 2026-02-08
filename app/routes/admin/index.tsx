import { createFileRoute } from '@tanstack/react-router'
import { ShieldIcon } from 'lucide-react'

export const Route = createFileRoute('/admin/')({
  component: AdminPanel,
})

function AdminPanel() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Admin Panel
      </h1>
      <p className="mt-2 text-muted-foreground">
        Manage users, roles, and platform settings.
      </p>
      <div className="mt-12 flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <ShieldIcon className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-medium">User management coming soon</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          The admin panel will provide tools for managing user accounts, roles, and platform configuration.
        </p>
      </div>
    </main>
  )
}
