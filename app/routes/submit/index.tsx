import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'

import { useBootstrappedUser } from '~/features/auth'
import { SubmissionForm, SubmissionList } from '~/features/submissions'

export const Route = createFileRoute('/submit/')({
  component: SubmitIndex,
})

function SubmitIndex() {
  const [showForm, setShowForm] = React.useState(false)
  const { user } = useBootstrappedUser()

  const isAuthor = user?.role === 'author'

  if (showForm && user) {
    return (
      <SubmissionForm
        userName={user.name}
        userAffiliation={user.affiliation}
        onCancel={() => setShowForm(false)}
        onSuccess={() => setShowForm(false)}
      />
    )
  }

  return (
    <SubmissionList
      onNewSubmission={() => setShowForm(true)}
      showNewButton={isAuthor}
    />
  )
}
