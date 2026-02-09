import { useState } from 'react'
import { AlertTriangleIcon, RotateCcwIcon } from 'lucide-react'

import { ACCEPT_LINK_PLACEHOLDER } from '../../../convex/helpers/invitation_template'

import type { Id } from '../../../convex/_generated/dataModel'

import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Textarea } from '~/components/ui/textarea'

interface ReviewerDraft {
  userId: Id<'users'>
  reviewerName: string
  body: string
  isEdited: boolean
}

interface InvitationPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reviewers: Array<ReviewerDraft>
  onBodyChange: (userId: Id<'users'>, body: string) => void
  onResetBody: (userId: Id<'users'>) => void
  onConfirm: () => void
  isSending: boolean
}

export function InvitationPreviewModal({
  open,
  onOpenChange,
  reviewers,
  onBodyChange,
  onResetBody,
  onConfirm,
  isSending,
}: InvitationPreviewModalProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = reviewers[activeIndex]

  if (!active) return null

  const missingPlaceholder = !active.body.includes(ACCEPT_LINK_PLACEHOLDER)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preview Invitations</DialogTitle>
          <DialogDescription>
            Review and customize the invitation email for each reviewer before
            sending.
          </DialogDescription>
        </DialogHeader>

        {/* Reviewer tabs */}
        {reviewers.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {reviewers.map((r, i) => (
              <button
                key={r.userId}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  i === activeIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {r.reviewerName}
                {r.isEdited && (
                  <span className="size-1.5 rounded-full bg-current opacity-60" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Email body */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              To: {active.reviewerName}
            </p>
            {active.isEdited && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onResetBody(active.userId)}
                className="h-7 text-xs"
              >
                <RotateCcwIcon className="mr-1 size-3" />
                Reset to default
              </Button>
            )}
          </div>
          <Textarea
            value={active.body}
            onChange={(e) => onBodyChange(active.userId, e.target.value)}
            className="min-h-64 font-mono text-sm"
            rows={12}
          />
          <p className="text-xs text-muted-foreground">
            The <code className="rounded bg-muted px-1">{ACCEPT_LINK_PLACEHOLDER}</code> placeholder
            will be replaced with each reviewer&apos;s unique acceptance URL.
          </p>
          {missingPlaceholder && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangleIcon className="size-4 shrink-0" />
              The acceptance link placeholder is missing. Reviewers won&apos;t
              have a link to accept the invitation.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSending}>
            {isSending
              ? 'Sending...'
              : `Send ${reviewers.length} Invitation${reviewers.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
