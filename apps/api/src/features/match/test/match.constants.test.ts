import { describe, it, expect } from 'vitest'
import {
  CHARACTERS,
  STAGES,
  FIRST_BANNER_BANS,
  SECOND_BANNER_BANS,
  TOTAL_BANS,
} from 'src/features/match/match.constants'

describe('match constants', () => {
  it('has 35 characters', () => {
    expect(CHARACTERS).toHaveLength(35)
  })

  it('has no duplicate characters', () => {
    const unique = new Set(CHARACTERS)
    expect(unique.size).toBe(CHARACTERS.length)
  })

  it('has 7 stages', () => {
    expect(STAGES).toHaveLength(7)
  })

  it('has no duplicate stages', () => {
    const unique = new Set(STAGES)
    expect(unique.size).toBe(STAGES.length)
  })

  it('ban counts are consistent', () => {
    expect(FIRST_BANNER_BANS).toBe(3)
    expect(SECOND_BANNER_BANS).toBe(2)
    expect(TOTAL_BANS).toBe(FIRST_BANNER_BANS + SECOND_BANNER_BANS)
  })

  it('total bans leave exactly 2 stages for picking', () => {
    expect(STAGES.length - TOTAL_BANS).toBe(2)
  })
})
