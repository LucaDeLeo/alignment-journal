/**
 * Persistent green badge indicating review confidentiality.
 * Renders "Hidden from authors" with a green dot indicator.
 * Not dismissible.
 */
export function ConfidentialityBadge() {
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
    >
      <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
      Hidden from authors
    </span>
  )
}
