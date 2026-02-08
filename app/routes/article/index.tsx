import { createFileRoute } from '@tanstack/react-router'
import { FileTextIcon } from 'lucide-react'

export const Route = createFileRoute('/article/')({
  component: ArticleIndex,
})

function ArticleIndex() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-serif text-3xl font-bold tracking-tight">
        Published Articles
      </h1>
      <p className="mt-2 text-muted-foreground">
        Browse peer-reviewed research in theoretical AI alignment.
      </p>
      <div className="mt-12 flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <FileTextIcon className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-medium">No published articles yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Articles will appear here once they complete the peer review process and are accepted for publication.
        </p>
      </div>
    </main>
  )
}
