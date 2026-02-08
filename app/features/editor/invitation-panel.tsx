import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import {
  MailIcon,
  SendIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { ReviewProgressIndicator } from './review-progress-indicator'

import type { Id } from '../../../convex/_generated/dataModel'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'

interface SelectedReviewer {
  userId: Id<'users'>
  reviewerName: string
  affiliation: string
  rationale: string
}

interface InvitationPanelProps {
  submissionId: Id<'submissions'>
  selectedReviewers: Array<SelectedReviewer>
  onInvitationsSent: () => void
}

export function InvitationPanel({
  submissionId,
  selectedReviewers,
  onInvitationsSent,
}: InvitationPanelProps) {
  const sendInvitations = useMutation(api.invitations.sendInvitations)
  const revokeInvitation = useMutation(api.invitations.revokeInvitation)
  const invitations = useQuery(api.invitations.listBySubmission, {
    submissionId,
  })

  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    if (selectedReviewers.length === 0) return

    setIsSending(true)
    try {
      const inviteIds = await sendInvitations({
        submissionId,
        reviewerIds: selectedReviewers.map((r) => r.userId),
        matchData: selectedReviewers.map((r) => ({
          userId: r.userId,
          rationale: r.rationale,
        })),
      })

      // Show undo toast
      toast.success(
        `${inviteIds.length} invitation${inviteIds.length !== 1 ? 's' : ''} sent.`,
        {
          action: {
            label: 'Undo',
            onClick: async () => {
              for (const inviteId of inviteIds) {
                try {
                  await revokeInvitation({ inviteId })
                } catch {
                  // Invite may already be consumed
                }
              }
              toast.info('Invitations revoked.')
            },
          },
          duration: 10000,
        },
      )

      onInvitationsSent()
    } catch {
      toast.error('Failed to send invitations. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleRevoke = async (inviteId: Id<'reviewInvites'>) => {
    try {
      await revokeInvitation({ inviteId })
      toast.success('Invitation revoked.')
    } catch {
      toast.error('Failed to revoke invitation.')
    }
  }

  const hasSelectedReviewers = selectedReviewers.length > 0
  const hasSentInvitations = invitations != null && invitations.length > 0

  return (
    <div className="mt-4 space-y-4">
      {/* Send invitations section */}
      {hasSelectedReviewers && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <SendIcon className="size-4 text-primary" />
              <h3 className="text-sm font-medium">
                {selectedReviewers.length} reviewer
                {selectedReviewers.length !== 1 ? 's' : ''} selected for
                invitation
              </h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Selected reviewer list */}
            {selectedReviewers.map((reviewer) => (
              <div
                key={reviewer.userId}
                className="flex items-start gap-2 text-sm"
              >
                <MailIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <span className="font-medium">{reviewer.reviewerName}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    &mdash; {reviewer.affiliation}
                  </span>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {reviewer.rationale.length > 80
                      ? `${reviewer.rationale.slice(0, 80)}...`
                      : reviewer.rationale}
                  </p>
                </div>
              </div>
            ))}

            <Separator />

            {/* Send button */}
            <Button
              size="sm"
              onClick={handleSend}
              disabled={isSending}
              className="w-full"
            >
              {isSending ? (
                'Sending...'
              ) : (
                <>
                  <SendIcon className="mr-1.5 size-3.5" />
                  Send Invitations
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sent invitations list */}
      {hasSentInvitations && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <MailIcon className="size-3" />
            Sent Invitations
          </h3>
          {invitations.map((invite) => (
            <div
              key={invite._id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <ReviewProgressIndicator
                  indicator={
                    invite.status === 'accepted'
                      ? 'green'
                      : invite.status === 'revoked' ||
                          invite.status === 'expired'
                        ? 'red'
                        : 'amber'
                  }
                  label={invite.status}
                />
                <span className="text-sm">{invite.reviewerName}</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {invite.status}
                </Badge>
              </div>
              {invite.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevoke(invite._id)}
                  className="h-7 text-xs text-muted-foreground"
                >
                  <XIcon className="mr-1 size-3" />
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
