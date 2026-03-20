import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync, errAsync } from 'neverthrow'
import { UserService } from 'src/features/user/user.service'
import { AppError } from 'src/shared/errors'
import { createMockDb, type MockDbService } from 'src/shared/test/helpers'

describe('UserService', () => {
  let mockDb: MockDbService
  let service: UserService

  beforeEach(() => {
    mockDb = createMockDb()
    service = new UserService(mockDb as any)
  })

  describe('getProfile', () => {
    it('returns profile data on success', async () => {
      const profile = {
        username: 'alice',
        createdAt: new Date().toISOString(),
        sets: { wins: 5, losses: 3, total: 8, winRate: 63 },
        games: { wins: 12, losses: 7, total: 19, winRate: 63 },
        topCharacters: [{ character: 'Mario', count: 8, percentage: 42 }],
        matches: [],
      }
      mockDb.query.mockReturnValue(okAsync(profile))

      const result = await service.getProfile('alice')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual(profile)
    })

    it('returns profile with empty stats for new user', async () => {
      const profile = {
        username: 'newbie',
        createdAt: new Date().toISOString(),
        sets: { wins: 0, losses: 0, total: 0, winRate: 0 },
        games: { wins: 0, losses: 0, total: 0, winRate: 0 },
        topCharacters: [],
        matches: [],
      }
      mockDb.query.mockReturnValue(okAsync(profile))

      const result = await service.getProfile('newbie')

      expect(result.isOk()).toBe(true)
      const value = result._unsafeUnwrap() as typeof profile
      expect(value.sets.total).toBe(0)
      expect(value.games.total).toBe(0)
      expect(value.topCharacters).toEqual([])
      expect(value.matches).toEqual([])
    })

    it('returns NOT_FOUND when user does not exist', async () => {
      mockDb.query.mockReturnValue(errAsync(AppError.notFound('User')))

      const result = await service.getProfile('ghost')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
      expect(result._unsafeUnwrapErr().message).toBe('User not found')
    })

    it('returns DATABASE_ERROR on query failure', async () => {
      mockDb.query.mockReturnValue(errAsync(AppError.databaseError()))

      const result = await service.getProfile('alice')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('DATABASE_ERROR')
    })
  })
})
