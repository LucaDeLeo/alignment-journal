import { useState } from 'react'
import {
  BookmarkIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  XIcon,
} from 'lucide-react'

import { TIER_COLORS, TIER_LABELS } from './match-constants'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'

import type { MatchTier } from './match-constants'

interface MatchData {
  profileId: string
  userId: string
  reviewerName: string
  affiliation: string
  researchAreas: Array<string>
  publicationTitles: Array<string>
  tier: MatchTier
  score: number
  strengths: Array<string>
  gapAnalysis: string
  recommendations: Array<string>
}

interface ReviewerMatchCardProps {
  match: MatchData
  isSaved: boolean
  isDismissed: boolean
  onSave: () => void
  onDismiss: () => void
  onUnsave: () => void
  onUndismiss: () => void
}

export function ReviewerMatchCard({
  match,
  isSaved,
  isDismissed,
  onSave,
  onDismiss,
  onUnsave,
  onUndismiss,
}: ReviewerMatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasDetails =
    match.gapAnalysis.length > 0 ||
    match.recommendations.length > 0

  return (
    <Card
      className={`transition-all ${
        isSaved
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
              {isSaved ? (
                <BookmarkIcon className="size-4 shrink-0 fill-primary text-primary" />
              ) : (
                <UserIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <h4 className="truncate font-sans text-sm font-medium">
                {match.reviewerName}
              </h4>
              {/* Tier badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TIER_COLORS[match.tier]}`}
              >
                {TIER_LABELS[match.tier]}
                <span className="opacity-70">{Math.round(match.score)}</span>
              </span>
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

            {/* Strengths */}
            {match.strengths.length > 0 && (
              <ul className="mt-2 space-y-1 pl-6">
                {match.strengths.map((strength, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-sm text-muted-foreground"
                  >
                    <CheckIcon className="mt-0.5 size-3 shrink-0 text-green-600" />
                    {strength}
                  </li>
                ))}
              </ul>
            )}

            {/* Collapsible details */}
            {hasDetails && (
              <>
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-2 flex items-center gap-1 pl-6 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? (
                    <ChevronUpIcon className="size-3" />
                  ) : (
                    <ChevronDownIcon className="size-3" />
                  )}
                  {isExpanded ? 'Hide details' : 'Show details'}
                </button>

                {isExpanded && (
                  <div className="mt-2 space-y-2 pl-6">
                    {match.gapAnalysis && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Gap Analysis
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {match.gapAnalysis}
                        </p>
                      </div>
                    )}
                    {match.recommendations &&
                      match.recommendations.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Recommendations
                          </p>
                          <ul className="mt-0.5 list-disc pl-4 text-sm text-muted-foreground">
                            {match.recommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 flex-col gap-1">
            {isSaved ? (
              <Button
                variant="default"
                size="sm"
                onClick={onUnsave}
                className="h-7 text-xs"
              >
                <BookmarkIcon className="mr-1 size-3 fill-current" />
                Saved
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                className="h-7 text-xs"
                disabled={isDismissed}
              >
                <BookmarkIcon className="mr-1 size-3" />
                Save
              </Button>
            )}
            {isDismissed ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onUndismiss}
                className="h-7 text-xs text-muted-foreground"
              >
                Undo
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-7 text-xs text-muted-foreground"
                disabled={isSaved}
              >
                <XIcon className="mr-1 size-3" />
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
