import { ConvexError } from 'convex/values'
import {
  ArrowDownIcon,
  EyeIcon,
  GlobeIcon,
  MessageSquareIcon,
} from 'lucide-react'
import * as React from 'react'

import { useMutation, useQuery } from 'convex/react'

import { api } from 'convex/_generated/api'
import { DiscussionComposer } from './discussion-composer'
import { DiscussionMessage } from './discussion-message'

import type { Id } from 'convex/_generated/dataModel'
import type { DiscussionMessageData } from './discussion-message'
import { Separator } from '~/components/ui/separator'
import { Button } from '~/components/ui/button'
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

interface ReplyContext {
  displayName: string
  parentId: Id<'discussions'>
}

export function DiscussionThread({
  submissionId,
  reviewStatus,
}: {
  submissionId: Id<'submissions'>
  reviewStatus?: string
}) {
  // Gate discussion for reviewers who haven't submitted yet
  if (reviewStatus === 'assigned' || reviewStatus === 'in_progress') {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-6 text-center">
        <MessageSquareIcon
          className="size-6 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">
          Discussion will be available after you submit your review
        </p>
      </div>
    )
  }

  return <DiscussionThreadInner submissionId={submissionId} />
}

function DiscussionThreadInner({
  submissionId,
}: {
  submissionId: Id<'submissions'>
}) {
  const data = useQuery(api.discussions.listBySubmission, { submissionId })
  const editMessage = useMutation(api.discussions.editMessage)
  const retractMessage = useMutation(api.discussions.retractMessage)
  const togglePublicConversation = useMutation(
    api.discussions.togglePublicConversation,
  )

  const [replyTo, setReplyTo] = React.useState<ReplyContext | null>(null)
  const [showNewMessagesBadge, setShowNewMessagesBadge] =
    React.useState(false)
  const [isTogglingPublic, setIsTogglingPublic] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const prevMessageIdsRef = React.useRef<Set<string>>(new Set())
  const [highlightedIds, setHighlightedIds] = React.useState<Set<string>>(
    new Set(),
  )

  // Track new messages for highlight animation
  React.useEffect(() => {
    if (!data) return

    const currentIds = new Set(
      data.messages.map((m: DiscussionMessageData) => m._id as string),
    )
    const prevIds = prevMessageIdsRef.current

    // First render — don't highlight
    if (prevIds.size === 0) {
      prevMessageIdsRef.current = currentIds
      return
    }

    const newIds = new Set<string>()
    for (const id of currentIds) {
      if (!prevIds.has(id)) {
        newIds.add(id)
      }
    }

    if (newIds.size > 0) {
      setHighlightedIds(newIds)

      // Check scroll position
      const el = scrollRef.current
      if (el) {
        const isNearBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight < 100
        if (isNearBottom) {
          requestAnimationFrame(() => {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
          })
        } else {
          setShowNewMessagesBadge(true)
        }
      }

      // Clear highlights after animation
      const timer = setTimeout(() => setHighlightedIds(new Set()), 3000)
      prevMessageIdsRef.current = currentIds
      return () => clearTimeout(timer)
    }

    prevMessageIdsRef.current = currentIds
  }, [data])

  function handleReply(messageId: Id<'discussions'>, displayName: string) {
    setReplyTo({ displayName, parentId: messageId })
  }

  async function handleEdit(
    messageId: Id<'discussions'>,
    content: string,
  ) {
    await editMessage({ messageId, content })
  }

  async function handleRetract(messageId: Id<'discussions'>) {
    await retractMessage({ messageId })
  }

  function handleScrollToBottom() {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
    setShowNewMessagesBadge(false)
  }

  async function handleTogglePublic() {
    setIsTogglingPublic(true)
    try {
      await togglePublicConversation({ submissionId })
    } catch (err) {
      if (err instanceof ConvexError) {
        // Silently handle — UI state will update from reactive query
      }
    } finally {
      setIsTogglingPublic(false)
    }
  }

  // Loading state
  if (data === undefined) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  // Unauthorized
  if (data === null) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-6 text-center">
        <MessageSquareIcon
          className="size-6 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">
          You do not have access to this discussion
        </p>
      </div>
    )
  }

  // Group messages: top-level + replies
  const topLevel: Array<DiscussionMessageData> = []
  const repliesByParent = new Map<string, Array<DiscussionMessageData>>()

  const messageById = new Map(
    data.messages.map((m: DiscussionMessageData) => [m._id, m]),
  )

  for (const msg of data.messages) {
    if (!msg.parentId) {
      topLevel.push(msg)
    } else {
      // Walk up the parent chain to find the top-level ancestor
      let ancestorId = msg.parentId
      let ancestor = messageById.get(ancestorId)
      while (ancestor?.parentId) {
        ancestorId = ancestor.parentId
        ancestor = messageById.get(ancestorId)
      }

      const existing = repliesByParent.get(ancestorId) ?? []
      existing.push(msg)
      repliesByParent.set(ancestorId, existing)
    }
  }

  const hasMessages = data.messages.length > 0

  return (
    <div className="flex flex-col">
      {/* Identity reveal note for accepted submissions */}
      {data.isAuthor && data.submissionStatus === 'ACCEPTED' && (
        <div className="mx-3 mb-3 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <EyeIcon className="size-4 shrink-0" />
          <span>
            Reviewer identities have been revealed following acceptance
          </span>
        </div>
      )}

      {/* Public conversation toggle for rejected submissions */}
      {data.isAuthor && data.submissionStatus === 'REJECTED' && (
        <div className="mx-3 mb-3 flex items-center justify-between rounded-md border border-muted bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-sm">
            <GlobeIcon className="size-4 text-muted-foreground" />
            {data.publicConversation ? (
              <span className="text-muted-foreground">
                This conversation is public
              </span>
            ) : (
              <span>Make this review conversation public</span>
            )}
          </div>
          {!data.publicConversation && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Make Public
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Make conversation public?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Making this conversation public will allow anyone to
                    read the review discussion. Reviewer identities will
                    remain confidential. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleTogglePublic()}
                    disabled={isTogglingPublic}
                  >
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}

      {hasMessages && <Separator className="mb-2" />}

      {/* Messages */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        className="relative flex-1 space-y-1 overflow-y-auto"
      >
        {!hasMessages && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <MessageSquareIcon
              className="size-6 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the discussion!
            </p>
          </div>
        )}

        {topLevel.map((msg) => {
          const replies = repliesByParent.get(msg._id) ?? []
          return (
            <div key={msg._id}>
              <DiscussionMessage
                message={msg}
                onReply={handleReply}
                isHighlighted={highlightedIds.has(msg._id)}
                onEdit={handleEdit}
                onRetract={handleRetract}
              />
              {replies.length > 0 && (
                <div className="ml-6 border-l-2 border-muted pl-4">
                  {replies.map((reply) => (
                    <DiscussionMessage
                      key={reply._id}
                      message={reply}
                      onReply={handleReply}
                      isHighlighted={highlightedIds.has(reply._id)}
                      onEdit={handleEdit}
                      onRetract={handleRetract}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* New messages badge */}
        {showNewMessagesBadge && (
          <button
            type="button"
            className="sticky bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border bg-background px-3 py-1 text-xs shadow-sm hover:bg-accent"
            onClick={handleScrollToBottom}
          >
            <ArrowDownIcon className="mr-1 inline size-3" />
            New messages
          </button>
        )}
      </div>

      {/* Composer */}
      {data.canPost && (
        <div className="px-3 pb-3">
          <DiscussionComposer
            submissionId={submissionId}
            replyTo={
              replyTo
                ? {
                    displayName: replyTo.displayName,
                    parentId: replyTo.parentId,
                  }
                : undefined
            }
            onCancelReply={() => setReplyTo(null)}
            onPostSuccess={() => setReplyTo(null)}
          />
        </div>
      )}
    </div>
  )
}
