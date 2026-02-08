import { useQuery } from 'convex/react'

import { api } from '../../../convex/_generated/api'

/**
 * Hook that wraps the `me` query.
 *
 * Accepts an `isBootstrapped` flag to gate the query on `ensureUser`
 * having completed. When `isBootstrapped` is false, the query is skipped
 * (via Convex `"skip"` token) to prevent `withUser` from throwing
 * UNAUTHORIZED before the Convex user record exists.
 */
export function useCurrentUser(isBootstrapped: boolean) {
  const user = useQuery(api.users.me, isBootstrapped ? {} : 'skip')
  return user
}
