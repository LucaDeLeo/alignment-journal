import { ConvexError } from 'convex/values'
import {
  AwardIcon,
  CheckIcon,
  EyeOffIcon,
  LockIcon,
  SendIcon,
  UserIcon,
} from 'lucide-react'
import * as React from 'react'

import { useMutation, useQuery } from 'convex/react'
import {
  ABSTRACT_MAX_WORDS,
  ABSTRACT_MIN_WORDS,
} from 'convex/reviewerAbstracts'

import { api } from 'convex/_generated/api'
import { countWords } from './review-section-field'
import { SaveIndicator } from './save-indicator'

import type { Id } from 'convex/_generated/dataModel'
import type { SaveState } from './save-indicator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'

const DEBOUNCE_MS = 500

function WordCounter({ count }: { count: number }) {
  let colorClass = 'text-amber-500'
  let hint = `${ABSTRACT_MIN_WORDS} min`

  if (count >= ABSTRACT_MIN_WORDS && count <= ABSTRACT_MAX_WORDS) {
    colorClass = 'text-green-600 dark:text-green-400'
    hint = ''
  } else if (count > ABSTRACT_MAX_WORDS) {
    colorClass = 'text-red-500'
    hint = `${ABSTRACT_MAX_WORDS} max`
  }

  return (
    <span className={`text-xs ${colorClass}`}>
      {count} words{hint ? ` \u00b7 ${hint}` : ''}
    </span>
  )
}

export function AbstractDraftForm({
  submissionId,
}: {
  submissionId: Id<'submissions'>
}) {
  const abstractData = useQuery(api.reviewerAbstracts.getBySubmission, {
    submissionId,
  })

  // Null state: no abstract assignment
  if (abstractData === undefined) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (abstractData === null) {
    return (
      <div className="rounded-lg border bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No abstract assignment for this submission yet.
        </p>
      </div>
    )
  }

  if (!abstractData.isOwnAbstract) {
    return (
      <div className="rounded-lg border bg-background p-6">
        <h3 className="mb-2 font-sans text-sm font-semibold">
          Reviewer Abstract
        </h3>
        <div className="font-serif text-base leading-[1.6] whitespace-pre-wrap">
          {abstractData.content || (
            <span className="text-muted-foreground italic">
              Abstract not yet drafted.
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{abstractData.status}</Badge>
          <span>
            {abstractData.isSigned
              ? abstractData.reviewerName
              : 'Anonymous Reviewer'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <AbstractEditor
      submissionId={submissionId}
      initialContent={abstractData.content}
      serverRevision={abstractData.revision}
      status={abstractData.status}
      isSigned={abstractData.isSigned}
      reviewerName={abstractData.reviewerName}
    />
  )
}

function AbstractEditor({
  submissionId,
  initialContent,
  serverRevision,
  status,
  isSigned: serverIsSigned,
  reviewerName,
}: {
  submissionId: Id<'submissions'>
  initialContent: string
  serverRevision: number
  status: 'drafting' | 'submitted' | 'approved'
  isSigned: boolean
  reviewerName: string
}) {
  const [localContent, setLocalContent] = React.useState(initialContent)
  const [saveState, setSaveState] = React.useState<SaveState>('idle')
  const [conflict, setConflict] = React.useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitSuccess, setSubmitSuccess] = React.useState(false)
  const [localSigned, setLocalSigned] = React.useState(serverIsSigned)

  const localRevisionRef = React.useRef(serverRevision)
  const saveMutexRef = React.useRef<Promise<void>>(Promise.resolve())
  const pendingSaveRef = React.useRef(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const isEditable = status !== 'approved'
  const wordCount = countWords(localContent)
  const isWordCountValid = wordCount >= ABSTRACT_MIN_WORDS && wordCount <= ABSTRACT_MAX_WORDS

  // Sync server state when it changes (if no pending save/conflict)
  React.useEffect(() => {
    if (!conflict && !pendingSaveRef.current && !timerRef.current) {
      setLocalContent(initialContent)
    }
  }, [initialContent, conflict])

  React.useEffect(() => {
    if (!conflict) {
      localRevisionRef.current = serverRevision
    }
  }, [serverRevision, conflict])

  React.useEffect(() => {
    setLocalSigned(serverIsSigned)
  }, [serverIsSigned])

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const updateContentMutation = useMutation(
    api.reviewerAbstracts.updateContent,
  ).withOptimisticUpdate((localStore, args) => {
    const currentData = localStore.getQuery(
      api.reviewerAbstracts.getBySubmission,
      { submissionId: args.submissionId },
    )
    if (currentData) {
      localStore.setQuery(
        api.reviewerAbstracts.getBySubmission,
        { submissionId: args.submissionId },
        {
          ...currentData,
          content: args.content,
          wordCount: countWords(args.content),
          revision: args.expectedRevision + 1,
        },
      )
    }
  })

  const updateSigningMutation = useMutation(
    api.reviewerAbstracts.updateSigning,
  )
  const submitAbstractMutation = useMutation(
    api.reviewerAbstracts.submitAbstract,
  )

  const saveContent = React.useCallback(
    (content: string) => {
      const prevMutex = saveMutexRef.current
      let resolveMutex: () => void
      saveMutexRef.current = new Promise<void>((r) => {
        resolveMutex = r
      })

      const run = async () => {
        await prevMutex
        setSaveState('saving')
        pendingSaveRef.current = true
        try {
          const result = await updateContentMutation({
            submissionId,
            content,
            expectedRevision: localRevisionRef.current,
          })
          localRevisionRef.current = result.revision
          setSaveState('saved')
          setConflict(false)
        } catch (err) {
          if (
            err instanceof ConvexError &&
            (err.data as { code?: string }).code === 'VERSION_CONFLICT'
          ) {
            setConflict(true)
          }
          setSaveState('error')
        } finally {
          pendingSaveRef.current = false
          resolveMutex!()
        }
      }

      void run()
    },
    [submissionId, updateContentMutation],
  )

  const saveContentRef = React.useRef(saveContent)
  saveContentRef.current = saveContent

  function handleContentChange(newContent: string) {
    setLocalContent(newContent)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void saveContentRef.current(newContent)
    }, DEBOUNCE_MS)
  }

  function handleConflictReload() {
    setLocalContent(initialContent)
    localRevisionRef.current = serverRevision
    setConflict(false)
    setSaveState('idle')
  }

  function handleConflictKeep() {
    localRevisionRef.current = serverRevision
    setConflict(false)
    void saveContentRef.current(localContent)
  }

  function handleSigningToggle(checked: boolean) {
    setLocalSigned(checked)
    void updateSigningMutation({ submissionId, isSigned: checked })
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      await submitAbstractMutation({
        submissionId,
        expectedRevision: localRevisionRef.current,
      })
      setSubmitSuccess(true)
      setShowSubmitDialog(false)
    } catch {
      setSaveState('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Approved state: read-only view
  if (status === 'approved') {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <AwardIcon className="size-5 text-primary" aria-hidden="true" />
          <h3 className="font-sans text-sm font-semibold">
            Reviewer Abstract
          </h3>
          <Badge variant="default" className="gap-1">
            <CheckIcon className="size-3" />
            Approved
          </Badge>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <div className="font-serif text-base leading-[1.6] whitespace-pre-wrap">
            {localContent}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <LockIcon className="size-3" />
          <span>Locked — approved by editor</span>
        </div>
        <Separator />
        <div className="flex items-center gap-2 text-sm">
          {localSigned ? (
            <>
              <UserIcon className="size-3.5 text-muted-foreground" />
              <span>Published as: {reviewerName}</span>
            </>
          ) : (
            <>
              <EyeOffIcon className="size-3.5 text-muted-foreground" />
              <span>Published as: Anonymous Reviewer</span>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Prestigious header */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <AwardIcon
            className="mt-0.5 size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div>
            <p className="font-sans text-sm font-semibold">
              You&apos;ve been selected to write the published abstract
              for this paper
            </p>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              Write the abstract a potential reader would most want to
              read. Summarize the paper&apos;s key contribution and
              significance in {ABSTRACT_MIN_WORDS}-{ABSTRACT_MAX_WORDS} words.
            </p>
          </div>
        </div>
      </div>

      {/* Status banners */}
      {(submitSuccess || status === 'submitted') && (
        <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm dark:border-green-700 dark:bg-green-950">
          <SendIcon className="size-4 text-green-600 dark:text-green-400" />
          <span className="text-green-800 dark:text-green-200">
            Submitted — awaiting editor approval. You can still make
            edits.
          </span>
        </div>
      )}

      {/* Save indicator */}
      <div className="flex items-center justify-between">
        <SaveIndicator state={saveState} />
        <WordCounter count={wordCount} />
      </div>

      {/* Version conflict banner */}
      {conflict && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
          <p className="mb-2 text-amber-800 dark:text-amber-200">
            This abstract was edited elsewhere. Choose how to proceed:
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleConflictReload}
            >
              Reload server version
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleConflictKeep}
            >
              Keep my version
            </Button>
          </div>
        </div>
      )}

      {/* Textarea with Newsreader serif font */}
      <div>
        <Textarea
          value={localContent}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Write the abstract here..."
          className="min-h-[200px] font-serif text-base leading-[1.6]"
          disabled={!isEditable}
        />
      </div>

      <Separator />

      {/* Signing toggle */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Switch
            id="signing-toggle"
            checked={localSigned}
            onCheckedChange={handleSigningToggle}
            disabled={!isEditable}
          />
          <Label
            htmlFor="signing-toggle"
            className="text-sm font-medium"
          >
            Sign this abstract with your name
          </Label>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {localSigned ? (
            <>
              <UserIcon className="size-3.5" />
              <span>Published as: {reviewerName}</span>
            </>
          ) : (
            <>
              <EyeOffIcon className="size-3.5" />
              <span>Published as: Anonymous Reviewer</span>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Submit button */}
      {status === 'drafting' && (
        <Button
          onClick={() => setShowSubmitDialog(true)}
          className="w-full gap-1.5"
          disabled={!isWordCountValid}
        >
          <SendIcon className="size-3.5" />
          Submit Abstract
        </Button>
      )}

      {/* Submit confirmation dialog */}
      <AlertDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Abstract</AlertDialogTitle>
            <AlertDialogDescription>
              Submit your abstract for editor review? You can continue
              editing until the editor approves it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
