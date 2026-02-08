import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

import { submissionStatusValidator } from './helpers/transitions'

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    affiliation: v.string(),
    role: v.union(
      v.literal('author'),
      v.literal('reviewer'),
      v.literal('action_editor'),
      v.literal('editor_in_chief'),
      v.literal('admin'),
    ),
    createdAt: v.number(),
  }).index('by_clerkId', ['clerkId']),

  submissions: defineTable({
    authorId: v.id('users'),
    title: v.string(),
    authors: v.array(
      v.object({ name: v.string(), affiliation: v.string() }),
    ),
    abstract: v.string(),
    keywords: v.array(v.string()),
    status: submissionStatusValidator,
    pdfStorageId: v.optional(v.id('_storage')),
    pdfFileName: v.optional(v.string()),
    pdfFileSize: v.optional(v.number()),
    actionEditorId: v.optional(v.id('users')),
    assignedAt: v.optional(v.number()),
    decisionNote: v.optional(v.string()),
    publicConversation: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_authorId', ['authorId'])
    .index('by_status', ['status'])
    .index('by_actionEditorId', ['actionEditorId']),

  triageReports: defineTable({
    submissionId: v.id('submissions'),
    triageRunId: v.string(),
    passName: v.union(
      v.literal('scope'),
      v.literal('formatting'),
      v.literal('citations'),
      v.literal('claims'),
    ),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('complete'),
      v.literal('failed'),
    ),
    idempotencyKey: v.string(),
    attemptCount: v.number(),
    result: v.optional(
      v.object({
        finding: v.string(),
        severity: v.union(
          v.literal('low'),
          v.literal('medium'),
          v.literal('high'),
        ),
        recommendation: v.string(),
      }),
    ),
    lastError: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_submissionId', ['submissionId'])
    .index('by_idempotencyKey', ['idempotencyKey']),

  reviewerProfiles: defineTable({
    userId: v.id('users'),
    researchAreas: v.array(v.string()),
    publications: v.array(
      v.object({
        title: v.string(),
        venue: v.string(),
        year: v.number(),
      }),
    ),
    embedding: v.optional(v.array(v.float64())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
    }),

  reviews: defineTable({
    submissionId: v.id('submissions'),
    reviewerId: v.id('users'),
    sections: v.object({
      summary: v.optional(v.string()),
      strengths: v.optional(v.string()),
      weaknesses: v.optional(v.string()),
      questions: v.optional(v.string()),
      recommendation: v.optional(v.string()),
    }),
    status: v.union(
      v.literal('assigned'),
      v.literal('in_progress'),
      v.literal('submitted'),
      v.literal('locked'),
    ),
    revision: v.number(),
    submittedAt: v.optional(v.number()),
    lockedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_submissionId', ['submissionId'])
    .index('by_reviewerId', ['reviewerId'])
    .index('by_submissionId_reviewerId', ['submissionId', 'reviewerId']),

  reviewerAbstracts: defineTable({
    submissionId: v.id('submissions'),
    reviewerId: v.id('users'),
    content: v.string(),
    wordCount: v.number(),
    isSigned: v.boolean(),
    status: v.union(
      v.literal('drafting'),
      v.literal('submitted'),
      v.literal('approved'),
    ),
    revision: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_submissionId', ['submissionId']),

  discussions: defineTable({
    submissionId: v.id('submissions'),
    authorId: v.id('users'),
    parentId: v.optional(v.id('discussions')),
    content: v.string(),
    isRetracted: v.optional(v.boolean()),
    editableUntil: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_submissionId', ['submissionId']),

  reviewInvites: defineTable({
    submissionId: v.id('submissions'),
    reviewerId: v.id('users'),
    reviewAssignmentId: v.string(),
    createdBy: v.id('users'),
    tokenHash: v.string(),
    expiresAt: v.number(),
    consumedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_tokenHash', ['tokenHash'])
    .index('by_submissionId', ['submissionId']),

  auditLogs: defineTable({
    submissionId: v.id('submissions'),
    actorId: v.id('users'),
    actorRole: v.string(),
    action: v.string(),
    details: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_submissionId', ['submissionId'])
    .index('by_submissionId_action', ['submissionId', 'action'])
    .index('by_actorId', ['actorId']),

  notifications: defineTable({
    recipientId: v.id('users'),
    submissionId: v.optional(v.id('submissions')),
    type: v.string(),
    subject: v.string(),
    body: v.string(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index('by_recipientId', ['recipientId']),

  payments: defineTable({
    submissionId: v.id('submissions'),
    reviewerId: v.id('users'),
    pageCount: v.number(),
    qualityLevel: v.union(v.literal('standard'), v.literal('excellent')),
    weeksEarly: v.number(),
    hasAbstractBonus: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_submissionId', ['submissionId'])
    .index('by_reviewerId', ['reviewerId']),
})
