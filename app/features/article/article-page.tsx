import { useQuery } from 'convex/react'
import { DownloadIcon, TagIcon } from 'lucide-react'

import { api } from '../../../convex/_generated/api'

import { ArticleMetadata } from './article-metadata'
import { DualAbstractDisplay } from './dual-abstract-display'

import type { Id } from '../../../convex/_generated/dataModel'

import { ExtractedHtmlContent } from '~/components/extracted-html-content'
import { ExtractedTextContent } from '~/components/extracted-text-content'
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

      <Separator className="my-8" />

      <section aria-labelledby="body-heading">
        <h2
          id="body-heading"
          className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Full Text
        </h2>
        {article.extractedHtml ? (
          <ExtractedHtmlContent html={article.extractedHtml} />
        ) : article.extractedText ? (
          <div className="font-serif text-lg leading-[1.7]">
            <ExtractedTextContent text={article.extractedText} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Full text is not available for this article.
            {article.pdfUrl && (
              <>
                {' '}
                <a
                  href={article.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <DownloadIcon className="size-3.5" aria-hidden="true" />
                  Download the PDF
                </a>{' '}
                to read offline.
              </>
            )}
          </p>
        )}
      </section>

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
