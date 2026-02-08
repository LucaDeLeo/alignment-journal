# ATDD Checklist: Story 3.4 — Reviewer Profile Management and Embedding Generation

## AC1: Reviewer profile creation
- [ ] `createOrUpdateProfile` mutation creates a new `reviewerProfiles` document when no profile exists for the userId
- [ ] Mutation validates target user exists and has `reviewer` role; throws NOT_FOUND/VALIDATION_ERROR otherwise
- [ ] Mutation validates minimum 1 research area, maximum 10
- [ ] Mutation validates minimum 3 publications
- [ ] Mutation defines both `args` and `returns` validators
- [ ] Profile stores userId, researchAreas, publications (title/venue/year), createdAt, updatedAt
- [ ] Only admin or editor_in_chief can call the mutation (UNAUTHORIZED for others)

## AC2: Reviewer profile update
- [ ] `createOrUpdateProfile` uses upsert semantics — updates existing profile if one exists for the userId
- [ ] Research areas and publications are replaced entirely (not merged)
- [ ] `updatedAt` timestamp is set to `Date.now()` on update
- [ ] Embedding generation is automatically triggered after update

## AC3: Automatic embedding generation
- [ ] Mutation schedules `generateEmbedding` via `ctx.scheduler.runAfter(0, ...)`
- [ ] `generateEmbedding` is an internalAction (not exposed to client)
- [ ] `getProfileInternal` is an internalQuery (not exposed to client)
- [ ] `saveEmbedding` is an internalMutation (not exposed to client)
- [ ] File has `"use node";` as the first line (before all imports)
- [ ] OpenAI call explicitly passes `dimensions: 1536` to match schema vector index
- [ ] On OpenAI failure, profile remains without embedding (graceful degradation)
- [ ] `saveEmbedding` includes stale-check: skips write if profile.updatedAt is newer than passed-in updatedAt
- [ ] All seven Convex functions define both `args` and `returns` validators

## AC4: Reviewer pool list view
- [ ] Table displays all reviewer profiles with columns: name, affiliation, research areas, publication count, embedding status
- [ ] Each row is clickable to open the edit form
- [ ] "New Profile" button opens the creation form
- [ ] Page fetches data via `useQuery(api.matching.listProfiles)`
- [ ] Empty state message: "No reviewer profiles yet..."

## AC5: Profile form with publications
- [ ] Form has: user selector (dropdown of reviewer-role users), research areas (tag input, 1-10 items), publications list (3+ entries)
- [ ] "Add publication" button appends new empty row
- [ ] "Remove" button on publications disabled when at minimum 3
- [ ] On submit: calls `createOrUpdateProfile` mutation
- [ ] In edit mode: form pre-populated with existing data
- [ ] User selector uses `useQuery(api.matching.listReviewerUsers)`
- [ ] Validation: at least 1 research area, at least 3 publications, each with title and venue

## AC6: Profile management restricted to admin/editor
- [ ] `/admin/` route guard ALLOWED_ROLES includes `['admin', 'editor_in_chief']`
- [ ] `createOrUpdateProfile` mutation requires admin or editor_in_chief (UNAUTHORIZED for action_editor)
- [ ] `listProfiles`, `getProfileByUserId`, `listReviewerUsers` queries require EDITOR_ROLES
- [ ] action_editor can read profiles (EDITOR_ROLES) but cannot create/modify (admin/editor_in_chief only)

## AC7: Embedding status visibility
- [ ] Green badge "Embedding ready" when embedding field exists and is non-empty
- [ ] Amber badge "Pending" when embedding field is undefined/null
