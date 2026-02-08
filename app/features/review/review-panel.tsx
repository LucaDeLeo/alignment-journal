import { BookOpenIcon, InfoIcon, MessageSquareIcon } from 'lucide-react'

import { ProgressRing } from './progress-ring'
import { ReviewForm } from './review-form'
import { getSectionStatus } from './review-section-field'

import type { Id } from 'convex/_generated/dataModel'
import type { ReviewSections } from './review-form'

import { ScrollArea } from '~/components/ui/scroll-area'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '~/components/ui/tabs'

const SECTION_KEYS = [
  'summary',
  'strengths',
  'weaknesses',
  'questions',
  'recommendation',
] as const

/**
 * Tabbed review panel with Write Review, Discussion, and Guidelines tabs.
 * Receives review data as props and renders ReviewForm in the Write tab.
 */
export function ReviewPanel({
  reviewId,
  submissionId,
  sections,
  revision,
  status,
  submittedAt,
}: {
  reviewId: Id<'reviews'>
  submissionId: Id<'submissions'>
  sections: ReviewSections
  revision: number
  status: string
  submittedAt?: number
}) {
  const completedCount = SECTION_KEYS.filter((key) => {
    const val = sections[key] ?? ''
    return getSectionStatus(key, val) === 'complete'
  }).length

  return (
    <ScrollArea className="h-full">
      <div className="bg-muted/50 p-4 space-y-4">
        <Tabs defaultValue="write" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="write" className="flex-1 gap-1.5">
              <BookOpenIcon className="size-3.5" aria-hidden="true" />
              Write Review
            </TabsTrigger>
            <TabsTrigger value="discussion" className="flex-1 gap-1.5">
              <MessageSquareIcon className="size-3.5" aria-hidden="true" />
              Discussion
            </TabsTrigger>
            <TabsTrigger value="guidelines" className="flex-1 gap-1.5">
              <InfoIcon className="size-3.5" aria-hidden="true" />
              Guidelines
            </TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="mt-4">
            <div className="flex items-center gap-2 mb-4">
              <ProgressRing completed={completedCount} total={5} />
            </div>
            <ReviewForm
              sections={sections}
              reviewId={reviewId}
              submissionId={submissionId}
              revision={revision}
              status={status}
              submittedAt={submittedAt}
            />
          </TabsContent>

          <TabsContent value="discussion" className="mt-4">
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-6 text-center">
              <MessageSquareIcon className="size-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Discussion will be available after you submit your review
              </p>
            </div>
          </TabsContent>

          <TabsContent value="guidelines" className="mt-4">
            <div className="rounded-lg border bg-background p-6">
              <h3 className="mb-3 font-sans text-sm font-semibold">
                Review Guidelines
              </h3>
              <div className="space-y-2 font-sans text-sm text-muted-foreground">
                <p>
                  The Alignment Journal values rigorous, constructive reviews
                  that help authors improve their work. A good review for this
                  journal:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Summarizes the paper&apos;s main contribution and evaluates
                    its significance to theoretical AI alignment research
                  </li>
                  <li>
                    Identifies specific strengths in methodology, argumentation,
                    and novelty
                  </li>
                  <li>
                    Points out weaknesses with concrete suggestions for
                    improvement
                  </li>
                  <li>
                    Raises substantive questions that could strengthen the work
                  </li>
                  <li>
                    Provides a clear recommendation with supporting rationale
                  </li>
                </ul>
                <p>
                  Reviews are semi-confidential: your identity is hidden from
                  authors, but visible to editors and other reviewers for the
                  same submission.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  )
}
