import type { Doc } from '../../../convex/_generated/dataModel'

/** Role value-to-label mapping, shared across the UI layer. */
export const ROLE_OPTIONS: Array<{
  value: Doc<'users'>['role']
  label: string
}> = [
  { value: 'author', label: 'Author' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'action_editor', label: 'Action Editor' },
  { value: 'editor_in_chief', label: 'Editor-in-Chief' },
  { value: 'admin', label: 'Admin' },
]

/** Maps internal role keys to human-readable display names. */
export const ROLE_DISPLAY_NAMES: Record<Doc<'users'>['role'], string> =
  Object.fromEntries(
    ROLE_OPTIONS.map((r) => [r.value, r.label]),
  ) as Record<Doc<'users'>['role'], string>

/**
 * Type-safe role check that avoids the `as` cast on `.includes()`.
 * Works with any readonly array of role strings.
 */
export function hasRole(
  role: string,
  allowed: ReadonlyArray<string>,
): boolean {
  return allowed.includes(role)
}
