import { SearchIcon, XIcon } from 'lucide-react'
import * as React from 'react'

import {
  STATUS_COLORS,
  STATUS_LABELS,
  SUBMISSION_STATUSES,
} from './editor-constants'
import type { SubmissionStatus } from './editor-constants'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'


interface PipelineFiltersProps {
  selectedStatuses: Array<SubmissionStatus>
  onStatusToggle: (status: SubmissionStatus) => void
  onClearAll: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function PipelineFilters({
  selectedStatuses,
  onStatusToggle,
  onClearAll,
  searchQuery,
  onSearchChange,
}: PipelineFiltersProps) {
  const [localSearch, setLocalSearch] = React.useState(searchQuery)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(null)

  React.useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  function handleSearchInput(value: string) {
    setLocalSearch(value)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      onSearchChange(value)
    }, 300)
  }

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const hasFilters = selectedStatuses.length > 0 || searchQuery.length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            value={localSearch}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
          >
            <XIcon className="size-3.5" />
            Clear filters
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SUBMISSION_STATUSES.filter((s) => s !== 'DRAFT').map((status) => {
          const isSelected = selectedStatuses.includes(status)
          return (
            <button
              key={status}
              type="button"
              onClick={() => onStatusToggle(status)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
            >
              <Badge
                variant={isSelected ? 'default' : 'outline'}
                className={
                  isSelected
                    ? `${STATUS_COLORS[status]} cursor-pointer border-transparent`
                    : 'cursor-pointer text-muted-foreground'
                }
              >
                {STATUS_LABELS[status]}
              </Badge>
            </button>
          )
        })}
      </div>
    </div>
  )
}
