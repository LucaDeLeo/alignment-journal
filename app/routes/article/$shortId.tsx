import { createFileRoute } from '@tanstack/react-router'

import { ArticlePage } from '~/features/article'

export const Route = createFileRoute('/article/$shortId')({
  component: ArticleDetailPage,
})

function ArticleDetailPage() {
  const { shortId } = Route.useParams()
  return <ArticlePage shortId={shortId} />
}
