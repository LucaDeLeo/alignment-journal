import { ChevronDownIcon } from 'lucide-react'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible'
import { Textarea } from '~/components/ui/textarea'

type SectionStatus = 'not-started' | 'in-progress' | 'complete'

interface ConflictState {
  onReload: () => void
  onKeep: () => void
}

export function ReviewSectionField({
  name,
  label,
  guidance,
  placeholder,
  value,
  onChange,
  status,
  disabled,
  conflictState,
}: {
  name: string
  label: string
  guidance: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  status: SectionStatus
  disabled?: boolean
  conflictState?: ConflictState
}) {
  const wordCount = countWords(value)

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center justify-between">
        <span className="font-sans text-sm font-medium">{label}</span>
        <StatusBadge status={status} />
      </div>

      <Textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[120px] resize-y font-serif text-lg leading-[1.7]"
        disabled={disabled}
      />

      {conflictState && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
          <p className="text-amber-800 dark:text-amber-200">
            This section was updated elsewhere.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={conflictState.onReload}
            >
              Reload server version
            </Button>
            <Button variant="outline" size="sm" onClick={conflictState.onKeep}>
              Keep my version
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
        <Collapsible>
          <CollapsibleTrigger className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            Guidance
            <ChevronDownIcon className="size-3" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1">
            <p className="text-xs italic text-muted-foreground">{guidance}</p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </fieldset>
  )
}

function StatusBadge({ status }: { status: SectionStatus }) {
  if (status === 'not-started') {
    return <Badge variant="secondary">Not started</Badge>
  }
  if (status === 'in-progress') {
    return <Badge variant="default">In progress</Badge>
  }
  return (
    <Badge className="bg-green-600 text-white hover:bg-green-700">
      Complete
    </Badge>
  )
}

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function getSectionStatus(
  section: string,
  value: string,
): SectionStatus {
  const wc = countWords(value)
  if (wc === 0) return 'not-started'
  if (section === 'recommendation') return 'complete'
  if (wc >= 10) return 'complete'
  return 'in-progress'
}
