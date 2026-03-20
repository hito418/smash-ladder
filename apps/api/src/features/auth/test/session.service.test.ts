import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync, errAsync } from 'neverthrow'
import { SessionService } from 'src/features/auth/session.service'
import { AppError } from 'src/shared/errors'
import { createMockDb, type MockDbService } from 'src/shared/test/helpers'

describe('SessionService', () => {
  let mockDb: MockDbService
  let service: SessionService

  beforeEach(() => {
    mockDb = createMockDb()
    service = new SessionService(mockDb as any)
  })

  describe('create', () => {
    it('returns sessionId and payload on success', async () => {
      mockDb.query.mockReturnValue(
        okAsync({ id: 'session-1', user_id: 'user-1', expires_at: new Date() })
      )

      const result = await service.create('user-1', 'alice')

      expect(result.isOk()).toBe(true)
      const value = result._unsafeUnwrap()
      expect(value.sessionId).toBeTypeOf('string')
      expect(value.sessionId).toHaveLength(64)
      expect(value.payload).toEqual({
        sub: { id: 'user-1' },
        username: 'alice',
      })
    })

    it('generates unique session IDs', async () => {
      mockDb.query.mockReturnValue(
        okAsync({ id: 'x', user_id: 'user-1', expires_at: new Date() })
      )

      const result1 = await service.create('user-1', 'alice')
      const result2 = await service.create('user-1', 'alice')

      expect(result1._unsafeUnwrap().sessionId).not.toBe(
        result2._unsafeUnwrap().sessionId
      )
    })

    it('returns DATABASE_ERROR when insert fails', async () => {
      mockDb.query.mockReturnValue(
        errAsync(AppError.databaseError('Failed to create session'))
      )

      const result = await service.create('user-1', 'alice')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('DATABASE_ERROR')
    })
  })

  describe('validate', () => {
    it('returns payload for valid non-expired session', async () => {
      const futureDate = new Date(Date.now() + 86400000)
      mockDb.query.mockReturnValue(
        okAsync({
          user_id: 'user-1',
          expires_at: futureDate,
          username: 'alice',
        })
      )

      const result = await service.validate('session-1')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({
        sub: { id: 'user-1' },
        username: 'alice',
      })
    })

    it('returns UNAUTHORIZED for expired session and deletes it', async () => {
      const pastDate = new Date(Date.now() - 86400000)
      mockDb.query
        .mockReturnValueOnce(
          okAsync({
            user_id: 'user-1',
            expires_at: pastDate,
            username: 'alice',
          })
        )
        .mockReturnValueOnce(okAsync([]))

      const result = await service.validate('session-1')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('UNAUTHORIZED')
      expect(result._unsafeUnwrapErr().message).toBe('Session expired')
      expect(mockDb.query).toHaveBeenCalledTimes(2)
    })

    it('returns error when session not found (guard)', async () => {
      mockDb.query.mockReturnValue(okAsync(undefined))

      const result = await service.validate('nonexistent')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('DATABASE_ERROR')
    })

    it('returns error when database query fails', async () => {
      mockDb.query.mockReturnValue(
        errAsync(AppError.unauthorized('Invalid session'))
      )

      const result = await service.validate('bad-session')

      expect(result.isErr()).toBe(true)
    })
  })

  describe('delete', () => {
    it('resolves successfully', async () => {
      mockDb.query.mockReturnValue(okAsync([]))

      const result = await service.delete('session-1')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBeUndefined()
    })

    it('returns error on failure', async () => {
      mockDb.query.mockReturnValue(
        errAsync(AppError.databaseError('Failed to delete session'))
      )

      const result = await service.delete('session-1')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('DATABASE_ERROR')
    })
  })

  describe('deleteAllForUser', () => {
    it('resolves successfully', async () => {
      mockDb.query.mockReturnValue(okAsync([]))

      const result = await service.deleteAllForUser('user-1')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBeUndefined()
    })

    it('returns error on failure', async () => {
      mockDb.query.mockReturnValue(
        errAsync(AppError.databaseError('Failed to delete user sessions'))
      )

      const result = await service.deleteAllForUser('user-1')

      expect(result.isErr()).toBe(true)
    })
  })

  describe('cleanupExpired', () => {
    it('returns count of deleted sessions', async () => {
      mockDb.query.mockReturnValue(okAsync({ numDeletedRows: BigInt(5) }))

      const result = await service.cleanupExpired()

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(5)
    })

    it('returns 0 when no sessions expired', async () => {
      mockDb.query.mockReturnValue(okAsync({ numDeletedRows: BigInt(0) }))

      const result = await service.cleanupExpired()

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(0)
    })

    it('returns error on failure', async () => {
      mockDb.query.mockReturnValue(
        errAsync(AppError.databaseError('Failed to cleanup expired sessions'))
      )

      const result = await service.cleanupExpired()

      expect(result.isErr()).toBe(true)
    })
  })
})
