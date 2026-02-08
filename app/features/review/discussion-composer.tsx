import { ConvexError } from 'convex/values'
import { SendIcon, XIcon } from 'lucide-react'
import * as React from 'react'

import { useMutation } from 'convex/react'

import { api } from 'convex/_generated/api'
import type { Id } from 'convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'


const MAX_CONTENT_LENGTH = 5000
const SHOW_COUNTER_THRESHOLD = 4000

export function DiscussionComposer({
  submissionId,
  replyTo,
  onCancelReply,
  onPostSuccess,
}: {
  submissionId: Id<'submissions'>
  replyTo?: { displayName: string; parentId: Id<'discussions'> }
  onCancelReply?: () => void
  onPostSuccess?: () => void
}) {
  const [content, setContent] = React.useState('')
  const [isPosting, setIsPosting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const postMessage = useMutation(api.discussions.postMessage)

  const trimmedLength = content.trim().length
  const isOverLimit = content.length > MAX_CONTENT_LENGTH
  const isEmpty = trimmedLength === 0
  const showCounter = content.length > SHOW_COUNTER_THRESHOLD

  async function handlePost() {
    if (isEmpty || isOverLimit || isPosting) return
    setIsPosting(true)
    setError(null)

    try {
      await postMessage({
        submissionId,
        content: content.trim(),
        parentId: replyTo?.parentId,
      })
      setContent('')
      onPostSuccess?.()
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message?: string }
        setError(data.message ?? 'Failed to post message')
      } else {
        setError('Failed to post message')
      }
    } finally {
      setIsPosting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void handlePost()
    }
  }

  // Focus textarea when reply context changes
  React.useEffect(() => {
    if (replyTo) {
      textareaRef.current?.focus()
    }
  }, [replyTo])

  return (
    <div className="space-y-2 border-t pt-3">
      {replyTo && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>
            Replying to{' '}
            <span className="font-medium">{replyTo.displayName}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0"
            onClick={onCancelReply}
          >
            <XIcon className="size-3" />
            <span className="sr-only">Cancel reply</span>
          </Button>
        </div>
      )}

      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          setError(null)
        }}
        onKeyDown={handleKeyDown}
        placeholder="Write a message..."
        className="min-h-[80px] resize-none font-serif text-base leading-[1.6]"
        aria-label="Post a discussion message"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-destructive">{error}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showCounter && (
            <span
              className={`text-xs ${
                isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
              }`}
            >
              {content.length} / {MAX_CONTENT_LENGTH}
            </span>
          )}
          <Button
            size="sm"
            onClick={() => void handlePost()}
            disabled={isEmpty || isOverLimit || isPosting}
            className="gap-1.5"
          >
            <SendIcon className="size-3.5" />
            Post
          </Button>
        </div>
      </div>
    </div>
  )
}
