import { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { RefreshCwIcon, SearchIcon, SparklesIcon } from 'lucide-react'

import { api } from '../../../convex/_generated/api'
import { InvitationPanel } from './invitation-panel'
import { ReviewerMatchCard } from './reviewer-match-card'

import type { Id } from '../../../convex/_generated/dataModel'

import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { Skeleton } from '~/components/ui/skeleton'

interface ReviewerMatchPanelProps {
  submissionId: Id<'submissions'>
}

export function ReviewerMatchPanel({
  submissionId,
}: ReviewerMatchPanelProps) {
  const matchResults = useQuery(api.matching.getMatchResults, {
    submissionId,
  })
  const findMatches = useAction(api.matching.findMatches)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [isTriggering, setIsTriggering] = useState(false)

  const handleRunMatching = async () => {
    setIsTriggering(true)
    setSelectedIds(new Set())
    setDismissedIds(new Set())
    try {
      await findMatches({ submissionId })
    } catch {
      // Error will be reflected in matchResults status
    } finally {
      setIsTriggering(false)
    }
  }

  const handleSelect = (profileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(profileId)) {
        next.delete(profileId)
      } else {
        next.add(profileId)
      }
      return next
    })
    // Un-dismiss if dismissed
    setDismissedIds((prev) => {
      const next = new Set(prev)
      next.delete(profileId)
      return next
    })
  }

  const handleDismiss = (profileId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev)
      next.add(profileId)
      return next
    })
    // Un-select if selected
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(profileId)
      return next
    })
  }

  const isRunning =
    isTriggering || matchResults?.status === 'running'
  const hasResults =
    matchResults?.status === 'complete' &&
    matchResults.matches.length > 0
  const hasFailed = matchResults?.status === 'failed'
  const isEmpty =
    matchResults?.status === 'complete' &&
    matchResults.matches.length === 0
  const hasExistingResults = matchResults != null

  // Sort matches: selected first, then unselected, then dismissed
  const sortedMatches = hasResults
    ? [...matchResults.matches].sort((a, b) => {
        const aSelected = selectedIds.has(a.profileId) ? 0 : 1
        const bSelected = selectedIds.has(b.profileId) ? 0 : 1
        const aDismissed = dismissedIds.has(a.profileId) ? 1 : 0
        const bDismissed = dismissedIds.has(b.profileId) ? 1 : 0
        if (aSelected !== bSelected) return aSelected - bSelected
        if (aDismissed !== bDismissed) return aDismissed - bDismissed
        return 0
      })
    : []

  const selectedCount = selectedIds.size

  // Build selected reviewer data for InvitationPanel
  const selectedReviewers = hasResults
    ? matchResults.matches
        .filter((m) => selectedIds.has(m.profileId))
        .map((m) => ({
          userId: m.userId,
          reviewerName: m.reviewerName,
          affiliation: m.affiliation,
          rationale: m.rationale,
        }))
    : []

  const handleInvitationsSent = () => {
    setSelectedIds(new Set())
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <SparklesIcon className="size-3.5" />
          Find Reviewers
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunMatching}
          disabled={isRunning}
          className="h-8"
        >
          {isRunning ? (
            <>
              <RefreshCwIcon className="mr-1.5 size-3.5 animate-spin" />
              Finding...
            </>
          ) : hasExistingResults ? (
            <>
              <RefreshCwIcon className="mr-1.5 size-3.5" />
              Re-run Matching
            </>
          ) : (
            <>
              <SearchIcon className="mr-1.5 size-3.5" />
              Run Matching
            </>
          )}
        </Button>
      </div>

      <Separator className="my-4" />

      {/* Loading state */}
      {isRunning && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Finding matched reviewers...
          </p>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {/* Error state */}
      {hasFailed && !isRunning && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {matchResults.error ?? 'Reviewer matching failed. Please try again.'}
          </p>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && !isRunning && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No reviewer profiles with embeddings available. Add profiles in
            the Admin panel.
          </p>
        </div>
      )}

      {/* Results */}
      {hasResults && !isRunning && (
        <div className="space-y-3">
          {selectedCount > 0 && (
            <p className="text-sm font-medium text-primary">
              {selectedCount} reviewer{selectedCount !== 1 ? 's' : ''} selected
            </p>
          )}
          {sortedMatches.map((match) => (
            <ReviewerMatchCard
              key={match.profileId}
              match={match}
              isSelected={selectedIds.has(match.profileId)}
              isDismissed={dismissedIds.has(match.profileId)}
              onSelect={() => handleSelect(match.profileId)}
              onDismiss={() => handleDismiss(match.profileId)}
            />
          ))}

          {/* Invitation panel */}
          <InvitationPanel
            submissionId={submissionId}
            selectedReviewers={selectedReviewers}
            onInvitationsSent={handleInvitationsSent}
          />
        </div>
      )}

      {/* No results yet, not running */}
      {!hasExistingResults && !isRunning && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Click &ldquo;Run Matching&rdquo; to find reviewer suggestions
            based on expertise overlap.
          </p>
        </div>
      )}
    </section>
  )
}
