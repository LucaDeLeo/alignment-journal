import { useMemo, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { RefreshCwIcon, SearchIcon, SparklesIcon } from 'lucide-react'

import { api } from '../../../convex/_generated/api'
import { EditorialNotesCard } from './editorial-notes-card'
import { InvitationPanel } from './invitation-panel'
import { TIER_ORDER } from './match-constants'
import { ReviewerMatchCard } from './reviewer-match-card'

import type { Id } from '../../../convex/_generated/dataModel'
import type { MatchTier } from './match-constants'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { Skeleton } from '~/components/ui/skeleton'

type TierFilter = 'all' | MatchTier

function MatchButtonContent({
  isRunning,
  hasExistingResults,
}: {
  isRunning: boolean
  hasExistingResults: boolean
}) {
  if (isRunning) {
    return (
      <>
        <RefreshCwIcon className="mr-1.5 size-3.5 animate-spin" />
        Finding...
      </>
    )
  }
  if (hasExistingResults) {
    return (
      <>
        <RefreshCwIcon className="mr-1.5 size-3.5" />
        Re-run Matching
      </>
    )
  }
  return (
    <>
      <SearchIcon className="mr-1.5 size-3.5" />
      Run Matching
    </>
  )
}

interface ReviewerMatchPanelProps {
  submissionId: Id<'submissions'>
  submissionTitle: string
}

export function ReviewerMatchPanel({
  submissionId,
  submissionTitle,
}: ReviewerMatchPanelProps) {
  const matchResults = useQuery(api.matching.getMatchResults, {
    submissionId,
  })
  const findMatches = useAction(api.matchingActions.findMatches)
  const updateInteraction = useMutation(api.matching.updateMatchInteraction)
  const clearInteraction = useMutation(api.matching.clearMatchInteraction)

  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [isTriggering, setIsTriggering] = useState(false)

  async function handleRunMatching() {
    setIsTriggering(true)
    try {
      await findMatches({ submissionId })
    } catch {
      // Error will be reflected in matchResults status
    } finally {
      setIsTriggering(false)
    }
  }

  // Build interaction lookup from persisted data
  const interactions = useMemo(() => {
    const map = new Map<string, 'saved' | 'dismissed'>()
    if (matchResults?.matchInteractions) {
      for (const interaction of matchResults.matchInteractions) {
        map.set(interaction.profileId, interaction.state)
      }
    }
    return map
  }, [matchResults?.matchInteractions])

  function handleSave(profileId: string) {
    void updateInteraction({
      submissionId,
      profileId: profileId as Id<'reviewerProfiles'>,
      state: 'saved',
    })
  }

  function handleDismiss(profileId: string) {
    void updateInteraction({
      submissionId,
      profileId: profileId as Id<'reviewerProfiles'>,
      state: 'dismissed',
    })
  }

  function handleUnsave(profileId: string) {
    void clearInteraction({
      submissionId,
      profileId: profileId as Id<'reviewerProfiles'>,
    })
  }

  function handleUndismiss(profileId: string) {
    void clearInteraction({
      submissionId,
      profileId: profileId as Id<'reviewerProfiles'>,
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

  // Tier counts for filter badges
  const tierCounts = useMemo(() => {
    if (!hasResults) return { great: 0, good: 0, exploring: 0 }
    const counts = { great: 0, good: 0, exploring: 0 }
    for (const m of matchResults.matches) {
      if (m.tier === 'great') counts.great++
      else if (m.tier === 'good') counts.good++
      else if (m.tier === 'exploring') counts.exploring++
    }
    return counts
  }, [hasResults, matchResults?.matches])

  // Sort matches: saved first, then by tier+score, then dismissed last
  const sortedMatches = useMemo(() => {
    if (!hasResults) return []
    let filtered = matchResults.matches
    if (tierFilter !== 'all') {
      filtered = filtered.filter((m) => m.tier === tierFilter)
    }
    return [...filtered].sort((a, b) => {
      const aState = interactions.get(a.profileId)
      const bState = interactions.get(b.profileId)
      const aSaved = aState === 'saved' ? 0 : 1
      const bSaved = bState === 'saved' ? 0 : 1
      const aDismissed = aState === 'dismissed' ? 1 : 0
      const bDismissed = bState === 'dismissed' ? 1 : 0
      if (aSaved !== bSaved) return aSaved - bSaved
      if (aDismissed !== bDismissed) return aDismissed - bDismissed
      // Tier ordering
      const aTier = a.tier ? TIER_ORDER[a.tier] : 3
      const bTier = b.tier ? TIER_ORDER[b.tier] : 3
      if (aTier !== bTier) return aTier - bTier
      // Score within same tier
      return (b.score ?? 0) - (a.score ?? 0)
    })
  }, [hasResults, matchResults?.matches, tierFilter, interactions])

  const savedCount = useMemo(() => {
    let count = 0
    for (const [, state] of interactions) {
      if (state === 'saved') count++
    }
    return count
  }, [interactions])

  // Build saved reviewer data for InvitationPanel
  const selectedReviewers = useMemo(() => {
    if (!hasResults) return []
    return matchResults.matches
      .filter((m) => interactions.get(m.profileId) === 'saved')
      .map((m) => ({
        userId: m.userId,
        reviewerName: m.reviewerName,
        affiliation: m.affiliation,
        rationale: m.rationale,
      }))
  }, [hasResults, matchResults?.matches, interactions])

  // Summary line
  const summaryText = useMemo(() => {
    if (!hasResults) return ''
    const total = matchResults.matches.length
    const parts: Array<string> = []
    if (tierCounts.great > 0) parts.push(`${tierCounts.great} great`)
    if (tierCounts.good > 0) parts.push(`${tierCounts.good} good`)
    if (tierCounts.exploring > 0) parts.push(`${tierCounts.exploring} exploring`)
    return `${total} match${total !== 1 ? 'es' : ''} found${parts.length > 0 ? ` (${parts.join(', ')})` : ''}`
  }, [hasResults, matchResults?.matches, tierCounts])

  function handleInvitationsSent() {
    // Interactions are persisted server-side, no local state to clear
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
          <MatchButtonContent isRunning={isRunning} hasExistingResults={hasExistingResults} />
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
            No reviewer profiles available. Add profiles in the Admin panel.
          </p>
        </div>
      )}

      {/* Results */}
      {hasResults && !isRunning && (
        <div className="space-y-3">
          {/* Editorial notes */}
          {matchResults.editorialNotes &&
            matchResults.editorialNotes.length > 0 && (
              <EditorialNotesCard
                notes={matchResults.editorialNotes}
                suggestedCombination={matchResults.suggestedCombination}
                modelVersion={matchResults.modelVersion}
                computedAt={matchResults.computedAt}
              />
            )}

          {/* Summary + tier filter tabs */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{summaryText}</p>
            {savedCount > 0 && (
              <p className="text-sm font-medium text-primary">
                {savedCount} saved
              </p>
            )}
          </div>

          {/* Tier filter tabs */}
          {(tierCounts.great > 0 || tierCounts.good > 0 || tierCounts.exploring > 0) && (
            <div className="flex gap-1.5">
              <Button
                variant={tierFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTierFilter('all')}
                className="h-7 text-xs"
              >
                All
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {matchResults.matches.length}
                </Badge>
              </Button>
              {tierCounts.great > 0 && (
                <Button
                  variant={tierFilter === 'great' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTierFilter('great')}
                  className="h-7 text-xs"
                >
                  Great
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {tierCounts.great}
                  </Badge>
                </Button>
              )}
              {tierCounts.good > 0 && (
                <Button
                  variant={tierFilter === 'good' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTierFilter('good')}
                  className="h-7 text-xs"
                >
                  Good
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {tierCounts.good}
                  </Badge>
                </Button>
              )}
              {tierCounts.exploring > 0 && (
                <Button
                  variant={tierFilter === 'exploring' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTierFilter('exploring')}
                  className="h-7 text-xs"
                >
                  Exploring
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {tierCounts.exploring}
                  </Badge>
                </Button>
              )}
            </div>
          )}

          {/* Match cards */}
          {sortedMatches.map((match) => (
            <ReviewerMatchCard
              key={match.profileId}
              match={match}
              isSaved={interactions.get(match.profileId) === 'saved'}
              isDismissed={interactions.get(match.profileId) === 'dismissed'}
              onSave={() => handleSave(match.profileId)}
              onDismiss={() => handleDismiss(match.profileId)}
              onUnsave={() => handleUnsave(match.profileId)}
              onUndismiss={() => handleUndismiss(match.profileId)}
            />
          ))}

          {/* Invitation panel */}
          <InvitationPanel
            submissionId={submissionId}
            submissionTitle={submissionTitle}
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
