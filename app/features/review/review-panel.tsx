import {
  AwardIcon,
  BookOpenIcon,
  InfoIcon,
  MessageSquareIcon,
} from 'lucide-react'

import { AbstractDraftForm } from './abstract-draft-form'
import { DiscussionThread } from './discussion-thread'
import { ReviewForm } from './review-form'

import type { Id } from 'convex/_generated/dataModel'
import type { ReviewSections } from './review-form'

import { ScrollArea } from '~/components/ui/scroll-area'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '~/components/ui/tabs'

/**
 * Tabbed review panel with Write Review, Discussion, Guidelines,
 * and (for ACCEPTED submissions) Abstract tabs.
 * Receives review data as props and renders ReviewForm in the Write tab.
 */
export function ReviewPanel({
  reviewId,
  submissionId,
  sections,
  revision,
  status,
  submittedAt,
  submissionStatus,
}: {
  reviewId: Id<'reviews'>
  submissionId: Id<'submissions'>
  sections: ReviewSections
  revision: number
  status: string
  submittedAt?: number
  submissionStatus: string
}) {
  const showAbstractTab = submissionStatus === 'ACCEPTED'

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
            {showAbstractTab && (
              <TabsTrigger value="abstract" className="flex-1 gap-1.5">
                <AwardIcon className="size-3.5" aria-hidden="true" />
                Abstract
              </TabsTrigger>
            )}
            <TabsTrigger value="guidelines" className="flex-1 gap-1.5">
              <InfoIcon className="size-3.5" aria-hidden="true" />
              Guidelines
            </TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="mt-4">
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
            <DiscussionThread
              submissionId={submissionId}
              reviewStatus={status}
            />
          </TabsContent>

          {showAbstractTab && (
            <TabsContent value="abstract" className="mt-4">
              <AbstractDraftForm submissionId={submissionId} />
            </TabsContent>
          )}

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
