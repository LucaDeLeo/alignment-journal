import { useMutation, useQuery } from 'convex/react'
import { PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import * as React from 'react'

import { api } from '../../../convex/_generated/api'

import type { Id } from '../../../convex/_generated/dataModel'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

interface Publication {
  title: string
  venue: string
  year: number
}

interface ExistingProfile {
  _id: Id<'reviewerProfiles'>
  userId: Id<'users'>
  researchAreas: Array<string>
  publications: Array<Publication>
}

interface ReviewerProfileFormProps {
  onClose: () => void
  existingProfile?: ExistingProfile
}

const CURRENT_YEAR = new Date().getFullYear()

function emptyPublication(): Publication {
  return { title: '', venue: '', year: CURRENT_YEAR }
}

export function ReviewerProfileForm({
  onClose,
  existingProfile,
}: ReviewerProfileFormProps) {
  const reviewerUsers = useQuery(api.matching.listReviewerUsers, {})
  const createOrUpdate = useMutation(api.matching.createOrUpdateProfile)

  const isEdit = !!existingProfile

  const [selectedUserId, setSelectedUserId] = React.useState<string>(
    existingProfile?.userId ?? '',
  )
  const [researchAreas, setResearchAreas] = React.useState<Array<string>>(
    existingProfile?.researchAreas ?? [],
  )
  const [areaInput, setAreaInput] = React.useState('')
  const [publications, setPublications] = React.useState<Array<Publication>>(
    existingProfile?.publications ?? [
      emptyPublication(),
      emptyPublication(),
      emptyPublication(),
    ],
  )
  const [errors, setErrors] = React.useState<Array<string>>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  function addResearchArea() {
    const trimmed = areaInput.trim()
    if (!trimmed) return
    if (researchAreas.includes(trimmed)) return
    if (researchAreas.length >= 10) return
    setResearchAreas([...researchAreas, trimmed])
    setAreaInput('')
  }

  function removeResearchArea(index: number) {
    setResearchAreas(researchAreas.filter((_, i) => i !== index))
  }

  function addPublication() {
    setPublications([...publications, emptyPublication()])
  }

  function removePublication(index: number) {
    if (publications.length <= 3) return
    setPublications(publications.filter((_, i) => i !== index))
  }

  function updatePublication(
    index: number,
    field: keyof Publication,
    value: string | number,
  ) {
    setPublications(
      publications.map((p, i) =>
        i === index ? { ...p, [field]: value } : p,
      ),
    )
  }

  function validate(): Array<string> {
    const errs: Array<string> = []
    if (!selectedUserId) errs.push('Please select a reviewer user')
    if (researchAreas.length < 1) errs.push('At least 1 research area is required')
    if (researchAreas.length > 10) errs.push('Maximum 10 research areas allowed')
    if (publications.length < 3) errs.push('At least 3 publications are required')
    for (let i = 0; i < publications.length; i++) {
      const pub = publications[i]
      if (!pub.title.trim()) errs.push(`Publication ${i + 1}: title is required`)
      if (!pub.venue.trim()) errs.push(`Publication ${i + 1}: venue is required`)
    }
    return errs
  }

  async function handleSubmit() {
    const validationErrors = validate()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors([])
    setIsSubmitting(true)

    try {
      await createOrUpdate({
        userId: selectedUserId as Id<'users'>,
        researchAreas,
        publications: publications.map((p) => ({
          title: p.title.trim(),
          venue: p.venue.trim(),
          year: p.year,
        })),
      })
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile'
      setErrors([message])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle>
          {isEdit ? 'Edit Reviewer Profile' : 'Create Reviewer Profile'}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {errors.length > 0 && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <ul className="list-disc pl-4 space-y-1">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* User selector */}
        <div className="space-y-2">
          <Label>Reviewer</Label>
          {isEdit ? (
            <p className="text-sm text-muted-foreground">
              {reviewerUsers?.find((u) => u._id === selectedUserId)?.name ??
                'Loading...'}
            </p>
          ) : (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a reviewer..." />
              </SelectTrigger>
              <SelectContent>
                {reviewerUsers?.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.name}
                    {user.affiliation ? ` (${user.affiliation})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Research areas */}
        <div className="space-y-2">
          <Label>Research Areas ({researchAreas.length}/10)</Label>
          <div className="flex flex-wrap gap-2">
            {researchAreas.map((area, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {area}
                <button
                  type="button"
                  onClick={() => removeResearchArea(i)}
                  className="ml-1 hover:text-destructive"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={areaInput}
              onChange={(e) => setAreaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addResearchArea()
                }
              }}
              placeholder="Add research area..."
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addResearchArea}
              disabled={researchAreas.length >= 10}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Publications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Publications (min 3)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPublication}
            >
              <PlusIcon className="size-4 mr-1" />
              Add Publication
            </Button>
          </div>

          {publications.map((pub, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end"
            >
              <div>
                {i === 0 && (
                  <Label className="text-xs text-muted-foreground">
                    Title
                  </Label>
                )}
                <Input
                  value={pub.title}
                  onChange={(e) =>
                    updatePublication(i, 'title', e.target.value)
                  }
                  placeholder="Publication title"
                />
              </div>
              <div>
                {i === 0 && (
                  <Label className="text-xs text-muted-foreground">
                    Venue
                  </Label>
                )}
                <Input
                  value={pub.venue}
                  onChange={(e) =>
                    updatePublication(i, 'venue', e.target.value)
                  }
                  placeholder="Conference/Journal"
                />
              </div>
              <div className="w-20">
                {i === 0 && (
                  <Label className="text-xs text-muted-foreground">
                    Year
                  </Label>
                )}
                <Input
                  type="number"
                  value={pub.year}
                  onChange={(e) =>
                    updatePublication(i, 'year', parseInt(e.target.value, 10) || CURRENT_YEAR)
                  }
                  min={1900}
                  max={CURRENT_YEAR + 1}
                />
              </div>
              <div>
                {i === 0 && (
                  <Label className="invisible text-xs">Remove</Label>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePublication(i)}
                  disabled={publications.length <= 3}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="gap-3 justify-end">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Profile'}
        </Button>
      </CardFooter>
    </Card>
  )
}
