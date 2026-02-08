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
