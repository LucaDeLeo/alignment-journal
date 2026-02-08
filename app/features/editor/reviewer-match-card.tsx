import { CheckIcon, UserIcon, XIcon } from 'lucide-react'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'

interface MatchData {
  profileId: string
  userId: string
  reviewerName: string
  affiliation: string
  researchAreas: Array<string>
  publicationTitles: Array<string>
  rationale: string
  confidence: number
}

interface ReviewerMatchCardProps {
  match: MatchData
  isSelected: boolean
  isDismissed: boolean
  onSelect: () => void
  onDismiss: () => void
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-green-500'
  if (confidence >= 0.5) return 'bg-amber-500'
  return 'bg-muted-foreground'
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High'
  if (confidence >= 0.5) return 'Medium'
  return 'Low'
}

export function ReviewerMatchCard({
  match,
  isSelected,
  isDismissed,
  onSelect,
  onDismiss,
}: ReviewerMatchCardProps) {
  return (
    <Card
      className={`transition-all ${
        isSelected
          ? 'border-primary ring-1 ring-primary/20'
          : isDismissed
            ? 'opacity-50'
            : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Header: name + affiliation */}
            <div className="flex items-center gap-2">
              {isSelected ? (
                <CheckIcon className="size-4 shrink-0 text-primary" />
              ) : (
                <UserIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <h4 className="truncate font-sans text-sm font-medium">
                {match.reviewerName}
              </h4>
            </div>
            <p className="mt-0.5 truncate pl-6 text-xs text-muted-foreground">
              {match.affiliation}
            </p>

            {/* Research area tags */}
            <div className="mt-2 flex flex-wrap gap-1 pl-6">
              {match.researchAreas.map((area) => (
                <Badge
                  key={area}
                  variant="secondary"
                  className="text-xs"
                >
                  {area}
                </Badge>
              ))}
            </div>

            {/* Rationale */}
            <p className="mt-2 pl-6 text-sm text-muted-foreground">
              {match.rationale}
            </p>

            {/* Confidence indicator */}
            <div className="mt-2 flex items-center gap-2 pl-6">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${getConfidenceColor(match.confidence)}`}
                  style={{ width: `${Math.round(match.confidence * 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {getConfidenceLabel(match.confidence)} ({Math.round(match.confidence * 100)}%)
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 flex-col gap-1">
            <Button
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={onSelect}
              className="h-7 text-xs"
            >
              {isSelected ? (
                <>
                  <CheckIcon className="mr-1 size-3" />
                  Selected
                </>
              ) : (
                'Select'
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-7 text-xs text-muted-foreground"
              disabled={isDismissed}
            >
              <XIcon className="mr-1 size-3" />
              Dismiss
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
