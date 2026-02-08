/**
 * Shared role constants for the Convex layer.
 *
 * TD-020: These constants were previously duplicated across 7+ files.
 * Centralized here to ensure a single source of truth for role-based
 * access checks throughout the codebase.
 */

/** Roles with editor-level access (read submissions, manage reviews, etc.). */
export const EDITOR_ROLES = [
  'editor_in_chief',
  'action_editor',
  'admin',
] as const

/** Roles allowed to write/modify reviewer profiles. */
export const WRITE_ROLES = ['admin', 'editor_in_chief'] as const

/**
 * Type-safe check for editor-level access.
 *
 * Avoids the `as (typeof EDITOR_ROLES)[number]` cast required by
 * `ReadonlyArray.includes()` when the input type is wider than
 * the array's element type.
 */
export function hasEditorRole(role: string): boolean {
  return (EDITOR_ROLES as ReadonlyArray<string>).includes(role)
}
