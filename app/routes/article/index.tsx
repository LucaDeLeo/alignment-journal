import { Link, createFileRoute } from '@tanstack/react-router'
import { usePaginatedQuery } from 'convex/react'
import { FileTextIcon } from 'lucide-react'

import { api } from 'convex/_generated/api'
import { Button } from '~/components/ui/button'
import { formatDate } from '~/features/submissions/status-utils'

export const Route = createFileRoute('/article/')({
  component: ArticleIndex,
})

function ArticleIndex() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.articles.listPublished,
    {},
    { initialNumItems: 10 },
  )

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-serif text-3xl font-bold tracking-tight">
        Published Articles
      </h1>
      <p className="mt-2 text-muted-foreground">
        Browse peer-reviewed research in theoretical AI alignment.
      </p>

      {results.length === 0 && status !== 'LoadingFirstPage' ? (
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-muted p-4">
            <FileTextIcon className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium">No published articles yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Articles will appear here once they complete the peer review process
            and are accepted for publication.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {results.map((article) => (
            <Link
              key={article._id}
              to="/article/$articleId"
              params={{ articleId: article._id }}
              className="block rounded-lg border p-5 transition-colors hover:bg-accent/50"
            >
              <h2 className="font-serif text-xl font-semibold tracking-tight">
                {article.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {article.authors
                  .slice(0, 2)
                  .map((a) => a.name)
                  .join(', ')}
                {article.authors.length > 2 && ' et al.'}
                {' \u00B7 '}
                {formatDate(article.decidedAt ?? article.createdAt)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                {article.abstractPreview}
                {article.abstractPreview.length >= 300 ? '...' : ''}
              </p>
            </Link>
          ))}

          {status === 'CanLoadMore' && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => loadMore(10)}
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
