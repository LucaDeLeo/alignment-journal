import { describe, expect, it } from 'vitest'

import { buildReviewerProfiles, buildSeedUsers } from '../seed'

import type { Id } from '../_generated/dataModel'

const BASE_TIME = Date.now() - 60 * 86_400_000

// Fake IDs for testing (shape doesn't matter for pure function tests)
function fakeUserId(n: number): Id<'users'> {
  return `fake_user_${n}` as unknown as Id<'users'>
}

describe('buildSeedUsers', () => {
  const users = buildSeedUsers(BASE_TIME)

  it('returns 10 users total', () => {
    expect(users).toHaveLength(10)
  })

  it('has 5 reviewers', () => {
    const reviewers = users.filter((u) => u.role === 'reviewer')
    expect(reviewers).toHaveLength(5)
  })

  it('new reviewer at index 8 is Dr. Amara Okafor from Oxford FHI', () => {
    expect(users[8].name).toBe('Dr. Amara Okafor')
    expect(users[8].affiliation).toBe('Oxford FHI')
    expect(users[8].role).toBe('reviewer')
    expect(users[8].clerkId).toBe('seed_reviewer_4')
  })

  it('new reviewer at index 9 is Dr. Liang Zhao from UC Berkeley CHAI', () => {
    expect(users[9].name).toBe('Dr. Liang Zhao')
    expect(users[9].affiliation).toBe('UC Berkeley CHAI')
    expect(users[9].role).toBe('reviewer')
    expect(users[9].clerkId).toBe('seed_reviewer_5')
  })

  it('existing users at indices 0-7 are unchanged', () => {
    expect(users[0].name).toBe('Dr. Sarah Chen')
    expect(users[6].clerkId).toBe('seed_eic')
    expect(users[7].role).toBe('admin')
  })

  it('all 5 reviewer affiliations are distinct', () => {
    const reviewerAffiliations = users
      .filter((u) => u.role === 'reviewer')
      .map((u) => u.affiliation)
    const unique = new Set(reviewerAffiliations)
    expect(unique.size).toBe(5)
    expect(unique).toContain('MIRI')
    expect(unique).toContain('Anthropic')
    expect(unique).toContain('DeepMind')
    expect(unique).toContain('Oxford FHI')
    expect(unique).toContain('UC Berkeley CHAI')
  })
})

describe('buildReviewerProfiles', () => {
  const reviewerIds = [
    fakeUserId(1),
    fakeUserId(2),
    fakeUserId(3),
    fakeUserId(4),
    fakeUserId(5),
  ]
  const profiles = buildReviewerProfiles(BASE_TIME, reviewerIds)

  it('returns 5 profiles', () => {
    expect(profiles).toHaveLength(5)
  })

  it('each profile has 3-5 research areas', () => {
    for (const profile of profiles) {
      expect(profile.researchAreas.length).toBeGreaterThanOrEqual(3)
      expect(profile.researchAreas.length).toBeLessThanOrEqual(5)
    }
  })

  it('each profile has 3+ publications', () => {
    for (const profile of profiles) {
      expect(profile.publications.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('each publication has title, venue, and year', () => {
    for (const profile of profiles) {
      for (const pub of profile.publications) {
        expect(pub.title).toBeTruthy()
        expect(pub.venue).toBeTruthy()
        expect(pub.year).toBeGreaterThanOrEqual(2020)
        expect(pub.year).toBeLessThanOrEqual(2025)
      }
    }
  })

  it('profiles reference correct user IDs', () => {
    expect(profiles[0].userId).toBe(reviewerIds[0])
    expect(profiles[1].userId).toBe(reviewerIds[1])
    expect(profiles[2].userId).toBe(reviewerIds[2])
    expect(profiles[3].userId).toBe(reviewerIds[3])
    expect(profiles[4].userId).toBe(reviewerIds[4])
  })

  it('new profile 4 covers value alignment expertise', () => {
    const profile4 = profiles[3]
    expect(profile4.researchAreas).toContain('value alignment')
    expect(profile4.researchAreas).toContain('cooperative AI')
  })

  it('new profile 5 covers mesa-optimization expertise', () => {
    const profile5 = profiles[4]
    expect(profile5.researchAreas).toContain('mesa-optimization')
    expect(profile5.researchAreas).toContain('inner alignment')
  })

  it('existing 3 profiles are unchanged', () => {
    expect(profiles[0].researchAreas).toContain('corrigibility')
    expect(profiles[1].researchAreas).toContain('scalable oversight')
    expect(profiles[2].researchAreas).toContain('mechanistic interpretability')
  })

  it('research areas are distinct across profiles (no primary overlap)', () => {
    const firstAreas = profiles.map((p) => p.researchAreas[0])
    const unique = new Set(firstAreas)
    expect(unique.size).toBe(5)
  })
})
