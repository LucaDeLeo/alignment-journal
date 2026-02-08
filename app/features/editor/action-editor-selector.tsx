import { useMutation, useQuery } from 'convex/react'
import { Loader2, UserCircle2 } from 'lucide-react'
import { useState } from 'react'

import { api } from '../../../convex/_generated/api'

import type { Id } from '../../../convex/_generated/dataModel'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

interface ActionEditorSelectorProps {
  submissionId: Id<'submissions'>
  currentActionEditorId?: Id<'users'>
  isEditorInChief: boolean
}

export function ActionEditorSelector({
  submissionId,
  currentActionEditorId,
  isEditorInChief,
}: ActionEditorSelectorProps) {
  const editors = useQuery(api.users.listEditors, {})
  const currentEditor = useQuery(
    api.users.getUserById,
    currentActionEditorId ? { userId: currentActionEditorId } : 'skip',
  )
  const assignEditor = useMutation(api.submissions.assignActionEditor)
  const [isAssigning, setIsAssigning] = useState(false)

  const [error, setError] = useState<string | null>(null)

  async function handleAssign(editorId: string) {
    setIsAssigning(true)
    setError(null)
    try {
      await assignEditor({
        submissionId,
        actionEditorId: editorId as Id<'users'>,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed')
    } finally {
      setIsAssigning(false)
    }
  }

  if (!isEditorInChief) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <UserCircle2 className="size-3.5" />
        {currentEditor ? currentEditor.name : 'Unassigned'}
      </span>
    )
  }

  return (
    <div className="space-y-1">
      <div className="inline-flex items-center gap-2">
        <UserCircle2 className="size-3.5 text-muted-foreground" />
        <Select
          value={currentActionEditorId ?? ''}
          onValueChange={handleAssign}
          disabled={isAssigning}
        >
          <SelectTrigger className="h-8 w-[220px]">
            {isAssigning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <SelectValue placeholder="Assign action editor" />
            )}
          </SelectTrigger>
          <SelectContent>
            {editors?.map((editor) => (
              <SelectItem key={editor._id} value={editor._id}>
                {editor.name} (
                {editor.role === 'editor_in_chief' ? 'EiC' : 'AE'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
