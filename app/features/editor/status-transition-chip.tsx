import { useMutation } from 'convex/react'
import { ConvexError } from 'convex/values'
import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { api } from '../../../convex/_generated/api'
import { VALID_TRANSITIONS } from '../../../convex/helpers/transitions'
import { STATUS_COLORS, STATUS_LABELS } from '../submissions/status-utils'

import type { Id } from '../../../convex/_generated/dataModel'
import type { SubmissionStatus } from '../../../convex/helpers/transitions'

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'

interface StatusTransitionChipProps {
  submissionId: Id<'submissions'>
  currentStatus: SubmissionStatus
  isDecisionPanelActive?: boolean
}

export function StatusTransitionChip({
  submissionId,
  currentStatus,
  isDecisionPanelActive,
}: StatusTransitionChipProps) {
  const transitionStatus = useMutation(api.submissions.transitionStatus)
  const [isPending, setIsPending] = React.useState(false)

  const validTransitions = VALID_TRANSITIONS[currentStatus]

  async function handleTransition(newStatus: SubmissionStatus) {
    setIsPending(true)
    try {
      await transitionStatus({ submissionId, newStatus })
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { code?: string }
        if (data.code === 'INVALID_TRANSITION') {
          console.error('Status already changed — please refresh')
        }
      }
    } finally {
      setIsPending(false)
    }
  }

  // Terminal states or decision panel active — non-interactive badge
  if (validTransitions.length === 0 || isDecisionPanelActive) {
    return (
      <Badge className={STATUS_COLORS[currentStatus]}>
        {STATUS_LABELS[currentStatus]}
      </Badge>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isPending}>
        <button
          className="inline-flex items-center gap-1 rounded-md cursor-pointer hover:ring-2 hover:ring-ring/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
          title="Click to change status"
        >
          <Badge className={`${STATUS_COLORS[currentStatus]} px-3 py-1`}>
            {STATUS_LABELS[currentStatus]}
            <ChevronDown className="ml-1 size-3.5" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {validTransitions.map((targetStatus) =>
          targetStatus === 'DESK_REJECTED' ? (
            <DeskRejectItem
              key={targetStatus}
              onConfirm={() => handleTransition(targetStatus)}
              isPending={isPending}
            />
          ) : (
            <DropdownMenuItem
              key={targetStatus}
              onClick={() => handleTransition(targetStatus)}
              disabled={isPending}
            >
              <span
                className={`mr-2 inline-block size-2 rounded-full ${STATUS_COLORS[targetStatus].split(' ')[0]}`}
              />
              {STATUS_LABELS[targetStatus]}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DeskRejectItem({
  onConfirm,
  isPending,
}: {
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          disabled={isPending}
        >
          <span className="mr-2 inline-block size-2 rounded-full bg-[var(--color-status-red)]" />
          Desk Reject
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desk reject this submission?</AlertDialogTitle>
          <AlertDialogDescription>
            This will move the submission to Desk Rejected status. This action
            cannot be undone from this interface.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirm Desk Reject
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
