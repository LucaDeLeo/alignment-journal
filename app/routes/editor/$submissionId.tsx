import { createFileRoute } from '@tanstack/react-router'

import type { Id } from '../../../convex/_generated/dataModel'

import { EditorSubmissionDetail } from '~/features/editor'

export const Route = createFileRoute('/editor/$submissionId')({
  component: EditorSubmissionDetailRoute,
})

function EditorSubmissionDetailRoute() {
  const { submissionId } = Route.useParams()

  return (
    <EditorSubmissionDetail
      submissionId={submissionId as Id<'submissions'>}
    />
  )
}
