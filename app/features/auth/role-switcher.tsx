import { useMutation } from 'convex/react'
import * as React from 'react'

import { api } from '../../../convex/_generated/api'

import type { Doc } from '../../../convex/_generated/dataModel'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { ROLE_OPTIONS } from '~/features/auth/constants'

/**
 * Demo-only role switching dropdown.
 *
 * Only rendered when `import.meta.env.DEV` is true OR when
 * `import.meta.env.VITE_SHOW_ROLE_SWITCHER` is set.
 *
 * Defense in depth: even if this component renders, the `switchRole`
 * mutation enforces a server-side guard that rejects calls when the
 * `DEMO_ROLE_SWITCHER` Convex environment variable is not set.
 */
export function RoleSwitcher({
  currentRole,
}: {
  currentRole: Doc<'users'>['role']
}) {
  const switchRole = useMutation(api.users.switchRole)
  const [error, setError] = React.useState<string | null>(null)

  return (
    <>
    <Select
      value={currentRole}
      onValueChange={(value) => {
        setError(null)
        void switchRole({ role: value as Doc<'users'>['role'] }).catch(
          (err: unknown) => {
            const message =
              err instanceof Error ? err.message : 'Failed to switch role'
            setError(message)
          },
        )
      }}
    >
      <SelectTrigger className="h-8 w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map((role) => (
          <SelectItem key={role.value} value={role.value}>
            {role.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {error && (
      <span className="text-xs text-destructive">{error}</span>
    )}
    </>
  )
}
