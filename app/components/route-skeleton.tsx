import { Skeleton } from '~/components/ui/skeleton'

/** Generic route-level skeleton layout for Suspense fallbacks. */
export function RouteSkeleton({ variant = 'default' }: { variant?: 'default' | 'centered' | 'sidebar' }) {
  if (variant === 'sidebar') {
    return (
      <div className="flex gap-6 p-6">
        <div className="flex w-56 shrink-0 flex-col gap-3">
          <Skeleton className="h-8 w-full skeleton-shimmer" />
          <Skeleton className="h-6 w-3/4 skeleton-shimmer" />
          <Skeleton className="h-6 w-3/4 skeleton-shimmer" />
          <Skeleton className="h-6 w-1/2 skeleton-shimmer" />
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-8 w-2/3 skeleton-shimmer" />
          <Skeleton className="h-48 w-full skeleton-shimmer" />
          <Skeleton className="h-24 w-full skeleton-shimmer" />
        </div>
      </div>
    )
  }

  if (variant === 'centered') {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-8">
        <Skeleton className="h-8 w-1/3 skeleton-shimmer" />
        <Skeleton className="h-4 w-2/3 skeleton-shimmer" />
        <Skeleton className="mt-4 h-64 w-full skeleton-shimmer" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8">
      <Skeleton className="h-8 w-1/4 skeleton-shimmer" />
      <Skeleton className="h-4 w-1/2 skeleton-shimmer" />
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-40 skeleton-shimmer" />
        <Skeleton className="h-40 skeleton-shimmer" />
        <Skeleton className="h-40 skeleton-shimmer" />
      </div>
    </div>
  )
}
