import { useQuery } from 'convex/react'
import { PlusIcon, UserIcon } from 'lucide-react'
import * as React from 'react'

import { api } from '../../../convex/_generated/api'
import { ReviewerProfileForm } from './reviewer-profile-form'

import type { Id } from '../../../convex/_generated/dataModel'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'

interface ProfileForEdit {
  _id: Id<'reviewerProfiles'>
  userId: Id<'users'>
  researchAreas: Array<string>
  publications: Array<{ title: string; venue: string; year: number }>
}

type EditingState = null | 'new' | ProfileForEdit

export function ReviewerPool() {
  const profiles = useQuery(api.matching.listProfiles, {})
  const [editing, setEditing] = React.useState<EditingState>(null)

  // When a row is clicked, fetch the full profile for editing
  const profileByUserId = useQuery(
    api.matching.getProfileByUserId,
    editing && typeof editing === 'object'
      ? { userId: editing.userId }
      : 'skip',
  )

  function handleRowClick(profile: NonNullable<typeof profiles>[number]) {
    setEditing({
      _id: profile._id,
      userId: profile.userId,
      researchAreas: profile.researchAreas,
      publications: [], // Will be loaded via getProfileByUserId
    })
  }

  // Resolve the full profile data for editing
  const editingProfile =
    editing && typeof editing === 'object' && profileByUserId
      ? {
          _id: profileByUserId._id,
          userId: profileByUserId.userId,
          researchAreas: profileByUserId.researchAreas,
          publications: profileByUserId.publications,
        }
      : undefined

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Reviewer Pool
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage reviewer profiles for intelligent paper matching.
          </p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <PlusIcon className="size-4 mr-2" />
          New Profile
        </Button>
      </div>

      {editing === 'new' && (
        <ReviewerProfileForm onClose={() => setEditing(null)} />
      )}

      {editing && typeof editing === 'object' && editingProfile && (
        <ReviewerProfileForm
          onClose={() => setEditing(null)}
          existingProfile={editingProfile}
        />
      )}

      {profiles === undefined ? (
        <div className="py-12 text-center text-muted-foreground">
          Loading reviewer profiles...
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="rounded-full bg-muted p-4">
            <UserIcon className="size-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            No reviewer profiles yet. Add profiles to enable intelligent
            reviewer matching.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Affiliation</TableHead>
              <TableHead>Research Areas</TableHead>
              <TableHead className="text-right">Publications</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow
                key={profile._id}
                className="cursor-pointer"
                onClick={() => handleRowClick(profile)}
              >
                <TableCell className="font-medium">
                  {profile.userName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {profile.userAffiliation || '—'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {profile.researchAreas.map((area, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {profile.publicationCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
