import type { Doc } from '../../../convex/_generated/dataModel'
import { Badge } from '~/components/ui/badge'

/** Maps internal role keys to human-readable display names. */
const ROLE_DISPLAY_NAMES: Record<Doc<'users'>['role'], string> = {
  author: 'Author',
  reviewer: 'Reviewer',
  action_editor: 'Action Editor',
  editor_in_chief: 'Editor-in-Chief',
  admin: 'Admin',
}

export function RoleBadge({ role }: { role: Doc<'users'>['role'] }) {
  return (
    <Badge variant="secondary" className="text-xs font-medium">
      {ROLE_DISPLAY_NAMES[role]}
    </Badge>
  )
}
