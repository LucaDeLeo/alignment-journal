interface ReviewProgressIndicatorProps {
  indicator: 'green' | 'amber' | 'red'
  label: string
}

const DOT_COLORS: Record<string, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
}

export function ReviewProgressIndicator({
  indicator,
  label,
}: ReviewProgressIndicatorProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block size-2 shrink-0 rounded-full ${DOT_COLORS[indicator]}`}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  )
}
