import { cn } from '~/lib/utils'

/**
 * Keyboard shortcut display component.
 * Shows a styled `<kbd>` element with platform-aware modifier keys.
 */
export function Kbd({
  className,
  children,
  ...props
}: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}
