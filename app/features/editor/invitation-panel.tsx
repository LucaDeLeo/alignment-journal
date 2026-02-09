import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import {
  MailIcon,
  SendIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { buildInvitationBody } from '../../../convex/helpers/invitation_template'
import { InvitationPreviewModal } from './invitation-preview-modal'
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
  submissionTitle: string
  selectedReviewers: Array<SelectedReviewer>
  onInvitationsSent: () => void
}

export function InvitationPanel({
  submissionId,
  submissionTitle,
  selectedReviewers,
  onInvitationsSent,
}: InvitationPanelProps) {
  const sendInvitations = useMutation(api.invitations.sendInvitations)
  const revokeInvitation = useMutation(api.invitations.revokeInvitation)
  const invitations = useQuery(api.invitations.listBySubmission, {
    submissionId,
  })

  const [isSending, setIsSending] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [draftBodies, setDraftBodies] = useState<Map<string, string>>(new Map())

  const reviewerDrafts = useMemo(
    () =>
      selectedReviewers.map((r) => ({
        userId: r.userId,
        reviewerName: r.reviewerName,
        body:
          draftBodies.get(r.userId) ??
          buildInvitationBody(submissionTitle, r.rationale),
        isEdited: draftBodies.has(r.userId),
      })),
    [selectedReviewers, draftBodies, submissionTitle],
  )

  async function handleConfirmSend() {
    if (selectedReviewers.length === 0) return

    setIsSending(true)
    try {
      // Only pass customBodies for reviewers whose bodies were actually edited
      const customBodies = reviewerDrafts
        .filter((r) => r.isEdited)
        .map((r) => ({ userId: r.userId, body: r.body }))

      const inviteIds = await sendInvitations({
        submissionId,
        reviewerIds: selectedReviewers.map((r) => r.userId),
        matchData: selectedReviewers.map((r) => ({
          userId: r.userId,
          rationale: r.rationale,
        })),
        customBodies: customBodies.length > 0 ? customBodies : undefined,
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

      setDraftBodies(new Map())
      setIsPreviewOpen(false)
      onInvitationsSent()
    } catch {
      toast.error('Failed to send invitations. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  async function handleRevoke(inviteId: Id<'reviewInvites'>) {
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
              onClick={() => setIsPreviewOpen(true)}
              disabled={isSending}
              className="w-full"
            >
              <SendIcon className="mr-1.5 size-3.5" />
              Preview &amp; Send
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
      {/* Invitation preview modal */}
      {hasSelectedReviewers && (
        <InvitationPreviewModal
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          reviewers={reviewerDrafts}
          onBodyChange={(userId, body) => {
            setDraftBodies((prev) => {
              const next = new Map(prev)
              next.set(userId, body)
              return next
            })
          }}
          onResetBody={(userId) => {
            setDraftBodies((prev) => {
              const next = new Map(prev)
              next.delete(userId)
              return next
            })
          }}
          onConfirm={() => void handleConfirmSend()}
          isSending={isSending}
        />
      )}
    </div>
  )
}
