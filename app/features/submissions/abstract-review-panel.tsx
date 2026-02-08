import { useMutation, useQuery } from 'convex/react'
import { CheckIcon, EyeOffIcon, MessageSquareIcon, UserIcon } from 'lucide-react'
import { useState } from 'react'

import { api } from '../../../convex/_generated/api'
import { formatDate } from './status-utils'

import type { Id } from '../../../convex/_generated/dataModel'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'

interface AbstractReviewPanelProps {
  submissionId: Id<'submissions'>
}

export function AbstractReviewPanel({
  submissionId,
}: AbstractReviewPanelProps) {
  const abstractData = useQuery(api.reviewerAbstracts.getBySubmission, {
    submissionId,
  })
  const acceptAbstract = useMutation(
    api.reviewerAbstracts.authorAcceptAbstract,
  )
  const [isAccepting, setIsAccepting] = useState(false)

  // Loading or no abstract — render nothing
  if (abstractData === undefined || abstractData === null) {
    return null
  }

  // Don't show drafting abstracts to author
  if (abstractData.status === 'drafting') {
    return null
  }

  async function handleAccept() {
    setIsAccepting(true)
    try {
      await acceptAbstract({ submissionId })
    } catch {
      // Error handled reactively via query subscription
    } finally {
      setIsAccepting(false)
    }
  }

  const isAccepted = abstractData.authorAccepted === true

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Reviewer Abstract
        </h2>
        <div className="flex items-center gap-2">
          {isAccepted && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckIcon className="mr-1 size-3" />
              Accepted
            </Badge>
          )}
          <Badge variant="outline">
            {abstractData.status === 'approved' ? 'Approved' : 'Submitted'}
          </Badge>
        </div>
      </div>

      <div className="mt-3 rounded-lg border p-4">
        <p className="font-serif text-base leading-relaxed text-foreground">
          {abstractData.content}
        </p>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {abstractData.isSigned ? (
              <UserIcon className="size-3.5" />
            ) : (
              <EyeOffIcon className="size-3.5" />
            )}
            <span>
              By{' '}
              {abstractData.isSigned
                ? abstractData.reviewerName
                : 'Anonymous Reviewer'}
            </span>
          </div>
          <span>{abstractData.wordCount} words</span>
        </div>

        {isAccepted && abstractData.authorAcceptedAt && (
          <p className="mt-2 text-xs text-green-700 dark:text-green-400">
            Accepted on {formatDate(abstractData.authorAcceptedAt)}
          </p>
        )}
      </div>

      {!isAccepted && (
        <div className="mt-4 flex items-center justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isAccepting}>
                <CheckIcon className="mr-2 size-4" />
                Accept Abstract
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Accept this reviewer abstract?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Accept this reviewer abstract for publication? This confirms
                  you&apos;re satisfied with how your work is represented.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void handleAccept()}
                  disabled={isAccepting}
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageSquareIcon className="size-3.5" />
            Use the discussion thread below to provide feedback
          </p>
        </div>
      )}
    </section>
  )
}
