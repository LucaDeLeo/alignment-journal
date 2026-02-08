import { createFileRoute } from '@tanstack/react-router'
import { FileTextIcon } from 'lucide-react'

export const Route = createFileRoute('/submit/$submissionId')({
  component: SubmitSubmissionDetail,
})

function SubmitSubmissionDetail() {
  const { submissionId } = Route.useParams()

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Submission Status
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Submission ID: {submissionId}
      </p>
      <div className="mt-12 flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <FileTextIcon className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-medium">Submission status view</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Your submission status, review progress, and editorial decisions will
          appear here.
        </p>
      </div>
    </main>
  )
}
