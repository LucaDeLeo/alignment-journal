import { createFileRoute } from '@tanstack/react-router'
import { UsersIcon } from 'lucide-react'

export const Route = createFileRoute('/review/')({
  component: ReviewWorkspace,
})

function ReviewWorkspace() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Review Workspace
      </h1>
      <p className="mt-2 text-muted-foreground">
        Review assigned submissions and provide structured feedback.
      </p>
      <div className="mt-12 flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <UsersIcon className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-medium">No reviews assigned</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          When you are invited to review a submission, it will appear here with the review form and paper viewer.
        </p>
      </div>
    </main>
  )
}
