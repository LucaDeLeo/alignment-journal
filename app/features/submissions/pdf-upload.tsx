import { useMutation } from 'convex/react'
import { FileIcon, Loader2Icon, UploadIcon, XIcon } from 'lucide-react'
import * as React from 'react'

import { api } from '../../../convex/_generated/api'

import type { Id } from '../../../convex/_generated/dataModel'

import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

interface PdfUploadProps {
  onUploadComplete: (info: {
    storageId: Id<'_storage'>
    fileName: string
    fileSize: number
  }) => void
  onRemove: () => void
  uploadedFile: { fileName: string; fileSize: number } | null
  error?: string
}

type UploadState = 'idle' | 'uploading' | 'complete' | 'error'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PdfUpload({
  onUploadComplete,
  onRemove,
  uploadedFile,
  error,
}: PdfUploadProps) {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl)
  const [uploadState, setUploadState] = React.useState<UploadState>(
    uploadedFile ? 'complete' : 'idle',
  )
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [isDragOver, setIsDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function validateFile(file: File): string | null {
    if (file.type !== 'application/pdf') {
      return 'Please upload a PDF file'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File must be under 50MB'
    }
    return null
  }

  async function handleFile(file: File) {
    const validationError = validateFile(file)
    if (validationError) {
      setUploadError(validationError)
      setUploadState('error')
      return
    }

    setUploadError(null)
    setUploadState('uploading')

    try {
      const uploadUrl = await generateUploadUrl({})
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!result.ok) {
        throw new Error('Upload failed')
      }

      const { storageId } = (await result.json()) as {
        storageId: Id<'_storage'>
      }
      setUploadState('complete')
      onUploadComplete({
        storageId,
        fileName: file.name,
        fileSize: file.size,
      })
    } catch {
      setUploadError('Upload failed. Please try again.')
      setUploadState('error')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      void handleFile(file)
    }
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      void handleFile(e.dataTransfer.files[0])
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
  }

  function handleRemove() {
    setUploadState('idle')
    setUploadError(null)
    onRemove()
  }

  const displayError = uploadError ?? error

  if (uploadState === 'complete' && uploadedFile) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <FileIcon className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{uploadedFile.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(uploadedFile.fileSize)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleRemove}
          aria-label="Remove file"
        >
          <XIcon className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50',
          uploadState === 'uploading' && 'pointer-events-none opacity-60',
        )}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploadState === 'uploading' ? (
          <>
            <Loader2Icon className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </>
        ) : (
          <>
            <UploadIcon className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">PDF only, up to 50MB</p>
            </div>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      {displayError && (
        <p className="mt-2 text-sm text-destructive">{displayError}</p>
      )}
    </div>
  )
}
