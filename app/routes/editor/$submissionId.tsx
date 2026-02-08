import { createFileRoute } from '@tanstack/react-router'
import { FileTextIcon } from 'lucide-react'

export const Route = createFileRoute('/editor/$submissionId')({
  component: EditorSubmissionDetail,
})

function EditorSubmissionDetail() {
  const { submissionId } = Route.useParams()

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Submission Detail
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Submission ID: {submissionId}
      </p>
      <div className="mt-12 flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <FileTextIcon className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-medium">Submission detail view</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Triage results, reviewer assignment, and editorial actions will appear
          here.
        </p>
      </div>
    </main>
  )
}
