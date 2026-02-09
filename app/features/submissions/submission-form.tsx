import { useMutation, useQuery } from 'convex/react'
import { LoaderIcon, PlusIcon, XIcon } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { api } from '../../../convex/_generated/api'
import { PdfUpload } from './pdf-upload'
import { PreCheckDisplay } from './pre-check-display'

import type { Id } from '../../../convex/_generated/dataModel'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'

const authorSchema = z.object({
  name: z.string().min(1, 'Author name is required'),
  affiliation: z.string().min(1, 'Affiliation is required'),
})

const submissionFormSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(300, 'Title must be under 300 characters'),
  authors: z.array(authorSchema).min(1, 'At least one author is required'),
  abstract: z
    .string()
    .min(1, 'Abstract is required')
    .max(5000, 'Abstract must be under 5,000 characters'),
  keywords: z
    .array(
      z
        .string()
        .min(2, 'Keyword must be at least 2 characters')
        .max(50, 'Keyword must be under 50 characters'),
    )
    .min(1, 'At least one keyword is required')
    .max(10, 'Maximum 10 keywords'),
})

interface SubmissionFormProps {
  userName: string
  userAffiliation: string
  onCancel: () => void
  onSuccess: () => void
}

interface FieldErrors {
  title?: string
  authors?: string
  authorFields?: Array<{ name?: string; affiliation?: string }>
  abstract?: string
  keywords?: string
  pdf?: string
}

export function SubmissionForm({
  userName,
  userAffiliation,
  onCancel,
  onSuccess,
}: SubmissionFormProps) {
  const createSubmission = useMutation(api.submissions.create)
  const startPreCheck = useMutation(api.preCheck.start)
  const startMetadataExtraction = useMutation(api.pdfMetadata.startExtraction)

  const [title, setTitle] = React.useState('')
  const [checkRunId, setCheckRunId] = React.useState<string | null>(null)
  const [authors, setAuthors] = React.useState<
    Array<{ name: string; affiliation: string }>
  >([{ name: userName, affiliation: userAffiliation }])
  const [abstract, setAbstract] = React.useState('')
  const [keywords, setKeywords] = React.useState<Array<string>>([])
  const [keywordInput, setKeywordInput] = React.useState('')

  const [pdfInfo, setPdfInfo] = React.useState<{
    storageId: Id<'_storage'>
    fileName: string
    fileSize: number
  } | null>(null)

  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [touchedFields, setTouchedFields] = React.useState<Set<string>>(
    new Set(),
  )
  const [hasPrefilled, setHasPrefilled] = React.useState(false)

  const formRef = React.useRef<HTMLFormElement>(null)

  // Subscribe to metadata extraction results
  const metadata = useQuery(
    api.pdfMetadata.get,
    pdfInfo ? { pdfStorageId: pdfInfo.storageId } : 'skip',
  )

  const isExtracting =
    !!pdfInfo &&
    metadata?.status !== 'complete' &&
    metadata?.status !== 'failed'
  const fieldsDisabled = !pdfInfo || isExtracting

  // Prefill form fields once when metadata arrives
  React.useEffect(() => {
    if (!hasPrefilled && metadata?.status === 'complete' && metadata.result) {
      setTitle(metadata.result.title)
      setAuthors(
        metadata.result.authors.length > 0
          ? metadata.result.authors
          : [{ name: userName, affiliation: userAffiliation }],
      )
      setAbstract(metadata.result.abstract)
      setKeywords(metadata.result.keywords)
      setHasPrefilled(true)
    }
  }, [metadata, hasPrefilled, userName, userAffiliation])

  function validateField(fieldName: string) {
    const data = { title, authors, abstract, keywords }
    const result = submissionFormSchema.safeParse(data)

    if (result.success) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[fieldName as keyof FieldErrors]
        return next
      })
      return
    }

    const fieldErrors = result.error.flatten()
    setErrors((prev) => {
      const next = { ...prev }
      if (fieldName === 'title') {
        next.title = fieldErrors.fieldErrors.title?.[0]
      } else if (fieldName === 'authors') {
        next.authors = fieldErrors.fieldErrors.authors?.[0]
        // Check individual author fields
        const authorFieldErrors: Array<{
          name?: string
          affiliation?: string
        }> = []
        for (const author of authors) {
          const authorResult = authorSchema.safeParse(author)
          if (!authorResult.success) {
            const flat = authorResult.error.flatten()
            authorFieldErrors.push({
              name: flat.fieldErrors.name?.[0],
              affiliation: flat.fieldErrors.affiliation?.[0],
            })
          } else {
            authorFieldErrors.push({})
          }
        }
        next.authorFields = authorFieldErrors
      } else if (fieldName === 'abstract') {
        next.abstract = fieldErrors.fieldErrors.abstract?.[0]
      } else if (fieldName === 'keywords') {
        next.keywords = fieldErrors.fieldErrors.keywords?.[0]
      }
      return next
    })
  }

  function handleBlur(fieldName: string) {
    setTouchedFields((prev) => new Set(prev).add(fieldName))
    validateField(fieldName)
  }

  function addAuthor() {
    setAuthors((prev) => [...prev, { name: '', affiliation: '' }])
  }

  function removeAuthor(index: number) {
    setAuthors((prev) => prev.filter((_, i) => i !== index))
  }

  function updateAuthor(
    index: number,
    field: 'name' | 'affiliation',
    value: string,
  ) {
    setAuthors((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    )
  }

  function addKeyword() {
    const trimmed = keywordInput.trim()
    if (!trimmed) return
    if (keywords.length >= 10) return
    if (keywords.includes(trimmed)) return
    setKeywords((prev) => [...prev, trimmed])
    setKeywordInput('')
  }

  function removeKeyword(index: number) {
    setKeywords((prev) => prev.filter((_, i) => i !== index))
  }

  function handleKeywordKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate all fields
    const data = { title, authors, abstract, keywords }
    const result = submissionFormSchema.safeParse(data)

    const newErrors: FieldErrors = {}

    if (!result.success) {
      const fieldErrors = result.error.flatten()
      newErrors.title = fieldErrors.fieldErrors.title?.[0]
      newErrors.authors = fieldErrors.fieldErrors.authors?.[0]
      newErrors.abstract = fieldErrors.fieldErrors.abstract?.[0]
      newErrors.keywords = fieldErrors.fieldErrors.keywords?.[0]

      // Check individual author fields
      const authorFieldErrors: Array<{
        name?: string
        affiliation?: string
      }> = []
      for (const author of authors) {
        const authorResult = authorSchema.safeParse(author)
        if (!authorResult.success) {
          const flat = authorResult.error.flatten()
          authorFieldErrors.push({
            name: flat.fieldErrors.name?.[0],
            affiliation: flat.fieldErrors.affiliation?.[0],
          })
        } else {
          authorFieldErrors.push({})
        }
      }
      newErrors.authorFields = authorFieldErrors
    }

    if (!pdfInfo) {
      newErrors.pdf = 'Please upload a PDF file'
    }

    setErrors(newErrors)

    const hasErrors = Object.values(newErrors).some((v) => v !== undefined)
    if (hasErrors) {
      // Scroll to first error
      const firstError = formRef.current?.querySelector('[aria-invalid="true"]')
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    setIsSubmitting(true)
    try {
      await createSubmission({
        title,
        authors,
        abstract,
        keywords,
        pdfStorageId: pdfInfo!.storageId,
        pdfFileName: pdfInfo!.fileName,
        pdfFileSize: pdfInfo!.fileSize,
      })
      toast.success('Submission created successfully')
      onSuccess()
    } catch {
      toast.error('Failed to create submission. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto max-w-2xl space-y-8 px-6 py-12"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          New Submission
        </h1>
        <p className="mt-2 text-muted-foreground">
          Upload your paper to get started. We&apos;ll extract the details
          automatically.
        </p>
      </div>

      {/* PDF Upload — first so metadata extraction can prefill fields */}
      <div className="space-y-2" aria-invalid={!!errors.pdf || undefined}>
        <Label>PDF Upload</Label>
        <PdfUpload
          onUploadComplete={(info) => {
            setPdfInfo(info)
            setErrors((prev) => {
              const next = { ...prev }
              delete next.pdf
              return next
            })
            startPreCheck({ pdfStorageId: info.storageId })
              .then(setCheckRunId)
              .catch(() => {})
            startMetadataExtraction({ pdfStorageId: info.storageId }).catch(
              () => {},
            )
          }}
          onRemove={() => {
            setPdfInfo(null)
            setCheckRunId(null)
            setHasPrefilled(false)
          }}
          uploadedFile={
            pdfInfo
              ? { fileName: pdfInfo.fileName, fileSize: pdfInfo.fileSize }
              : null
          }
          error={errors.pdf}
        />
      </div>

      {/* Extraction status indicator */}
      {isExtracting && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin" />
          Extracting paper details...
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Enter the title of your paper"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => handleBlur('title')}
          aria-invalid={!!errors.title}
          disabled={fieldsDisabled}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title}</p>
        )}
      </div>

      {/* Authors */}
      <div className="space-y-4">
        <Label>Authors</Label>
        {authors.map((author, index) => (
          <div key={index} className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Input
                placeholder="Author name"
                value={author.name}
                onChange={(e) => updateAuthor(index, 'name', e.target.value)}
                onBlur={() => handleBlur('authors')}
                aria-invalid={!!errors.authorFields?.[index]?.name}
                disabled={fieldsDisabled}
              />
              {touchedFields.has('authors') &&
                errors.authorFields?.[index]?.name && (
                  <p className="text-sm text-destructive">
                    {errors.authorFields[index].name}
                  </p>
                )}
            </div>
            <div className="flex-1 space-y-1">
              <Input
                placeholder="Affiliation"
                value={author.affiliation}
                onChange={(e) =>
                  updateAuthor(index, 'affiliation', e.target.value)
                }
                onBlur={() => handleBlur('authors')}
                aria-invalid={!!errors.authorFields?.[index]?.affiliation}
                disabled={fieldsDisabled}
              />
              {touchedFields.has('authors') &&
                errors.authorFields?.[index]?.affiliation && (
                  <p className="text-sm text-destructive">
                    {errors.authorFields[index].affiliation}
                  </p>
                )}
            </div>
            {authors.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAuthor(index)}
                aria-label="Remove author"
                disabled={fieldsDisabled}
              >
                <XIcon className="size-4" />
              </Button>
            )}
          </div>
        ))}
        {errors.authors && (
          <p className="text-sm text-destructive">{errors.authors}</p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAuthor}
          disabled={fieldsDisabled}
        >
          <PlusIcon className="size-4" />
          Add author
        </Button>
      </div>

      {/* Abstract */}
      <div className="space-y-2">
        <Label htmlFor="abstract">Abstract</Label>
        <Textarea
          id="abstract"
          placeholder="Enter the abstract of your paper"
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          onBlur={() => handleBlur('abstract')}
          aria-invalid={!!errors.abstract}
          className="min-h-40 font-serif"
          disabled={fieldsDisabled}
        />
        {errors.abstract && (
          <p className="text-sm text-destructive">{errors.abstract}</p>
        )}
      </div>

      {/* Keywords */}
      <div className="space-y-2" aria-invalid={!!errors.keywords || undefined}>
        <Label htmlFor="keyword-input">Keywords</Label>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
            >
              {keyword}
              <button
                type="button"
                onClick={() => removeKeyword(index)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted"
                aria-label={`Remove keyword ${keyword}`}
                disabled={fieldsDisabled}
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            id="keyword-input"
            placeholder="Type a keyword and press Enter"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            onBlur={() => {
              addKeyword()
              handleBlur('keywords')
            }}
            aria-invalid={!!errors.keywords}
            disabled={fieldsDisabled}
          />
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={addKeyword}
            disabled={
              fieldsDisabled || !keywordInput.trim() || keywords.length >= 10
            }
          >
            Add
          </Button>
        </div>
        {errors.keywords && (
          <p className="text-sm text-destructive">{errors.keywords}</p>
        )}
      </div>

      {/* Pre-Submission Check */}
      <PreCheckDisplay checkRunId={checkRunId} />

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Paper'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
