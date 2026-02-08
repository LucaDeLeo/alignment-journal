export const NOTIFICATION_TYPE_CONFIG: Record<
  string,
  { label: string; icon: string }
> = {
  reviewer_invitation: { label: 'Reviewer Invitation', icon: 'Mail' },
  decision_accepted: { label: 'Decision: Accepted', icon: 'CheckCircle' },
  decision_rejected: { label: 'Decision: Rejected', icon: 'XCircle' },
  decision_revision_requested: {
    label: 'Decision: Revision Requested',
    icon: 'AlertCircle',
  },
}

export const DEFAULT_NOTIFICATION_CONFIG = {
  label: 'Notification',
  icon: 'Bell',
}
