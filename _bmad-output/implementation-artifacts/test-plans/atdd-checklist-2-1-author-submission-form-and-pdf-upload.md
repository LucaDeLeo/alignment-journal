# ATDD Checklist: Story 2.1 - Author Submission Form and PDF Upload

## AC1: Submission form with all required fields
- [x] `/submit/` route displays "My Submissions" heading
- [x] "New Submission" button visible for author role users
- [x] "New Submission" button NOT visible for admin role users
- [x] Clicking "New Submission" shows centered single-column form within author layout
- [x] Form contains title text input with Label and placeholder
- [x] Form contains repeatable authors field (name + affiliation pairs)
- [x] First author entry pre-filled with current user's name and affiliation
- [x] Authors field has "Add author" button for adding co-authors
- [x] Authors field has remove control (disabled when only one author)
- [x] Form contains abstract textarea with Newsreader serif font (`font-serif` class)
- [x] Form contains keyword tag-style input with add/remove
- [x] All fields have visible Label elements and non-empty placeholder attributes

## AC2: PDF upload with progress and validation
- [x] File upload area accepts files via click-to-browse
- [x] File upload area accepts files via drag-and-drop
- [x] Non-PDF files show inline error: "Please upload a PDF file"
- [x] Oversized files (>50MB) show inline error: "File must be under 50MB"
- [x] Valid file triggers 3-step Convex upload: generateUploadUrl -> POST -> storageId
- [x] Progress indicator shows uploading state (spinner + "Uploading..." text)
- [x] Uploaded file name and size displayed after successful upload
- [x] Author can remove uploaded file and upload a different one

## AC3: Form submission creates record with SUBMITTED status
- [x] `submissions.create` mutation called with all form fields + PDF info
- [x] Mutation uses `withAuthor` wrapper for role enforcement
- [x] Status set to `SUBMITTED`
- [x] `authorId` set from `ctx.user._id`
- [x] `createdAt` and `updatedAt` set to `Date.now()`
- [x] Sonner toast appears with "Submission created successfully"
- [x] Author navigated back to submissions list after successful submit
- [x] New submission appears in list with SUBMITTED status chip

## AC4: Inline validation with Zod on the frontend
- [x] Validation runs on blur for each field
- [x] Title: required, min 10 chars, max 300 chars
- [x] Authors: at least one required, each must have name and affiliation
- [x] Abstract: required, min 100 chars, max 5000 chars
- [x] Keywords: at least 1, max 10, each 2-50 chars
- [x] PDF: required (must be uploaded before submit)
- [x] Error messages appear inline below relevant field
- [x] Submit button NOT disabled - clicking triggers full form validation
- [x] Zod validates on frontend; Convex validators enforce on backend

## AC5: Backend mutations with proper auth and validators
- [x] `convex/storage.ts` exports `generateUploadUrl` mutation with `withUser` wrapper
- [x] `generateUploadUrl` has `args: {}` and `returns: v.string()` validators
- [x] `convex/submissions.ts` exports `create` mutation with `withAuthor` wrapper
- [x] `create` mutation has all field validators: title, authors, abstract, keywords, pdfStorageId, pdfFileName, pdfFileSize
- [x] `create` mutation has `returns: v.id('submissions')` validator
- [x] `convex/submissions.ts` exports `listByAuthor` query with `withUser` wrapper (not `withAuthor`)
- [x] `listByAuthor` has `args: {}` and `returns: v.array(...)` validators
- [x] `listByAuthor` uses `.withIndex('by_authorId')` filtering to `ctx.user._id`
- [x] `listByAuthor` returns submissions ordered by `createdAt` descending

## AC6: Submissions list with real data
- [x] Page displays list of author's submissions with title, status chip, and date
- [x] Each submission links to `/submit/$submissionId` placeholder route
- [x] Empty state shown when no submissions exist with "New Submission" button
- [x] List uses `useQuery(api.submissions.listByAuthor, {})` for real-time reactivity

## Build Verification
- [x] `bun run typecheck` passes with zero errors
- [x] `bun run lint` passes with zero errors
- [x] `bun run test` passes (29 tests)
