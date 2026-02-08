import { AlertTriangleIcon, CheckIcon, LoaderIcon } from 'lucide-react'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs"
      aria-live="polite"
      role="status"
    >
      {state === 'saving' && (
        <>
          <LoaderIcon className="size-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {state === 'saved' && (
        <>
          <CheckIcon className="size-3 text-muted-foreground" />
          <span className="text-muted-foreground">Saved</span>
        </>
      )}
      {state === 'error' && (
        <>
          <AlertTriangleIcon className="size-3 text-amber-500" />
          <span className="text-amber-500">Error</span>
        </>
      )}
    </span>
  )
}
