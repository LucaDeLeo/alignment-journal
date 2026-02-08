import { createFileRoute } from '@tanstack/react-router'

import type { Id } from '../../../convex/_generated/dataModel'

import { SubmissionDetail } from '~/features/submissions'

export const Route = createFileRoute('/submit/$submissionId')({
  component: SubmitSubmissionDetail,
})

function SubmitSubmissionDetail() {
  const { submissionId } = Route.useParams()

  return (
    <SubmissionDetail
      submissionId={submissionId as Id<'submissions'>}
    />
  )
}
