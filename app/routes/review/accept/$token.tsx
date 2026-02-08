import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  SignIn,
  SignedIn,
  SignedOut,
} from '@clerk/tanstack-react-start'
import { useMutation, useQuery } from 'convex/react'
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  Loader2Icon,
  LogInIcon,
  MailIcon,
  ShieldXIcon,
  XCircleIcon,
} from 'lucide-react'
import * as React from 'react'

import { api } from 'convex/_generated/api'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { useBootstrappedUser } from '~/features/auth'

export const Route = createFileRoute('/review/accept/$token')({
  component: AcceptInvitationPage,
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex' }],
  }),
})

function AcceptInvitationPage() {
  const { token } = Route.useParams()
  const inviteStatus = useQuery(api.invitations.getInviteStatus, { token })

  if (inviteStatus === undefined) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-6 py-12">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          <span>Checking invitation...</span>
        </div>
      </main>
    )
  }

  if (inviteStatus.status === 'invalid') {
    return <TokenErrorCard status="invalid" />
  }

  if (inviteStatus.status === 'expired') {
    return <TokenErrorCard status="expired" />
  }

  if (inviteStatus.status === 'consumed') {
    return <TokenErrorCard status="consumed" />
  }

  if (inviteStatus.status === 'revoked') {
    return <TokenErrorCard status="revoked" />
  }

  // Status is 'valid'
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircleIcon className="size-5 text-green-600" />
            You&apos;ve been invited to review a paper
          </CardTitle>
          <CardDescription>
            Accept this invitation to access the review workspace and provide your feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignedOut>
            <p className="mb-4 text-sm text-muted-foreground">
              Sign in or create an account to accept this invitation.
            </p>
            <SignIn fallbackRedirectUrl={`/review/accept/${token}`} />
          </SignedOut>
          <SignedIn>
            <AutoAcceptFlow token={token} />
          </SignedIn>
        </CardContent>
      </Card>
    </main>
  )
}

function AutoAcceptFlow({ token }: { token: string }) {
  const { user, isBootstrapped } = useBootstrappedUser()
  const acceptInvitation = useMutation(api.invitations.acceptInvitation)
  const navigate = useNavigate()
  const [error, setError] = React.useState<string | null>(null)
  const [retryCount, setRetryCount] = React.useState(0)
  const acceptedRef = React.useRef(false)

  React.useEffect(() => {
    if (!isBootstrapped || acceptedRef.current) return

    acceptedRef.current = true
    void acceptInvitation({ token })
      .then(() => {
        void navigate({ to: '/review' })
      })
      .catch((err: unknown) => {
        acceptedRef.current = false
        const message =
          err instanceof Error ? err.message : 'Failed to accept invitation'
        setError(message)
      })
  }, [isBootstrapped, token, acceptInvitation, navigate, retryCount])

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircleIcon className="size-4" />
          <AlertTitle>Failed to accept invitation</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => {
            setError(null)
            setRetryCount((c) => c + 1)
          }}
        >
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-4 text-muted-foreground">
      <Loader2Icon className="size-5 animate-spin" />
      <span>
        {!isBootstrapped || user === undefined
          ? 'Setting up your account...'
          : 'Accepting invitation...'}
      </span>
    </div>
  )
}

function TokenErrorCard({
  status,
}: {
  status: 'invalid' | 'expired' | 'consumed' | 'revoked'
}) {
  const navigate = useNavigate()

  const config = {
    invalid: {
      icon: <XCircleIcon className="size-5 text-destructive" />,
      title: 'Invalid invitation link',
      description:
        'This link may be malformed. Please check your email for the correct invitation link.',
      action: null,
    },
    expired: {
      icon: <ClockIcon className="size-5 text-amber-600" />,
      title: 'This invitation has expired',
      description:
        'Invitation links are valid for 24 hours. Please contact the editor to request a new invitation.',
      action: (
        <Button variant="outline" className="gap-2" asChild>
          <a href="mailto:editors@alignment-journal.org">
            <MailIcon className="size-4" />
            Request New Link
          </a>
        </Button>
      ),
    },
    consumed: {
      icon: <CheckCircleIcon className="size-5 text-muted-foreground" />,
      title: 'This invitation has already been used',
      description:
        'This invitation link has already been accepted.',
      action: (
        <>
          <SignedIn>
            <Button
              className="gap-2"
              onClick={() => void navigate({ to: '/review' })}
            >
              <ArrowRightIcon className="size-4" />
              Go to Review Workspace
            </Button>
          </SignedIn>
          <SignedOut>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => void navigate({ to: '/', search: { signIn: true } })}
            >
              <LogInIcon className="size-4" />
              Sign in to access your reviews
            </Button>
          </SignedOut>
        </>
      ),
    },
    revoked: {
      icon: <ShieldXIcon className="size-5 text-destructive" />,
      title: 'This invitation has been revoked',
      description:
        'The editor has withdrawn this invitation. Please contact them for more information.',
      action: null,
    },
  } as const

  const { icon, title, description, action } = config[status]

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {action && <CardContent>{action}</CardContent>}
      </Card>
    </main>
  )
}
