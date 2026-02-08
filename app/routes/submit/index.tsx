import { createFileRoute } from '@tanstack/react-router'
import { PenToolIcon } from 'lucide-react'

export const Route = createFileRoute('/submit/')({
  component: SubmitIndex,
})

function SubmitIndex() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        My Submissions
      </h1>
      <p className="mt-2 text-muted-foreground">
        Submit new papers and track the status of your existing submissions.
      </p>
      <div className="mt-12 flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <PenToolIcon className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-medium">No submissions yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Create your first submission to begin the peer review process.
        </p>
      </div>
    </main>
  )
}
