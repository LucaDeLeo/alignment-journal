import { SendIcon } from 'lucide-react'

import { SECTION_DEFS } from './review-form'
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
  const totalWords = SECTION_DEFS.reduce(
    (sum, def) => sum + countWords(sections[def.name as keyof ReviewSections] ?? ''),
    0,
  )
  const allFilled = SECTION_DEFS.every(
    (def) => (sections[def.name as keyof ReviewSections] ?? '').trim().length > 0,
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
          {SECTION_DEFS.map((def) => {
            const content = sections[def.name as keyof ReviewSections] ?? ''
            const wc = countWords(content)
            return (
              <div key={def.name}>
                <div className="flex items-center justify-between">
                  <h4 className="font-sans text-sm font-medium">
                    {def.label}
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
