import { Link, createFileRoute } from '@tanstack/react-router'

import { Badge } from '~/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      {/* Header */}
      <header className="mb-12">
        <h1 className="font-serif text-5xl font-bold tracking-tight">
          Alignment Journal
        </h1>
        <p className="mt-2 text-xl text-muted-foreground">
          Prototype Walkthrough
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          This is a working prototype of the end-to-end editorial platform
          described in the journal proposal &mdash; submission, triage, peer
          review, editorial decisions, and publication. Everything below is
          functional and connected to a live backend.
        </p>
      </header>

      {/* Getting Started */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold tracking-tight">
          Getting Started
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            <strong className="text-foreground">Sign in</strong> via the button
            in the top-right header.
          </li>
          <li>
            Once signed in, a{' '}
            <strong className="text-foreground">role switcher</strong> dropdown
            appears in the header &mdash; use it to switch between{' '}
            <Badge variant="outline" className="mx-0.5 text-xs">
              author
            </Badge>
            ,{' '}
            <Badge variant="outline" className="mx-0.5 text-xs">
              reviewer
            </Badge>
            ,{' '}
            <Badge variant="outline" className="mx-0.5 text-xs">
              action_editor
            </Badge>
            ,{' '}
            <Badge variant="outline" className="mx-0.5 text-xs">
              editor_in_chief
            </Badge>
            , and{' '}
            <Badge variant="outline" className="mx-0.5 text-xs">
              admin
            </Badge>{' '}
            to see each perspective.
          </li>
          <li>
            The database is pre-loaded with{' '}
            <strong className="text-foreground">seed data</strong>: submissions
            at various pipeline stages, reviewer profiles, reviews in progress,
            completed reviews, and published articles &mdash; so every view has
            content to explore.
          </li>
        </ul>
      </section>

      {/* Try the Full Flow */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold tracking-tight">
          Try the Full Flow
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Walk through the complete editorial pipeline end-to-end. Use the role
          switcher in the header to change perspective at each step.
        </p>

        <ol className="mt-4 list-decimal space-y-4 pl-5 text-sm">
          <li>
            <strong>Submit a paper</strong>{' '}
            <Badge variant="outline" className="ml-1 text-xs">
              author
            </Badge>
            <p className="mt-1 text-muted-foreground">
              Go to{' '}
              <Link to="/submit" className="text-primary hover:underline">
                /submit
              </Link>{' '}
              and upload any PDF. The system extracts title, authors, abstract,
              and keywords via LLM, then auto-fills the form. Optionally run the
              pre-submission check to see the 4-dimension analysis. Submit the
              paper.
            </p>
          </li>

          <li>
            <strong>Triage &amp; pipeline management</strong>{' '}
            <Badge variant="outline" className="ml-1 text-xs">
              editor_in_chief
            </Badge>
            <p className="mt-1 text-muted-foreground">
              Switch to{' '}
              <Badge variant="outline" className="mx-0.5 text-xs">
                editor_in_chief
              </Badge>{' '}
              and open{' '}
              <Link to="/editor" className="text-primary hover:underline">
                /editor
              </Link>
              . Find your new submission in the pipeline table. Click into it
              &mdash; triage runs automatically (4 LLM calls analyzing scope,
              formatting, citations, and claims). Watch the reports appear in
              real time.
            </p>
          </li>

          <li>
            <strong>Assign action editor &amp; advance to review</strong>{' '}
            <Badge variant="outline" className="ml-1 text-xs">
              editor_in_chief
            </Badge>
            <p className="mt-1 text-muted-foreground">
              On the submission detail page, assign yourself as action editor
              using the dropdown. Then click the status chip and transition the
              submission to{' '}
              <strong className="text-foreground">Under Review</strong>.
            </p>
          </li>

          <li>
            <strong>Match &amp; invite reviewers</strong>{' '}
            <Badge variant="outline" className="ml-1 text-xs">
              editor_in_chief
            </Badge>
            <p className="mt-1 text-muted-foreground">
              Click <strong className="text-foreground">Run Matching</strong> to
              score seed reviewer profiles against the paper via LLM. Select
              reviewers from the results and click{' '}
              <strong className="text-foreground">Send Invitations</strong>.
              Watch the invitation panel update with pending status badges.
            </p>
          </li>

          <li>
            <strong>Experience the review workspace</strong>{' '}
            <Badge variant="outline" className="ml-1 text-xs">
              reviewer
            </Badge>
            <p className="mt-1 text-muted-foreground">
              Switch to{' '}
              <Badge variant="outline" className="mx-0.5 text-xs">
                reviewer
              </Badge>{' '}
              and go to{' '}
              <Link to="/review" className="text-primary hover:underline">
                /review
              </Link>
              . The seed data includes pre-assigned reviews you can open. Try
              the split-pane workspace: paper on the left, structured review
              form on the right (with auto-save). Check the discussion thread,
              abstract drafting, and payment calculator.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Note: invitations target specific seed reviewer profiles, so you
              won&apos;t see the paper you just submitted here. The seed reviews
              let you experience the full review workspace on pre-loaded
              submissions.
            </p>
          </li>

          <li>
            <strong>Make an editorial decision</strong>{' '}
            <Badge variant="outline" className="ml-1 text-xs">
              editor_in_chief
            </Badge>
            <p className="mt-1 text-muted-foreground">
              Switch back to{' '}
              <Badge variant="outline" className="mx-0.5 text-xs">
                editor_in_chief
              </Badge>{' '}
              and open a seed submission that&apos;s in{' '}
              <strong className="text-foreground">Decision Pending</strong>{' '}
              status from the{' '}
              <Link to="/editor" className="text-primary hover:underline">
                /editor
              </Link>{' '}
              pipeline. Use the decision panel to accept, reject, or request
              revisions (with a required note). The decision is logged to the
              audit trail with a 10-second undo window.
            </p>
          </li>

          <li>
            <strong>View published articles</strong>
            <p className="mt-1 text-muted-foreground">
              Visit{' '}
              <Link to="/article" className="text-primary hover:underline">
                /article
              </Link>{' '}
              (no sign-in needed) to see accepted papers with dual abstracts
              &mdash; the author&apos;s original alongside the reviewer&apos;s
              summary.
            </p>
          </li>
        </ol>
      </section>

      {/* Feature Walkthrough */}
      <section className="mb-12">
        <h2 className="mb-6 font-serif text-2xl font-semibold tracking-tight">
          Feature Walkthrough
        </h2>
        <div className="space-y-6">
          {/* Author Submission */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Author Submission</span>
                <Link
                  to="/submit"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  /submit
                </Link>
              </CardTitle>
              <CardDescription>
                Submit a paper and track it through the editorial pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                <li>List of your submissions with status tracking</li>
                <li>New submission form with PDF upload at the top</li>
                <li>
                  <strong className="text-foreground">
                    LLM-powered metadata extraction
                  </strong>
                  : uploads the PDF, extracts title / authors / abstract /
                  keywords via Haiku, and auto-fills the form
                </li>
                <li>
                  <strong className="text-foreground">
                    Pre-submission check
                  </strong>
                  : 4-dimension LLM analysis (scope fit, formatting, citations,
                  claims) runs in parallel
                </li>
                <li>
                  Per-submission detail view with status timeline (11-state
                  pipeline), discussion thread, and reviewer abstract review
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Editor Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Editor Dashboard</span>
                <Link
                  to="/editor"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  /editor
                </Link>
              </CardTitle>
              <CardDescription>
                Manage the full editorial pipeline from triage to publication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                <li>
                  Pipeline table with status filters and text search across all
                  submissions
                </li>
                <li>Per-submission detail view with:</li>
                <ul className="ml-4 mt-1 list-[circle] space-y-1">
                  <li>LLM triage reports (scope, formatting, citations, claims)</li>
                  <li>Action editor assignment</li>
                  <li>
                    LLM-powered reviewer matching (profiles scored against paper)
                  </li>
                  <li>Review invitation panel with tokenized email links</li>
                  <li>
                    Decision panel (accept / reject / revision requested)
                  </li>
                  <li>Payment summary per reviewer</li>
                  <li>
                    Audit trail timeline (every editorial action logged)
                  </li>
                  <li>
                    Status transition controls enforcing the state machine
                  </li>
                </ul>
              </ul>
            </CardContent>
          </Card>

          {/* Review Workspace */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Review Workspace</span>
                <Link
                  to="/review"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  /review
                </Link>
              </CardTitle>
              <CardDescription>
                Read and review assigned papers with a split-pane workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                <li>List of assigned reviews with status badges</li>
                <li>
                  <strong className="text-foreground">
                    Split-pane workspace
                  </strong>
                  : paper panel (left) + review form (right), resizable
                </li>
                <li>
                  Structured sections: summary, strengths, weaknesses, questions,
                  recommendation
                </li>
                <li>
                  Auto-save with optimistic concurrency control and version
                  conflict resolution
                </li>
                <li>
                  Discussion thread (semi-confidential identity: authors see
                  &ldquo;Reviewer 1&rdquo; pseudonyms)
                </li>
                <li>Reviewer abstract drafting</li>
                <li>
                  Payment calculator: estimated compensation based on page count,
                  quality rating, speed bonus, and abstract bonus
                </li>
                <li>
                  Invitation acceptance flow at{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    /review/accept/:token
                  </code>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Published Articles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Published Articles</span>
                <Link
                  to="/article"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  /article
                </Link>
              </CardTitle>
              <CardDescription>
                Public article listing &mdash; no sign-in required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                <li>Paginated list of accepted papers</li>
                <li>
                  Article detail pages with dual abstract display: author
                  abstract alongside reviewer abstract
                </li>
                <li>Full metadata (authors, affiliations, keywords)</li>
              </ul>
            </CardContent>
          </Card>

          {/* Admin Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Admin Panel</span>
                <Link
                  to="/admin"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  /admin
                </Link>
              </CardTitle>
              <CardDescription>
                Manage the reviewer pool and platform configuration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                <li>
                  Reviewer pool management: profiles with research areas and
                  publications
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Key Technical Highlights */}
      <section className="mb-12">
        <h2 className="mb-4 font-serif text-2xl font-semibold tracking-tight">
          Key Technical Highlights
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>11-state editorial state machine with enforced transitions</li>
          <li>
            Real-time reactive UI via Convex subscriptions (changes appear
            instantly across all tabs)
          </li>
          <li>Role-based access control on every backend function</li>
          <li>Append-only audit trail</li>
          <li>
            Paid review compensation model (base + quality multiplier + speed
            bonus + abstract bonus)
          </li>
          <li>
            Semi-confidential review: reviewer anonymity during review,
            configurable post-decision disclosure
          </li>
          <li>
            Diamond Open Access: published articles require no authentication
          </li>
        </ul>
      </section>

      {/* Tech Stack Footer */}
      <footer className="border-t pt-8 text-center text-sm text-muted-foreground">
        Built with TanStack Start + Convex + Clerk + Tailwind v4 + shadcn/ui
      </footer>
    </main>
  )
}
