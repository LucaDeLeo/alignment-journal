import { useState } from 'react'
import { useMutation } from 'convex/react'
import {
  CheckCircleIcon,
  GavelIcon,
  RotateCcwIcon,
  XCircleIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { DECISION_NOTE_MAX_LENGTH } from '../../../convex/decisions'

import type { Id } from '../../../convex/_generated/dataModel'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { Textarea } from '~/components/ui/textarea'

type DecisionType = 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED'

interface DecisionPanelProps {
  submissionId: Id<'submissions'>
  submissionTitle: string
}

const DECISION_CONFIG: Record<
  DecisionType,
  {
    label: string
    confirmLabel: string
    toastLabel: string
    noteLabel: string
    noteRequired: boolean
    variant: 'default' | 'destructive' | 'outline'
    icon: typeof CheckCircleIcon
    accentClass: string
  }
> = {
  ACCEPTED: {
    label: 'Accept',
    confirmLabel: 'Confirm Accept',
    toastLabel: 'Accepted',
    noteLabel: "Editor's Note (optional)",
    noteRequired: false,
    variant: 'default',
    icon: CheckCircleIcon,
    accentClass:
      'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20',
  },
  REJECTED: {
    label: 'Reject',
    confirmLabel: 'Confirm Reject',
    toastLabel: 'Rejected',
    noteLabel: "Editor's Reasoning",
    noteRequired: true,
    variant: 'destructive',
    icon: XCircleIcon,
    accentClass:
      'bg-red-500/10 text-red-700 border-red-500/30 hover:bg-red-500/20',
  },
  REVISION_REQUESTED: {
    label: 'Request Revision',
    confirmLabel: 'Confirm Revision Request',
    toastLabel: 'Revision requested',
    noteLabel: 'Required Changes',
    noteRequired: true,
    variant: 'outline',
    icon: RotateCcwIcon,
    accentClass:
      'bg-amber-500/10 text-amber-700 border-amber-500/30 hover:bg-amber-500/20',
  },
}

export function DecisionPanel({
  submissionId,
  submissionTitle,
}: DecisionPanelProps) {
  const makeDecision = useMutation(api.decisions.makeDecision)
  const undoDecision = useMutation(api.decisions.undoDecision)

  const [activeDecision, setActiveDecision] = useState<DecisionType | null>(
    null,
  )
  const [decisionNote, setDecisionNote] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleConfirm = async () => {
    if (!activeDecision) return
    const config = DECISION_CONFIG[activeDecision]

    if (config.noteRequired && decisionNote.trim().length === 0) return

    setIsPending(true)
    try {
      await makeDecision({
        submissionId,
        decision: activeDecision,
        decisionNote: decisionNote.trim() || undefined,
      })

      // Reset form
      setActiveDecision(null)
      setDecisionNote('')

      // Show undo toast
      toast.success(`${config.toastLabel}. Undo?`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await undoDecision({
                submissionId,
                previousDecision: activeDecision,
              })
              toast.info('Decision undone.')
            } catch (err) {
              const message =
                err instanceof Error ? err.message : String(err)
              if (message.includes('Undo window has expired')) {
                toast.error('Undo window has expired.')
              } else if (message.includes('Cannot undo')) {
                toast.error('Decision status has changed and can no longer be undone.')
              } else if (message.includes('Requires editor')) {
                toast.error('You do not have permission to undo this decision.')
              } else {
                toast.error('Failed to undo decision. Please try again.')
              }
            }
          },
        },
        duration: 10000,
      })
    } catch {
      toast.error('Failed to submit decision. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  const handleCancel = () => {
    setActiveDecision(null)
    setDecisionNote('')
  }

  const remainingChars = DECISION_NOTE_MAX_LENGTH - decisionNote.length

  return (
    <section className="mt-8">
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GavelIcon className="size-4 text-primary" />
            <h2 className="text-sm font-medium uppercase tracking-wider">
              Editorial Decision
            </h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Decision buttons */}
          {activeDecision === null && (
            <div className="flex flex-wrap gap-2">
              {(
                Object.entries(DECISION_CONFIG) as Array<
                  [DecisionType, (typeof DECISION_CONFIG)[DecisionType]]
                >
              ).map(([type, config]) => {
                const Icon = config.icon
                return (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    className={config.accentClass}
                    onClick={() => setActiveDecision(type)}
                    disabled={isPending}
                  >
                    <Icon className="mr-1.5 size-3.5" />
                    {config.label}
                  </Button>
                )
              })}
            </div>
          )}

          {/* Inline form for selected decision */}
          {activeDecision !== null && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {DECISION_CONFIG[activeDecision].label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  for &ldquo;{submissionTitle.length > 60 ? `${submissionTitle.slice(0, 60)}...` : submissionTitle}&rdquo;
                </span>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="decision-note"
                  className="text-sm font-medium text-muted-foreground"
                >
                  {DECISION_CONFIG[activeDecision].noteLabel}
                  {DECISION_CONFIG[activeDecision].noteRequired && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </label>
                <Textarea
                  id="decision-note"
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  maxLength={DECISION_NOTE_MAX_LENGTH}
                  placeholder={
                    DECISION_CONFIG[activeDecision].noteRequired
                      ? 'Enter your reasoning...'
                      : 'Optional note for the author...'
                  }
                  className="min-h-24 resize-y"
                  disabled={isPending}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {remainingChars} characters remaining
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={DECISION_CONFIG[activeDecision].variant}
                  onClick={handleConfirm}
                  disabled={
                    isPending ||
                    (DECISION_CONFIG[activeDecision].noteRequired &&
                      decisionNote.trim().length === 0)
                  }
                >
                  {isPending
                    ? 'Submitting...'
                    : DECISION_CONFIG[activeDecision].confirmLabel}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </section>
  )
}
