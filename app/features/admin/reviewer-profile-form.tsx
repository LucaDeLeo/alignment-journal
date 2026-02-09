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
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'

interface Publication {
  title: string
  venue: string
  year: number
}

interface ExpertiseLevel {
  area: string
  level: 'primary' | 'secondary' | 'familiar'
}

interface Education {
  institution: string
  degree: string
  field: string
  yearCompleted?: number
}

interface ExistingProfile {
  _id: Id<'reviewerProfiles'>
  userId: Id<'users'>
  researchAreas: Array<string>
  publications: Array<Publication>
  expertiseLevels?: Array<ExpertiseLevel>
  education?: Array<Education>
  bio?: string
  preferredTopics?: Array<string>
  isAvailable?: boolean
  maxConcurrentReviews?: number
}

interface ReviewerProfileFormProps {
  onClose: () => void
  existingProfile?: ExistingProfile
}

const CURRENT_YEAR = new Date().getFullYear()
const EXPERTISE_LEVELS = ['primary', 'secondary', 'familiar'] as const

function emptyPublication(): Publication {
  return { title: '', venue: '', year: CURRENT_YEAR }
}

function emptyEducation(): Education {
  return { institution: '', degree: '', field: '' }
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
  const [bio, setBio] = React.useState(existingProfile?.bio ?? '')
  const [expertiseLevels, setExpertiseLevels] = React.useState<
    Array<ExpertiseLevel>
  >(existingProfile?.expertiseLevels ?? [])
  const [preferredTopics, setPreferredTopics] = React.useState<Array<string>>(
    existingProfile?.preferredTopics ?? [],
  )
  const [topicInput, setTopicInput] = React.useState('')
  const [education, setEducation] = React.useState<Array<Education>>(
    existingProfile?.education ?? [],
  )
  const [isAvailable, setIsAvailable] = React.useState(
    existingProfile?.isAvailable ?? true,
  )
  const [maxConcurrentReviews, setMaxConcurrentReviews] = React.useState(
    existingProfile?.maxConcurrentReviews ?? 3,
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
    const removed = researchAreas[index]
    setResearchAreas(researchAreas.filter((_, i) => i !== index))
    // Also remove expertise level for that area
    setExpertiseLevels(expertiseLevels.filter((el) => el.area !== removed))
  }

  function addPreferredTopic() {
    const trimmed = topicInput.trim()
    if (!trimmed) return
    if (preferredTopics.includes(trimmed)) return
    if (preferredTopics.length >= 10) return
    setPreferredTopics([...preferredTopics, trimmed])
    setTopicInput('')
  }

  function removePreferredTopic(index: number) {
    setPreferredTopics(preferredTopics.filter((_, i) => i !== index))
  }

  function updateExpertiseLevel(
    area: string,
    level: 'primary' | 'secondary' | 'familiar',
  ) {
    setExpertiseLevels((prev) => {
      const filtered = prev.filter((el) => el.area !== area)
      return [...filtered, { area, level }]
    })
  }

  function getExpertiseLevel(area: string): string {
    return expertiseLevels.find((el) => el.area === area)?.level ?? ''
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

  function addEducation() {
    setEducation([...education, emptyEducation()])
  }

  function removeEducation(index: number) {
    setEducation(education.filter((_, i) => i !== index))
  }

  function updateEducation(
    index: number,
    field: keyof Education,
    value: string | number | undefined,
  ) {
    setEducation(
      education.map((e, i) =>
        i === index ? { ...e, [field]: value } : e,
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
    if (bio.length > 500) errs.push('Bio must be 500 characters or fewer')
    if (preferredTopics.length > 10) errs.push('Maximum 10 preferred topics')
    if (maxConcurrentReviews < 1 || maxConcurrentReviews > 10) {
      errs.push('Max concurrent reviews must be between 1 and 10')
    }
    for (const edu of education) {
      if (!edu.institution.trim()) errs.push('Education: institution is required')
      if (!edu.degree.trim()) errs.push('Education: degree is required')
      if (!edu.field.trim()) errs.push('Education: field is required')
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
        expertiseLevels:
          expertiseLevels.length > 0 ? expertiseLevels : undefined,
        education:
          education.length > 0
            ? education.map((e) => ({
                institution: e.institution.trim(),
                degree: e.degree.trim(),
                field: e.field.trim(),
                yearCompleted: e.yearCompleted,
              }))
            : undefined,
        bio: bio.trim() || undefined,
        preferredTopics:
          preferredTopics.length > 0 ? preferredTopics : undefined,
        isAvailable,
        maxConcurrentReviews,
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

        {/* Bio */}
        <div className="space-y-2">
          <Label>Bio ({bio.length}/500)</Label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Short biography highlighting research focus..."
            maxLength={500}
            rows={3}
          />
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

        {/* Expertise levels per research area */}
        {researchAreas.length > 0 && (
          <div className="space-y-2">
            <Label>Expertise Levels</Label>
            <div className="space-y-2">
              {researchAreas.map((area) => (
                <div key={area} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {area}
                  </span>
                  <Select
                    value={getExpertiseLevel(area)}
                    onValueChange={(val) =>
                      updateExpertiseLevel(
                        area,
                        val as 'primary' | 'secondary' | 'familiar',
                      )
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Level..." />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERTISE_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preferred topics */}
        <div className="space-y-2">
          <Label>Preferred Review Topics ({preferredTopics.length}/10)</Label>
          <div className="flex flex-wrap gap-2">
            {preferredTopics.map((topic, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {topic}
                <button
                  type="button"
                  onClick={() => removePreferredTopic(i)}
                  className="ml-1 hover:text-destructive"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addPreferredTopic()
                }
              }}
              placeholder="Add preferred topic..."
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPreferredTopic}
              disabled={preferredTopics.length >= 10}
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

        {/* Education */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Education</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEducation}
            >
              <PlusIcon className="size-4 mr-1" />
              Add Education
            </Button>
          </div>

          {education.map((edu, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end"
            >
              <div>
                {i === 0 && (
                  <Label className="text-xs text-muted-foreground">
                    Institution
                  </Label>
                )}
                <Input
                  value={edu.institution}
                  onChange={(e) =>
                    updateEducation(i, 'institution', e.target.value)
                  }
                  placeholder="University"
                />
              </div>
              <div>
                {i === 0 && (
                  <Label className="text-xs text-muted-foreground">
                    Degree
                  </Label>
                )}
                <Input
                  value={edu.degree}
                  onChange={(e) =>
                    updateEducation(i, 'degree', e.target.value)
                  }
                  placeholder="Ph.D."
                />
              </div>
              <div>
                {i === 0 && (
                  <Label className="text-xs text-muted-foreground">
                    Field
                  </Label>
                )}
                <Input
                  value={edu.field}
                  onChange={(e) =>
                    updateEducation(i, 'field', e.target.value)
                  }
                  placeholder="Computer Science"
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
                  value={edu.yearCompleted ?? ''}
                  onChange={(e) =>
                    updateEducation(
                      i,
                      'yearCompleted',
                      e.target.value
                        ? parseInt(e.target.value, 10)
                        : undefined,
                    )
                  }
                  placeholder="Year"
                  min={1950}
                  max={CURRENT_YEAR + 5}
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
                  onClick={() => removeEducation(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Availability */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Availability</Label>
            <div className="flex items-center gap-2">
              <Switch
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
              />
              <span className="text-sm text-muted-foreground">
                {isAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground">
              Max concurrent reviews
            </Label>
            <Input
              type="number"
              value={maxConcurrentReviews}
              onChange={(e) =>
                setMaxConcurrentReviews(
                  parseInt(e.target.value, 10) || 3,
                )
              }
              min={1}
              max={10}
              className="w-20"
            />
          </div>
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
