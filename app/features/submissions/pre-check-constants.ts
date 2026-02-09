/** Display names for each pre-check pass, used by progress and report UI. */
export const PRE_CHECK_DISPLAY_NAMES: Record<string, string> = {
  scope: 'Scope Fit',
  formatting: 'Paper Structure',
  citations: 'References',
  claims: 'Technical Strength',
}

/** Canonical order of pre-check passes in the UI. */
export const PRE_CHECK_PASS_ORDER = [
  'scope',
  'formatting',
  'citations',
  'claims',
] as const
