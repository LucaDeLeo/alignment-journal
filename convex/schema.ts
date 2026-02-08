import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Placeholder table — replaced in Story 1.2 with full schema
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
  }),
})
