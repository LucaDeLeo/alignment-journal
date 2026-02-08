import { useQuery } from 'convex/react'
import { TagIcon } from 'lucide-react'

import { api } from '../../../convex/_generated/api'

import { ArticleMetadata } from './article-metadata'
import { DualAbstractDisplay } from './dual-abstract-display'
import type { Id } from '../../../convex/_generated/dataModel'

import { Badge } from '~/components/ui/badge'
import { Separator } from '~/components/ui/separator'

interface ArticlePageProps {
  articleId: Id<'submissions'>
}

export function ArticlePage({ articleId }: ArticlePageProps) {
  const article = useQuery(api.articles.getPublishedArticle, { articleId })

  if (article === undefined) return null

  return (
    <main className="mx-auto max-w-[75ch] px-6 py-16">
      <h1 className="font-serif text-3xl font-bold tracking-tight">
        {article.title}
      </h1>

      <div className="mt-6">
        <ArticleMetadata
          authors={article.authors}
          decidedAt={article.decidedAt}
          createdAt={article.createdAt}
          pdfUrl={article.pdfUrl}
          pdfFileName={article.pdfFileName}
          pdfFileSize={article.pdfFileSize}
        />
      </div>

      <Separator className="my-8" />

      <DualAbstractDisplay
        authorAbstract={article.abstract}
        reviewerAbstract={article.reviewerAbstract}
      />

      {article.keywords.length > 0 && (
        <>
          <Separator className="my-8" />
          <section aria-labelledby="keywords-heading">
            <h2
              id="keywords-heading"
              className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
            >
              <TagIcon className="size-4" />
              Keywords
            </h2>
            <div className="flex flex-wrap gap-2">
              {article.keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
