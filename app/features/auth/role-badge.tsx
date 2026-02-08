import type { Doc } from '../../../convex/_generated/dataModel'
import { Badge } from '~/components/ui/badge'
import { ROLE_DISPLAY_NAMES } from '~/features/auth/constants'

export function RoleBadge({ role }: { role: Doc<'users'>['role'] }) {
  return (
    <Badge variant="secondary" className="text-xs font-medium">
      {ROLE_DISPLAY_NAMES[role]}
    </Badge>
  )
}
