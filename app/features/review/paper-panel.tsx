import { DownloadIcon } from 'lucide-react'

import { ExtractedTextContent } from '~/components/extracted-text-content'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Skeleton } from '~/components/ui/skeleton'

interface PaperPanelProps {
  title: string
  authors: Array<{ name: string; affiliation: string }>
  abstract: string
  extractedText?: string
  pdfUrl: string | null
  isExtracting: boolean
}

/**
 * Renders the paper content inline with Newsreader serif typography.
 * Content order: title, authors, abstract, body text, PDF download link.
 */
export function PaperPanel({
  title,
  authors,
  abstract,
  extractedText,
  pdfUrl,
  isExtracting,
}: PaperPanelProps) {
  return (
    <ScrollArea className="h-full">
      <div className="bg-surface-elevated p-6 space-y-6">
        <div className="mx-auto max-w-prose space-y-6">
          {/* Title */}
          <h1 className="font-serif text-2xl font-semibold leading-tight">
            {title}
          </h1>

          {/* Authors */}
          <div className="space-y-1">
            {authors.map((author, i) => (
              <p key={i} className="font-sans text-sm text-muted-foreground">
                {author.name}
                {author.affiliation && (
                  <span className="text-muted-foreground/70">
                    {' '}
                    &mdash; {author.affiliation}
                  </span>
                )}
              </p>
            ))}
          </div>

          {/* Abstract */}
          <section>
            <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Abstract
            </h2>
            <p className="font-serif text-lg italic leading-[1.7]">
              {abstract}
            </p>
          </section>

          {/* Body text */}
          <section>
            {isExtracting ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Extracting paper text...
                </p>
                <Skeleton className="h-4 w-full skeleton-shimmer" />
                <Skeleton className="h-4 w-5/6 skeleton-shimmer" />
                <Skeleton className="h-4 w-4/5 skeleton-shimmer" />
                <Skeleton className="h-4 w-full skeleton-shimmer" />
                <Skeleton className="h-4 w-3/4 skeleton-shimmer" />
              </div>
            ) : extractedText ? (
              <div className="font-serif text-lg leading-[1.7]">
                <ExtractedTextContent text={extractedText} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Unable to extract paper text. Please download the PDF to read
                offline.
              </p>
            )}
          </section>

          {/* PDF download link */}
          {pdfUrl && (
            <div className="border-t pt-4">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <DownloadIcon className="size-4" aria-hidden="true" />
                Download PDF
              </a>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
