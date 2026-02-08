import { createFileRoute } from '@tanstack/react-router'

import type { Id } from 'convex/_generated/dataModel'
import { ArticlePage } from '~/features/article'

export const Route = createFileRoute('/article/$articleId')({
  component: ArticleDetailPage,
})

function ArticleDetailPage() {
  const { articleId } = Route.useParams()
  return <ArticlePage articleId={articleId as Id<'submissions'>} />
}
