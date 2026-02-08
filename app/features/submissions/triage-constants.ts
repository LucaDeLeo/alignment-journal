/** Display names for each triage pass, used by progress and report UI. */
export const PASS_DISPLAY_NAMES: Record<string, string> = {
  scope: 'Scope Fit',
  formatting: 'Formatting',
  citations: 'Citations',
  claims: 'Claims Analysis',
}

/** Canonical order of triage passes in the UI. */
export const PASS_ORDER = ['scope', 'formatting', 'citations', 'claims'] as const
