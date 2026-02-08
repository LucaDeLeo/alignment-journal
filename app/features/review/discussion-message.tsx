import {
  CornerDownRightIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import * as React from 'react'

import type { Id } from 'convex/_generated/dataModel'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'


export interface DiscussionMessageData {
  _id: Id<'discussions'>
  parentId?: Id<'discussions'>
  content: string
  isRetracted: boolean
  displayName: string
  displayRole: string
  isAnonymous: boolean
  avatarInitials: string
  isOwnMessage: boolean
  editableUntil: number
  createdAt: number
  updatedAt: number
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

const ROLE_BADGE_VARIANTS: Record<
  string,
  string
> = {
  author:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  reviewer:
    'border-border bg-muted text-muted-foreground',
  editor:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
}

export function DiscussionMessage({
  message,
  onReply,
  isHighlighted,
  onEdit,
  onRetract,
}: {
  message: DiscussionMessageData
  onReply: (messageId: Id<'discussions'>, displayName: string) => void
  isHighlighted: boolean
  onEdit: (messageId: Id<'discussions'>, content: string) => Promise<void>
  onRetract: (messageId: Id<'discussions'>) => Promise<void>
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editContent, setEditContent] = React.useState(message.content)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isRetracting, setIsRetracting] = React.useState(false)
  const [showRetractConfirm, setShowRetractConfirm] = React.useState(false)

  const now = useNow(10_000)
  const isWithinEditWindow = now < message.editableUntil
  const canEdit = message.isOwnMessage && isWithinEditWindow && !message.isRetracted
  const canRetract = message.isOwnMessage && !isWithinEditWindow && !message.isRetracted

  async function handleSaveEdit() {
    setIsSaving(true)
    try {
      await onEdit(message._id, editContent)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRetract() {
    setIsRetracting(true)
    try {
      await onRetract(message._id)
      setShowRetractConfirm(false)
    } finally {
      setIsRetracting(false)
    }
  }

  const roleClass = ROLE_BADGE_VARIANTS[message.displayRole] ?? ROLE_BADGE_VARIANTS.reviewer

  return (
    <div
      className={`group flex gap-3 rounded-md px-3 py-2 transition-colors ${
        isHighlighted ? 'animate-[fadeHighlight_3s_ease-out_forwards]' : ''
      }`}
    >
      <Avatar className="mt-0.5 size-8 shrink-0">
        <AvatarFallback
          className={
            message.isAnonymous
              ? 'bg-muted text-muted-foreground text-xs'
              : 'text-xs'
          }
        >
          {message.avatarInitials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{message.displayName}</span>
          <Badge
            variant="outline"
            className={`px-1.5 py-0 text-[10px] capitalize ${roleClass}`}
          >
            {message.displayRole}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(message.createdAt)}
          </span>
          {message.updatedAt > message.createdAt && !message.isRetracted && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>

        {message.isRetracted ? (
          <p className="mt-1 text-sm italic text-muted-foreground">
            [This message has been retracted]
          </p>
        ) : isEditing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[60px] font-serif text-base leading-[1.6]"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void handleSaveEdit()}
                disabled={
                  isSaving ||
                  editContent.trim().length === 0 ||
                  editContent.length > 5000
                }
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false)
                  setEditContent(message.content)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap font-serif text-base leading-[1.6]">
            {message.content}
          </p>
        )}

        {!message.isRetracted && !isEditing && (
          <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
              onClick={() => onReply(message._id, message.displayName)}
            >
              <CornerDownRightIcon className="size-3" />
              Reply
            </Button>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
                onClick={() => setIsEditing(true)}
              >
                <PencilIcon className="size-3" />
                Edit
              </Button>
            )}
            {canRetract && !showRetractConfirm && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-1.5 text-xs text-destructive"
                onClick={() => setShowRetractConfirm(true)}
              >
                <Trash2Icon className="size-3" />
                Retract
              </Button>
            )}
            {showRetractConfirm && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">Retract this message?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-6 px-1.5 text-xs"
                  onClick={() => void handleRetract()}
                  disabled={isRetracting}
                >
                  Yes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs"
                  onClick={() => setShowRetractConfirm(false)}
                >
                  <XIcon className="size-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Re-renders the component periodically to update relative timestamps and edit window state. */
function useNow(intervalMs: number): number {
  const [now, setNow] = React.useState(Date.now)
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
