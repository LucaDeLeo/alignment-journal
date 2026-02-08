import {
  CalendarIcon,
  DownloadIcon,
  FileTextIcon,
  ScaleIcon,
  UsersIcon,
} from 'lucide-react'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { formatDate } from '~/features/submissions/status-utils'

interface ArticleMetadataProps {
  authors: Array<{ name: string; affiliation: string }>
  decidedAt?: number
  createdAt: number
  pdfUrl: string | null
  pdfFileName?: string
  pdfFileSize?: number
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ArticleMetadata({
  authors,
  decidedAt,
  createdAt,
  pdfUrl,
  pdfFileName,
  pdfFileSize,
}: ArticleMetadataProps) {
  const publicationDate = decidedAt ?? createdAt

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <UsersIcon className="size-4" />
          {authors.map((a, i) => (
            <span key={i}>
              {a.name}
              <span className="text-muted-foreground/70">
                {' '}
                ({a.affiliation})
              </span>
              {i < authors.length - 1 ? ', ' : ''}
            </span>
          ))}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarIcon className="size-4" />
          Published {formatDate(publicationDate)}
        </span>

        <Separator orientation="vertical" className="h-4" />

        <span className="flex items-center gap-1.5">
          <FileTextIcon className="size-4" />
          DOI: 10.xxxx/aj.2026.001
        </span>

        <Separator orientation="vertical" className="h-4" />

        <span className="flex items-center gap-1.5">
          <ScaleIcon className="size-4" />
          <Badge variant="secondary">CC-BY 4.0</Badge>
        </span>
      </div>

      {pdfUrl && (
        <div>
          <Button variant="outline" size="sm" asChild>
            <a href={pdfUrl} download={pdfFileName}>
              <DownloadIcon className="mr-2 size-4" />
              Download PDF
              {pdfFileName && pdfFileSize ? (
                <span className="ml-1 text-muted-foreground">
                  ({pdfFileName}, {formatFileSize(pdfFileSize)})
                </span>
              ) : null}
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
