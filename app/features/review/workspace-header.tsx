import { Link } from '@tanstack/react-router'
import { ChevronRightIcon } from 'lucide-react'

import { ConfidentialityBadge } from './confidentiality-badge'

/**
 * Workspace header with breadcrumb navigation and confidentiality badge.
 * Spans full width above the split-view panels.
 */
export function WorkspaceHeader({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between border-b bg-surface-elevated px-4 py-3">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link to="/review" className="shrink-0 text-muted-foreground hover:text-foreground">
          Reviews
        </Link>
        <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate font-medium">{title}</span>
      </nav>
      <div className="shrink-0 pl-4">
        <ConfidentialityBadge />
      </div>
    </header>
  )
}
