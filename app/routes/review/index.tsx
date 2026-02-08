import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { ChevronRightIcon, FileTextIcon, UsersIcon } from 'lucide-react'

import { api } from 'convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'

export const Route = createFileRoute('/review/')({
  component: ReviewListPage,
})

const REVIEW_STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  locked: 'Locked',
}

const REVIEW_STATUS_COLORS: Record<string, string> = {
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  submitted: 'bg-green-100 text-green-800',
  locked: 'bg-gray-100 text-gray-800',
}

function ReviewListPage() {
  const reviews = useQuery(api.reviews.listByReviewer, {})

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Review Workspace
      </h1>
      <p className="mt-2 text-muted-foreground">
        Review assigned submissions and provide structured feedback.
      </p>

      {reviews === undefined ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-20 w-full skeleton-shimmer" />
          <Skeleton className="h-20 w-full skeleton-shimmer" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-muted p-4">
            <UsersIcon className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium">No reviews assigned</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            When you are invited to review a submission, it will appear here
            with the review form and paper viewer.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {reviews.map((review) => (
            <Link
              key={review._id}
              to="/review/$submissionId"
              params={{ submissionId: review.submissionId }}
              className="block"
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-muted p-2">
                    <FileTextIcon
                      className="size-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{review.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Assigned{' '}
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      REVIEW_STATUS_COLORS[review.reviewStatus] ?? ''
                    }
                  >
                    {REVIEW_STATUS_LABELS[review.reviewStatus] ??
                      review.reviewStatus}
                  </Badge>
                  <ChevronRightIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
