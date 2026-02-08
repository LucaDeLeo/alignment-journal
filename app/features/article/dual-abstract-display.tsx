interface ReviewerAbstract {
  content: string
  reviewerName: string
  isSigned: boolean
}

interface DualAbstractDisplayProps {
  authorAbstract: string
  reviewerAbstract?: ReviewerAbstract | null
}

export function DualAbstractDisplay({
  authorAbstract,
  reviewerAbstract,
}: DualAbstractDisplayProps) {
  if (reviewerAbstract) {
    return (
      <div className="space-y-8">
        <section aria-labelledby="reviewer-abstract-heading">
          <div className="rounded-lg border-l-4 border-primary/40 bg-accent/50 p-6">
            <h2
              id="reviewer-abstract-heading"
              className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Reviewer Abstract
            </h2>
            <p className="font-serif text-lg leading-[1.7] text-foreground">
              {reviewerAbstract.content}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              &mdash; {reviewerAbstract.reviewerName}
            </p>
          </div>
        </section>

        <section aria-labelledby="author-abstract-heading">
          <div className="p-6">
            <h2
              id="author-abstract-heading"
              className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Abstract
            </h2>
            <p className="font-serif text-lg leading-[1.7] text-foreground">
              {authorAbstract}
            </p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <section aria-labelledby="author-abstract-heading">
      <div className="p-6">
        <h2
          id="author-abstract-heading"
          className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Abstract
        </h2>
        <p className="font-serif text-lg leading-[1.7] text-foreground">
          {authorAbstract}
        </p>
      </div>
    </section>
  )
}
