import { ConvexError } from 'convex/values'
import { LockIcon, SendIcon } from 'lucide-react'
import * as React from 'react'

import { useMutation } from 'convex/react'

import { api } from 'convex/_generated/api'
import { PreSubmitSummary } from './pre-submit-summary'
import { ProgressRing } from './progress-ring'
import { ReviewSectionField, getSectionStatus } from './review-section-field'
import { SaveIndicator } from './save-indicator'

import type { Id } from 'convex/_generated/dataModel'
import type { SaveState } from './save-indicator'
import { Button } from '~/components/ui/button'

export interface ReviewSections {
  summary?: string
  strengths?: string
  weaknesses?: string
  questions?: string
  recommendation?: string
}

interface ConflictInfo {
  section: string
}

const SECTION_DEFS = [
  {
    name: 'summary',
    label: 'Summary',
    placeholder: 'Summarize the paper\u2019s main contribution...',
    guidance:
      "Describe the paper\u2019s central argument, methodology, and contribution to theoretical AI alignment research. Focus on what the paper attempts to do and how it approaches the problem.",
  },
  {
    name: 'strengths',
    label: 'Strengths',
    placeholder: 'Identify specific strengths...',
    guidance:
      'Highlight specific methodological, argumentative, or conceptual strengths. Be concrete \u2014 cite specific sections, theorems, or examples that demonstrate quality.',
  },
  {
    name: 'weaknesses',
    label: 'Weaknesses',
    placeholder: 'Point out weaknesses with suggestions...',
    guidance:
      'Identify gaps, logical issues, or areas needing improvement. For each weakness, suggest a concrete path to resolution. Constructive criticism helps authors improve their work.',
  },
  {
    name: 'questions',
    label: 'Questions',
    placeholder: 'Raise substantive questions...',
    guidance:
      'Ask questions that could strengthen the work if addressed. These might probe assumptions, request clarification of methodology, or suggest additional considerations.',
  },
  {
    name: 'recommendation',
    label: 'Recommendation',
    placeholder: 'Provide your recommendation...',
    guidance:
      'State your recommendation (accept, minor revisions, major revisions, reject) with supporting rationale. Explain what specifically would need to change for a different recommendation.',
  },
] as const

const EDIT_WINDOW_MS = 15 * 60 * 1000

function useEditCountdown(submittedAt: number | undefined) {
  const [remaining, setRemaining] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (!submittedAt) {
      setRemaining(null)
      return
    }
    const deadline = submittedAt + EDIT_WINDOW_MS
    const tick = () => {
      const left = Math.max(0, deadline - Date.now())
      setRemaining(left)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [submittedAt])

  return remaining
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function ReviewForm({
  sections: serverSections,
  submissionId,
  revision: serverRevision,
  status,
  submittedAt,
}: {
  sections: ReviewSections
  reviewId: Id<'reviews'>
  submissionId: Id<'submissions'>
  revision: number
  status: string
  submittedAt?: number
}) {
  const [localSections, setLocalSections] = React.useState<ReviewSections>(
    () => ({ ...serverSections }),
  )
  const localRevisionRef = React.useRef(serverRevision)
  const [saveStates, setSaveStates] = React.useState<
    Record<string, SaveState>
  >({})
  const [saveTimestamps, setSaveTimestamps] = React.useState<
    Record<string, number>
  >({})
  const [conflict, setConflict] = React.useState<ConflictInfo | null>(null)
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitSuccess, setSubmitSuccess] = React.useState(false)

  const timersRef = React.useRef<
    Partial<Record<string, ReturnType<typeof setTimeout>>>
  >({})
  // Track sections with in-flight save requests to prevent sync overwrites
  const pendingSavesRef = React.useRef<Partial<Record<string, boolean>>>({})
  // Mutex to serialize saves and prevent concurrent VERSION_CONFLICT errors
  const saveMutexRef = React.useRef<Promise<void>>(Promise.resolve())

  const editCountdown = useEditCountdown(submittedAt)
  const isLocked = status === 'locked'
  const isSubmitted = status === 'submitted'
  const isEditable =
    !isLocked &&
    (status === 'in_progress' ||
      (isSubmitted && editCountdown !== null && editCountdown > 0))

  // Sync server sections into local state when server data changes
  // (only for sections not currently being edited)
  React.useEffect(() => {
    if (!conflict) {
      setLocalSections((prev) => {
        const next = { ...prev }
        for (const def of SECTION_DEFS) {
          const key = def.name as keyof ReviewSections
          // Only update if no pending timer or in-flight save for this section
          if (!timersRef.current[key] && !pendingSavesRef.current[key]) {
            next[key] = serverSections[key]
          }
        }
        return next
      })
    }
  }, [serverSections, conflict])

  // Sync server revision
  React.useEffect(() => {
    if (!conflict) {
      localRevisionRef.current = serverRevision
    }
  }, [serverRevision, conflict])

  // Clean up timers on unmount
  React.useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const key of Object.keys(timers)) {
        clearTimeout(timers[key])
      }
    }
  }, [])

  const updateSectionMutation = useMutation(
    api.reviews.updateSection,
  ).withOptimisticUpdate((localStore, args) => {
    const currentData = localStore.getQuery(
      api.reviews.getSubmissionForReviewer,
      { submissionId: args.submissionId },
    )
    if (currentData) {
      localStore.setQuery(
        api.reviews.getSubmissionForReviewer,
        { submissionId: args.submissionId },
        {
          ...currentData,
          review: {
            ...currentData.review,
            sections: {
              ...currentData.review.sections,
              [args.section]: args.content,
            },
            revision: args.expectedRevision + 1,
          },
        },
      )
    }
  })

  const submitReviewMutation = useMutation(api.reviews.submitReview)

  const saveSection = React.useCallback(
    (section: string, content: string) => {
      const prevMutex = saveMutexRef.current
      let resolveMutex: () => void
      saveMutexRef.current = new Promise<void>((r) => {
        resolveMutex = r
      })

      const run = async () => {
        await prevMutex
        setSaveStates((prev) => ({ ...prev, [section]: 'saving' }))
        pendingSavesRef.current[section] = true
        try {
          const result = await updateSectionMutation({
            submissionId,
            section: section as
              | 'summary'
              | 'strengths'
              | 'weaknesses'
              | 'questions'
              | 'recommendation',
            content,
            expectedRevision: localRevisionRef.current,
          })
          localRevisionRef.current = result.revision
          const now = Date.now()
          setSaveStates((prev) => ({ ...prev, [section]: 'saved' }))
          setSaveTimestamps((prev) => ({ ...prev, [section]: now }))
          setConflict(null)
        } catch (err) {
          const now = Date.now()
          if (
            err instanceof ConvexError &&
            (err.data as { code?: string }).code === 'VERSION_CONFLICT'
          ) {
            setConflict({ section })
            setSaveStates((prev) => ({ ...prev, [section]: 'error' }))
            setSaveTimestamps((prev) => ({ ...prev, [section]: now }))
          } else {
            setSaveStates((prev) => ({ ...prev, [section]: 'error' }))
            setSaveTimestamps((prev) => ({ ...prev, [section]: now }))
          }
        } finally {
          delete pendingSavesRef.current[section]
          resolveMutex!()
        }
      }

      void run()
    },
    [submissionId, updateSectionMutation],
  )

  const saveSectionRef = React.useRef(saveSection)
  saveSectionRef.current = saveSection

  function handleSectionChange(section: string, content: string) {
    setLocalSections((prev) => ({ ...prev, [section]: content }))

    if (timersRef.current[section]) {
      clearTimeout(timersRef.current[section])
    }

    timersRef.current[section] = setTimeout(() => {
      delete timersRef.current[section]
      void saveSectionRef.current(section, content)
    }, 500)
  }

  function handleConflictReload() {
    if (!conflict) return
    const key = conflict.section as keyof ReviewSections
    setLocalSections((prev) => ({
      ...prev,
      [key]: serverSections[key],
    }))
    localRevisionRef.current = serverRevision
    setConflict(null)
    setSaveStates((prev) => ({ ...prev, [conflict.section]: 'idle' }))
  }

  function handleConflictKeep() {
    if (!conflict) return
    const key = conflict.section as keyof ReviewSections
    localRevisionRef.current = serverRevision
    setConflict(null)
    void saveSectionRef.current(key, localSections[key] ?? '')
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      await submitReviewMutation({
        submissionId,
        expectedRevision: localRevisionRef.current,
      })
      setSubmitSuccess(true)
      setShowSubmitDialog(false)
    } catch {
      setSaveStates((prev) => ({ ...prev, _submit: 'error' }))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Compute global save state from the most recent save operation
  const globalSaveState: SaveState = React.useMemo(() => {
    const entries = Object.entries(saveStates)
    if (entries.length === 0) return 'idle'

    // If anything is currently saving, show saving
    if (entries.some(([, s]) => s === 'saving')) return 'saving'

    // Otherwise, show the state of the most recently completed operation
    let latestSection = ''
    let latestTime = 0
    for (const [section] of entries) {
      const ts = saveTimestamps[section] ?? 0
      if (ts > latestTime) {
        latestTime = ts
        latestSection = section
      }
    }

    return latestSection ? (saveStates[latestSection] ?? 'idle') : 'idle'
  }, [saveStates, saveTimestamps])

  // Compute completed sections for progress ring
  const completedCount = SECTION_DEFS.filter((def) => {
    const val = localSections[def.name as keyof ReviewSections] ?? ''
    return getSectionStatus(def.name, val) === 'complete'
  }).length

  // All sections must have non-empty content to allow submission (matches server validation)
  const allSectionsNonEmpty = SECTION_DEFS.every((def) => {
    const val = localSections[def.name as keyof ReviewSections] ?? ''
    return val.trim().length > 0
  })

  // Locked state
  if (isLocked) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-2 rounded-md border border-muted bg-muted/50 p-3 text-sm">
          <LockIcon className="size-4 text-muted-foreground" />
          <span>
            Review locked. Use the discussion thread for any addenda.
          </span>
        </div>
        {SECTION_DEFS.map((def) => (
          <ReviewSectionField
            key={def.name}
            name={def.name}
            label={def.label}
            guidance={def.guidance}
            placeholder={def.placeholder}
            value={localSections[def.name as keyof ReviewSections] ?? ''}
            onChange={() => {}}
            status={getSectionStatus(
              def.name,
              localSections[def.name as keyof ReviewSections] ?? '',
            )}
            disabled
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ProgressRing completed={completedCount} total={5} />
          <SaveIndicator state={globalSaveState} />
        </div>
        <span className="text-xs text-muted-foreground">
          {completedCount}/5 sections complete
        </span>
      </div>

      {(submitSuccess || isSubmitted) && (
        <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm dark:border-green-700 dark:bg-green-950">
          <SendIcon className="size-4 text-green-600 dark:text-green-400" />
          <span className="text-green-800 dark:text-green-200">
            Review submitted successfully.{' '}
            {editCountdown !== null && editCountdown > 0
              ? `You can make edits for the next ${formatCountdown(editCountdown)}.`
              : 'The edit window has closed.'}
          </span>
        </div>
      )}

      {SECTION_DEFS.map((def) => {
        const key = def.name as keyof ReviewSections
        const val = localSections[key] ?? ''
        return (
          <ReviewSectionField
            key={def.name}
            name={def.name}
            label={def.label}
            guidance={def.guidance}
            placeholder={def.placeholder}
            value={val}
            onChange={(v) => handleSectionChange(def.name, v)}
            status={getSectionStatus(def.name, val)}
            disabled={!isEditable}
            conflictState={
              conflict?.section === def.name
                ? {
                    onReload: handleConflictReload,
                    onKeep: handleConflictKeep,
                  }
                : undefined
            }
          />
        )
      })}

      {status === 'in_progress' && (
        <Button
          onClick={() => setShowSubmitDialog(true)}
          className="w-full gap-1.5"
          disabled={!allSectionsNonEmpty}
        >
          <SendIcon className="size-3.5" />
          Submit Review
        </Button>
      )}

      <PreSubmitSummary
        sections={localSections}
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onConfirm={() => void handleSubmit()}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}

export { SECTION_DEFS }
