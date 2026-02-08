import { useMutation } from 'convex/react'
import * as React from 'react'

import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from './use-current-user'

/**
 * Combines `ensureUser` bootstrapping with `useCurrentUser` in a single hook.
 *
 * Calls the idempotent `ensureUser` mutation on mount to guarantee the Convex
 * user record exists, then gates the `users.me` query on completion. This
 * prevents the `UNAUTHORIZED: User record not found` error that occurs when
 * `useCurrentUser(true)` fires before the user record is created.
 *
 * Returns `{ user, isBootstrapped }`:
 * - `user` is `undefined` while loading, `null` if not found, or the user doc.
 * - `isBootstrapped` indicates whether `ensureUser` has completed.
 */
export function useBootstrappedUser() {
  const ensureUser = useMutation(api.users.ensureUser)
  const [isBootstrapped, setIsBootstrapped] = React.useState(false)
  const [bootstrapError, setBootstrapError] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    void ensureUser()
      .then(() => {
        if (!cancelled) {
          setIsBootstrapped(true)
        }
      })
      .catch(() => {
        // Auth timing or network failure — retry once after a short delay
        if (!cancelled) {
          setTimeout(() => {
            if (!cancelled) {
              void ensureUser()
                .then(() => {
                  if (!cancelled) {
                    setIsBootstrapped(true)
                  }
                })
                .catch(() => {
                  if (!cancelled) {
                    setBootstrapError(true)
                  }
                })
            }
          }, 2000)
        }
      })
    return () => {
      cancelled = true
    }
  }, [ensureUser])

  const user = useCurrentUser(isBootstrapped)

  return { user, isBootstrapped, bootstrapError }
}
