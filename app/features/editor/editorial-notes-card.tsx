import { LightbulbIcon } from 'lucide-react'

import { Card, CardContent, CardHeader } from '~/components/ui/card'

interface EditorialNotesCardProps {
  notes: Array<string>
  suggestedCombination?: Array<number>
  modelVersion?: string
  computedAt?: number
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays > 0) {
    return `${diffDays}d ago`
  }
  if (diffHours > 0) {
    return `${diffHours}h ago`
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`
  }
  return 'just now'
}

export function EditorialNotesCard({
  notes,
  suggestedCombination,
  modelVersion,
  computedAt,
}: EditorialNotesCardProps) {
  return (
    <Card className="border-primary/20 bg-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <LightbulbIcon className="size-4 text-primary" />
          <h3 className="text-sm font-medium">Editorial Recommendations</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          {notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>

        {suggestedCombination && suggestedCombination.length > 0 && (
          <div className="rounded-md bg-primary/10 p-3 text-sm">
            <span className="font-medium">Suggested reviewer combination:</span>{' '}
            Candidates{' '}
            {suggestedCombination.map((num, idx) => (
              <span key={num}>
                #{num}
                {idx < suggestedCombination.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        )}

        {(modelVersion || computedAt) && (
          <div className="border-t pt-3 text-xs text-muted-foreground">
            {computedAt && <>Computed {formatRelativeTime(computedAt)}</>}
            {computedAt && modelVersion && ' \u00B7 '}
            {modelVersion}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
