import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutDashboardIcon, ListFilterIcon } from 'lucide-react'

import { STATUS_GROUPS, STATUS_LABELS } from './editor-constants'

import type { SubmissionStatus } from './editor-constants'

export function EditorSidebar() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const currentSearch = routerState.location.search as Record<string, unknown>

  const isDashboard =
    currentPath === '/editor' || currentPath === '/editor/'

  function isStatusGroupActive(
    statuses: ReadonlyArray<SubmissionStatus>,
  ) {
    if (!isDashboard) return false
    const rawStatus = currentSearch.status
    if (typeof rawStatus !== 'string' || !rawStatus) return false
    const activeStatuses = rawStatus.split(',')
    return (
      activeStatuses.length === statuses.length &&
      statuses.every((s) => activeStatuses.includes(s))
    )
  }

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-muted/30 p-4">
      <nav className="space-y-1">
        <Link
          to="/editor"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isDashboard && !currentSearch.status
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          }`}
        >
          <LayoutDashboardIcon className="size-4" />
          Dashboard
        </Link>
      </nav>

      <div className="mt-6">
        <h3 className="flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ListFilterIcon className="size-3.5" />
          Pipeline
        </h3>
        <nav className="mt-2 space-y-0.5">
          {STATUS_GROUPS.map((group) => (
            <Link
              key={group.label}
              to="/editor"
              search={{ status: group.statuses.join(',') }}
              className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                isStatusGroupActive(group.statuses)
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              {group.label}
              <span className="ml-1 text-xs text-muted-foreground">
                ({group.statuses.map((s) => STATUS_LABELS[s]).join(', ')})
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}
