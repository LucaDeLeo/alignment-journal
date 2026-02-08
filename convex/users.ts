import { v } from 'convex/values'

import { internalQuery, mutation, query } from './_generated/server'
import { withAdmin, withUser } from './helpers/auth'
import {
  environmentMisconfiguredError,
  unauthorizedError,
} from './helpers/errors'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

/** Reusable validator for the role union type. */
const roleValidator = v.union(
  v.literal('author'),
  v.literal('reviewer'),
  v.literal('action_editor'),
  v.literal('editor_in_chief'),
  v.literal('admin'),
)

/**
 * Reusable validator for the full user document shape (returned from queries).
 *
 * TD-004: This duplicates the users table schema shape. When Convex adds
 * document-level validators (e.g. `v.doc("users")`), migrate to that API
 * to keep schema and return validators in sync automatically.
 */
const userDocValidator = v.object({
  _id: v.id('users'),
  _creationTime: v.number(),
  clerkId: v.string(),
  email: v.string(),
  name: v.string(),
  affiliation: v.string(),
  role: roleValidator,
  createdAt: v.number(),
})

/**
 * Internal query to look up a user by their Clerk identity subject.
 * Used by auth wrappers to resolve user records from action contexts
 * (which lack direct `ctx.db` access).
 */
export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  returns: v.union(userDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .unique()
  },
})

/**
 * Internal query to look up a user by their document ID.
 * Used by the matching action to resolve reviewer user data.
 */
export const getByIdInternal = internalQuery({
  args: { userId: v.id('users') },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      name: v.string(),
      affiliation: v.string(),
      role: roleValidator,
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get('users', args.userId)
    if (!user) return null
    return {
      _id: user._id,
      name: user.name,
      affiliation: user.affiliation,
      role: user.role,
    }
  },
})

/**
 * Creates a Convex user record on first authentication via Clerk.
 *
 * This mutation is idempotent — if a record already exists for the
 * authenticated Clerk user, it returns the existing record's ID.
 *
 * Does NOT use auth wrappers because it's the bootstrapping mutation
 * that creates the user record the wrappers depend on.
 *
 * Identity field mapping:
 * - `clerkId`     ← `identity.subject` (Clerk user ID)
 * - `email`       ← `identity.email` (falls back to empty string)
 * - `name`        ← `identity.name` || `givenName + familyName` || `email`
 * - `affiliation` ← empty string (user can update later)
 */
export const ensureUser = mutation({
  args: {},
  returns: v.id('users'),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw unauthorizedError('Not authenticated')
    }

    // Check if user already exists (idempotent)
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .unique()

    if (existing) {
      return existing._id
    }

    // Cascading fallback for name: name → givenName + familyName → email
    const email = identity.email ?? ''
    const name =
      identity.name ??
      (identity.givenName && identity.familyName
        ? `${identity.givenName} ${identity.familyName}`
        : email)

    return await ctx.db.insert('users', {
      clerkId: identity.subject,
      email,
      name,
      affiliation: '',
      role: 'author',
      createdAt: Date.now(),
    })
  },
})

/**
 * Returns the current authenticated user's full profile.
 * Uses `withUser` wrapper — throws UNAUTHORIZED if not authenticated.
 */
export const me = query({
  args: {},
  returns: v.union(userDocValidator, v.null()),
  handler: withUser((ctx) => {
    return Promise.resolve(ctx.user)
  }),
})

/**
 * Admin-only mutation to change any user's role.
 * Uses `withAdmin` wrapper — throws UNAUTHORIZED for non-admin users.
 *
 * Note: Does NOT create audit log entries because auditLogs are
 * submission-scoped (require submissionId per FR25).
 */
export const updateRole = mutation({
  args: {
    userId: v.id('users'),
    role: roleValidator,
  },
  returns: v.null(),
  handler: withAdmin(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { userId: Id<'users'>; role: Doc<'users'>['role'] },
    ) => {
      await ctx.db.patch('users', args.userId, { role: args.role })
      return null
    },
  ),
})

/**
 * Demo role switcher mutation — allows any authenticated user to change
 * their own role. Protected by a server-side guard that checks for the
 * `DEMO_ROLE_SWITCHER` Convex environment variable.
 *
 * This is the mutation the role switcher UI calls. Even if the UI is
 * accidentally exposed, the server-side guard prevents role self-escalation
 * when the environment variable is not set.
 */
export const switchRole = mutation({
  args: { role: roleValidator },
  returns: v.null(),
  handler: withUser(
    async (
      ctx: MutationCtx & { user: Doc<'users'> },
      args: { role: Doc<'users'>['role'] },
    ) => {
      // Server-side guard: only allow role switching when explicitly enabled
      if (!process.env.DEMO_ROLE_SWITCHER) {
        throw environmentMisconfiguredError(
          'Role switching is disabled in production',
        )
      }

      await ctx.db.patch('users', ctx.user._id, { role: args.role })
      return null
    },
  ),
})

/**
 * Admin-only query to list all users.
 * Used by the admin user management view (Story 1.4).
 */
export const listUsers = query({
  args: {},
  returns: v.array(userDocValidator),
  handler: withAdmin(async (ctx) => {
    return await ctx.db.query('users').collect()
  }),
})

const EDITOR_ROLES = ['editor_in_chief', 'action_editor', 'admin'] as const

/**
 * Lists users eligible for action editor assignment.
 * Returns users with editor_in_chief or action_editor roles.
 * Requires an editor-level role to query.
 */
export const listEditors = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('users'),
      name: v.string(),
      affiliation: v.string(),
      role: roleValidator,
    }),
  ),
  handler: withUser(async (ctx: QueryCtx & { user: Doc<'users'> }) => {
    if (
      !EDITOR_ROLES.includes(
        ctx.user.role as (typeof EDITOR_ROLES)[number],
      )
    ) {
      throw unauthorizedError('Requires editor role')
    }
    const allUsers = await ctx.db.query('users').collect()
    return allUsers
      .filter(
        (u) => u.role === 'editor_in_chief' || u.role === 'action_editor',
      )
      .map((u) => ({
        _id: u._id,
        name: u.name,
        affiliation: u.affiliation,
        role: u.role,
      }))
  }),
})

/** Public-safe subset of user fields (excludes PII like email and clerkId). */
const publicUserValidator = v.object({
  _id: v.id('users'),
  _creationTime: v.number(),
  name: v.string(),
  affiliation: v.string(),
  role: roleValidator,
})

/**
 * Query to get a user's public profile by their ID.
 * Protected by `withUser` — any authenticated user can look up other users
 * (for displaying user names in various contexts).
 *
 * Returns only public fields; email and clerkId are omitted to avoid
 * unnecessary PII exposure.
 */
export const getUserById = query({
  args: { userId: v.id('users') },
  returns: v.union(publicUserValidator, v.null()),
  handler: withUser(
    async (
      ctx: QueryCtx & { user: Doc<'users'> },
      args: { userId: Id<'users'> },
    ) => {
      const user = await ctx.db.get('users', args.userId)
      if (!user) return null
      return {
        _id: user._id,
        _creationTime: user._creationTime,
        name: user.name,
        affiliation: user.affiliation,
        role: user.role,
      }
    },
  ),
})
