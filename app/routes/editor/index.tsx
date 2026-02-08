import { createFileRoute } from '@tanstack/react-router'
import { LayoutDashboardIcon } from 'lucide-react'

export const Route = createFileRoute('/editor/')({
  component: EditorDashboard,
})

function EditorDashboard() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Editor Dashboard
      </h1>
      <p className="mt-2 text-muted-foreground">
        Manage submissions, assign reviewers, and track the editorial pipeline.
      </p>
      <div className="mt-12 flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <LayoutDashboardIcon className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-medium">No submissions in the pipeline</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          When authors submit papers, they will appear here for triage and editorial processing.
        </p>
      </div>
    </main>
  )
}
