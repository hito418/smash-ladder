import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync, errAsync } from 'neverthrow'
import { MatchmakingService } from 'src/features/matchmaking/matchmaking.service'
import { AppError } from 'src/shared/errors'
import { createMockDb, type MockDbService } from 'src/shared/test/helpers'

vi.mock('src/shared/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

describe('MatchmakingService', () => {
  let mockDb: MockDbService
  let service: MatchmakingService

  beforeEach(() => {
    mockDb = createMockDb()
    service = new MatchmakingService(mockDb as any)
  })

  describe('subscribe / handleNotification', () => {
    it('dispatches match_found to both players', () => {
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      service.subscribe('p1', cb1)
      service.subscribe('p2', cb2)

      service.handleNotification(
        JSON.stringify({ matchId: 'm1', player1Id: 'p1', player2Id: 'p2' })
      )

      expect(cb1).toHaveBeenCalledWith({ matchId: 'm1', opponentId: 'p2' })
      expect(cb2).toHaveBeenCalledWith({ matchId: 'm1', opponentId: 'p1' })
    })

    it('does not dispatch to unsubscribed users', () => {
      const cb = vi.fn()
      const unsub = service.subscribe('p1', cb)
      unsub()

      service.handleNotification(
        JSON.stringify({ matchId: 'm1', player1Id: 'p1', player2Id: 'p2' })
      )

      expect(cb).not.toHaveBeenCalled()
    })

    it('supports multiple callbacks per user', () => {
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      service.subscribe('p1', cb1)
      service.subscribe('p1', cb2)

      service.handleNotification(
        JSON.stringify({ matchId: 'm1', player1Id: 'p1', player2Id: 'p2' })
      )

      expect(cb1).toHaveBeenCalledOnce()
      expect(cb2).toHaveBeenCalledOnce()
    })

    it('unsubscribing one callback does not affect others for the same user', () => {
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      const unsub1 = service.subscribe('p1', cb1)
      service.subscribe('p1', cb2)
      unsub1()

      service.handleNotification(
        JSON.stringify({ matchId: 'm1', player1Id: 'p1', player2Id: 'p2' })
      )

      expect(cb1).not.toHaveBeenCalled()
      expect(cb2).toHaveBeenCalledOnce()
    })

    it('handles notification with no matching subscribers', () => {
      expect(() =>
        service.handleNotification(
          JSON.stringify({ matchId: 'm1', player1Id: 'p1', player2Id: 'p2' })
        )
      ).not.toThrow()
    })

    it('handles invalid JSON gracefully', () => {
      const cb = vi.fn()
      service.subscribe('p1', cb)

      expect(() => service.handleNotification('not json')).not.toThrow()
      expect(cb).not.toHaveBeenCalled()
    })

    it('handles empty string payload gracefully', () => {
      expect(() => service.handleNotification('')).not.toThrow()
    })
  })

  describe('joinQueue', () => {
    it('returns QUEUED on successful queue join', async () => {
      mockDb.transaction.mockReturnValue(okAsync({ status: 'QUEUED' }))

      const result = await service.joinQueue('p1')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({ status: 'QUEUED' })
    })

    it('returns MATCHED when opponent found', async () => {
      mockDb.transaction.mockReturnValue(
        okAsync({ status: 'MATCHED', matchId: 'm1', opponentId: 'p2' })
      )

      const result = await service.joinQueue('p1')

      expect(result.isOk()).toBe(true)
      const value = result._unsafeUnwrap()
      expect(value.status).toBe('MATCHED')
    })

    it('returns ALREADY_EXISTS when user is already in queue', async () => {
      mockDb.transaction.mockReturnValue(
        errAsync(AppError.alreadyExists('User already in queue'))
      )

      const result = await service.joinQueue('p1')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('ALREADY_EXISTS')
    })

    it('returns ALREADY_EXISTS when user has a pending match', async () => {
      mockDb.transaction.mockReturnValue(
        errAsync(AppError.alreadyExists('User already has a pending match'))
      )

      const result = await service.joinQueue('p1')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('ALREADY_EXISTS')
    })
  })

  describe('leaveQueue', () => {
    it('returns ok on success', async () => {
      mockDb.delete.mockReturnValue(okAsync({ id: 'q1', user_id: 'p1' }))

      const result = await service.leaveQueue('p1')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBeUndefined()
    })

    it('returns NOT_FOUND when user is not in queue', async () => {
      mockDb.delete.mockReturnValue(errAsync(AppError.notFound('Queue entry')))

      const result = await service.leaveQueue('p1')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
      expect(result._unsafeUnwrapErr().message).toBe('Queue entry not found')
    })
  })

  describe('getStatus', () => {
    it('returns successfully when query resolves', async () => {
      mockDb.query.mockReturnValue(okAsync({ status: 'IDLE' }))

      const result = await service.getStatus('p1')

      expect(result.isOk()).toBe(true)
    })

    it('returns DATABASE_ERROR on query failure', async () => {
      mockDb.query.mockReturnValue(errAsync(AppError.databaseError()))

      const result = await service.getStatus('p1')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('DATABASE_ERROR')
    })
  })
})
