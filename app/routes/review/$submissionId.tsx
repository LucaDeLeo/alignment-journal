import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import * as React from 'react'

import { api } from 'convex/_generated/api'
import type { Id } from 'convex/_generated/dataModel'
import { RouteSkeleton } from '~/components/route-skeleton'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '~/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { PaperPanel, ReviewPanel, WorkspaceHeader } from '~/features/review'

export const Route = createFileRoute('/review/$submissionId')({
  component: ReviewWorkspacePage,
})

function useIsNarrow(breakpoint = 880) {
  const [isNarrow, setIsNarrow] = React.useState(false)
  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    setIsNarrow(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsNarrow(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])
  return isNarrow
}

function ReviewWorkspacePage() {
  const { submissionId } = Route.useParams()
  const navigate = useNavigate()

  const data = useQuery(api.reviews.getSubmissionForReviewer, {
    submissionId: submissionId as Id<'submissions'>,
  })
  const startReview = useMutation(api.reviews.startReview)
  const extractPdfText = useAction(api.pdfExtraction.extractPdfText)
  const isNarrow = useIsNarrow()

  const [isExtracting, setIsExtracting] = React.useState(false)
  const extractionTriggered = React.useRef(false)
  const startReviewTriggered = React.useRef(false)

  // Auto-transition review from assigned to in_progress
  React.useEffect(() => {
    if (data && data.review.status === 'assigned' && !startReviewTriggered.current) {
      startReviewTriggered.current = true
      void startReview({ submissionId: submissionId as Id<'submissions'> })
    }
  }, [data, startReview, submissionId])

  // Auto-trigger PDF text extraction if not cached
  React.useEffect(() => {
    if (
      data &&
      data.submission.extractedText === undefined &&
      !extractionTriggered.current
    ) {
      extractionTriggered.current = true
      setIsExtracting(true)
      void extractPdfText({
        submissionId: submissionId as Id<'submissions'>,
      }).finally(() => {
        setIsExtracting(false)
      })
    }
  }, [data, extractPdfText, submissionId])

  // Update extraction state when data changes (reactive)
  React.useEffect(() => {
    if (data?.submission.extractedText !== undefined) {
      setIsExtracting(false)
    }
  }, [data?.submission.extractedText])

  if (data === undefined) {
    return <RouteSkeleton variant="sidebar" />
  }

  if (data === null) {
    void navigate({ to: '/review' })
    return null
  }

  const { submission, review } = data

  const paperPanel = (
    <PaperPanel
      title={submission.title}
      authors={submission.authors}
      abstract={submission.abstract}
      extractedText={submission.extractedText}
      pdfUrl={submission.pdfUrl}
      isExtracting={isExtracting}
    />
  )

  const reviewPanel = (
    <ReviewPanel
      reviewId={review._id}
      submissionId={submission._id}
      sections={review.sections}
      revision={review.revision}
      status={review.status}
      submittedAt={review.submittedAt}
    />
  )

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <WorkspaceHeader title={submission.title} />
      {isNarrow ? (
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="paper" className="flex h-full flex-col">
            <div className="border-b px-4 pt-2">
              <TabsList>
                <TabsTrigger value="paper">Paper</TabsTrigger>
                <TabsTrigger value="review">Review</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="paper" className="flex-1 overflow-hidden">
              {paperPanel}
            </TabsContent>
            <TabsContent value="review" className="flex-1 overflow-hidden">
              {reviewPanel}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <ResizablePanelGroup
          orientation="horizontal"
          className="flex-1"
        >
          <ResizablePanel defaultSize={55} minSize={30}>
            {paperPanel}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={25}>
            {reviewPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  )
}
