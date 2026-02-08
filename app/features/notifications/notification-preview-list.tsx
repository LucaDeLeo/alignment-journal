import { useQuery } from 'convex/react'
import {
  AlertCircleIcon,
  BellIcon,
  CheckCircleIcon,
  MailIcon,
  XCircleIcon,
} from 'lucide-react'

import { api } from '../../../convex/_generated/api'
import {
  DEFAULT_NOTIFICATION_CONFIG,
  NOTIFICATION_TYPE_CONFIG,
} from './notification-constants'

import type { Id } from '../../../convex/_generated/dataModel'

import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'

interface NotificationPreviewListProps {
  submissionId: Id<'submissions'>
}

const ICON_MAP: Record<string, typeof BellIcon> = {
  Mail: MailIcon,
  CheckCircle: CheckCircleIcon,
  XCircle: XCircleIcon,
  AlertCircle: AlertCircleIcon,
  Bell: BellIcon,
}

const BADGE_VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  reviewer_invitation: 'outline',
  decision_accepted: 'default',
  decision_rejected: 'destructive',
  decision_revision_requested: 'secondary',
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NotificationPreviewList({
  submissionId,
}: NotificationPreviewListProps) {
  const notifications = useQuery(api.notifications.listBySubmission, {
    submissionId,
  })

  if (notifications === undefined) {
    return (
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <BellIcon className="size-3.5" />
          Notification Previews
        </h2>
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </section>
    )
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        <BellIcon className="size-3.5" />
        Notification Previews
      </h2>
      <div className="space-y-3">
        {notifications.map((notification) => {
          const config =
            NOTIFICATION_TYPE_CONFIG[notification.type] ??
            DEFAULT_NOTIFICATION_CONFIG
          const IconComponent = ICON_MAP[config.icon] ?? BellIcon
          const badgeVariant = BADGE_VARIANT_MAP[notification.type] ?? 'outline'

          return (
            <div
              key={notification._id}
              className="rounded-lg border bg-muted/30 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <Badge variant={badgeVariant} className="gap-1">
                  <IconComponent className="size-3" />
                  {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(notification.createdAt)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                To: {notification.recipientName}
              </p>
              <p className="mt-1 text-sm font-semibold">
                Subject: {notification.subject}
              </p>
              <div className="mt-2 max-h-48 overflow-y-auto rounded border bg-background p-3 text-sm whitespace-pre-line">
                {notification.body}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
