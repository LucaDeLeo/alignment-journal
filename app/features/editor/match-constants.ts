/** Match tier type. */
export type MatchTier = 'great' | 'good' | 'exploring'

/** Sort order for match tiers (lower = higher priority). */
export const TIER_ORDER: Record<MatchTier, number> = {
  great: 0,
  good: 1,
  exploring: 2,
}

/** Display labels for match tiers. */
export const TIER_LABELS: Record<MatchTier, string> = {
  great: 'Great Match',
  good: 'Good Match',
  exploring: 'Exploring',
}

/** CSS classes for tier badges. */
export const TIER_COLORS: Record<MatchTier, string> = {
  great: 'text-green-700 bg-green-50 border-green-200',
  good: 'text-amber-700 bg-amber-50 border-amber-200',
  exploring: 'text-blue-700 bg-blue-50 border-blue-200',
}
