import { SendIcon } from 'lucide-react'

import { countWords } from './review-section-field'
import type { ReviewSections } from './review-form'
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
import { Separator } from '~/components/ui/separator'

const SECTION_LABELS: Record<string, string> = {
  summary: 'Summary',
  strengths: 'Strengths',
  weaknesses: 'Weaknesses',
  questions: 'Questions',
  recommendation: 'Recommendation',
}

const SECTION_ORDER = [
  'summary',
  'strengths',
  'weaknesses',
  'questions',
  'recommendation',
] as const

export function PreSubmitSummary({
  sections,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: {
  sections: ReviewSections
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isSubmitting: boolean
}) {
  const totalWords = SECTION_ORDER.reduce(
    (sum, key) => sum + countWords(sections[key] ?? ''),
    0,
  )
  const allFilled = SECTION_ORDER.every(
    (key) => (sections[key] ?? '').trim().length > 0,
  )

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Submit Review</AlertDialogTitle>
          <AlertDialogDescription>
            Review your feedback before submitting. You will have a 15-minute
            window to make edits after submission.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {SECTION_ORDER.map((key) => {
            const content = sections[key] ?? ''
            const wc = countWords(content)
            return (
              <div key={key}>
                <div className="flex items-center justify-between">
                  <h4 className="font-sans text-sm font-medium">
                    {SECTION_LABELS[key]}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {wc} {wc === 1 ? 'word' : 'words'}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap font-serif text-sm leading-relaxed text-foreground/80">
                  {content || (
                    <span className="italic text-muted-foreground">Empty</span>
                  )}
                </p>
                <Separator className="mt-3" />
              </div>
            )
          })}

          <div className="flex items-center justify-between text-sm font-medium">
            <span>Total</span>
            <span>
              {totalWords} {totalWords === 1 ? 'word' : 'words'}
            </span>
          </div>

          {!allFilled && (
            <p className="text-sm text-destructive">
              All 5 sections must have content before submitting.
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!allFilled || isSubmitting}
            className="gap-1.5"
          >
            <SendIcon className="size-3.5" />
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
