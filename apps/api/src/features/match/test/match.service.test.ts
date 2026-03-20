import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync, errAsync } from 'neverthrow'
import { MatchService } from 'src/features/match/match.service'
import { AppError } from 'src/shared/errors'
import { createMockDb, type MockDbService } from 'src/shared/test/helpers'

vi.mock('src/shared/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

describe('MatchService', () => {
  let mockDb: MockDbService
  let service: MatchService

  beforeEach(() => {
    mockDb = createMockDb()
    service = new MatchService(mockDb as any)
  })

  describe('subscribe / handleNotification', () => {
    it('dispatches match updates to subscribers', () => {
      const cb = vi.fn()
      service.subscribe('match-1', cb)

      service.handleNotification(
        JSON.stringify({ matchId: 'match-1', event: 'character_selected' })
      )

      expect(cb).toHaveBeenCalledWith({
        matchId: 'match-1',
        event: 'character_selected',
      })
    })

    it('includes extra data in the dispatched event', () => {
      const cb = vi.fn()
      service.subscribe('match-1', cb)

      service.handleNotification(
        JSON.stringify({
          matchId: 'match-1',
          event: 'stage_picked',
          data: { stage: 'Battlefield' },
        })
      )

      expect(cb).toHaveBeenCalledWith({
        matchId: 'match-1',
        event: 'stage_picked',
        data: { stage: 'Battlefield' },
      })
    })

    it('does not dispatch to other match subscribers', () => {
      const cb = vi.fn()
      service.subscribe('match-2', cb)

      service.handleNotification(
        JSON.stringify({ matchId: 'match-1', event: 'stage_banned' })
      )

      expect(cb).not.toHaveBeenCalled()
    })

    it('supports multiple subscribers for the same match', () => {
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      service.subscribe('match-1', cb1)
      service.subscribe('match-1', cb2)

      service.handleNotification(
        JSON.stringify({ matchId: 'match-1', event: 'report_submitted' })
      )

      expect(cb1).toHaveBeenCalledOnce()
      expect(cb2).toHaveBeenCalledOnce()
    })

    it('cleans up after unsubscribe', () => {
      const cb = vi.fn()
      const unsub = service.subscribe('match-1', cb)
      unsub()

      service.handleNotification(
        JSON.stringify({ matchId: 'match-1', event: 'stage_picked' })
      )

      expect(cb).not.toHaveBeenCalled()
    })

    it('unsubscribing one does not affect others for the same match', () => {
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      const unsub = service.subscribe('match-1', cb1)
      service.subscribe('match-1', cb2)
      unsub()

      service.handleNotification(
        JSON.stringify({ matchId: 'match-1', event: 'next_game' })
      )

      expect(cb1).not.toHaveBeenCalled()
      expect(cb2).toHaveBeenCalledOnce()
    })

    it('handles notification with no subscribers', () => {
      expect(() =>
        service.handleNotification(
          JSON.stringify({ matchId: 'match-99', event: 'match_completed' })
        )
      ).not.toThrow()
    })

    it('handles invalid JSON gracefully', () => {
      const cb = vi.fn()
      service.subscribe('match-1', cb)

      expect(() => service.handleNotification('{')).not.toThrow()
      expect(cb).not.toHaveBeenCalled()
    })

    it('handles empty string payload gracefully', () => {
      expect(() => service.handleNotification('')).not.toThrow()
    })
  })

  describe('listMatches', () => {
    it('returns ok on success', async () => {
      mockDb.query.mockReturnValue(okAsync([]))

      const result = await service.listMatches()

      expect(result.isOk()).toBe(true)
    })

    it('returns DATABASE_ERROR on failure', async () => {
      mockDb.query.mockReturnValue(errAsync(AppError.databaseError()))

      const result = await service.listMatches()

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('DATABASE_ERROR')
    })
  })

  describe('getMatchDetails', () => {
    it('returns ok on success', async () => {
      mockDb.query.mockReturnValue(okAsync({ id: 'm1' }))

      const result = await service.getMatchDetails('m1')

      expect(result.isOk()).toBe(true)
    })

    it('returns NOT_FOUND when match does not exist', async () => {
      mockDb.query.mockReturnValue(errAsync(AppError.notFound('Match')))

      const result = await service.getMatchDetails('m1')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
    })
  })

  describe('getMatch', () => {
    it('returns ok on success', async () => {
      mockDb.query.mockReturnValue(okAsync({ id: 'm1' }))

      const result = await service.getMatch('m1', 'p1')

      expect(result.isOk()).toBe(true)
    })

    it('returns NOT_FOUND when match does not exist', async () => {
      mockDb.query.mockReturnValue(errAsync(AppError.notFound('Match')))

      const result = await service.getMatch('m1', 'p1')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
    })
  })

  describe('selectCharacter', () => {
    it('returns success when character selected', async () => {
      mockDb.transaction.mockReturnValue(okAsync({ success: true }))

      const result = await service.selectCharacter('m1', 'p1', 'Mario')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({ success: true })
    })

    it('returns NOT_FOUND for invalid character', async () => {
      mockDb.transaction.mockReturnValue(errAsync(AppError.notFound('Character')))

      const result = await service.selectCharacter('m1', 'p1', 'InvalidChar')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
    })

    it('returns UNAUTHORIZED when not a participant', async () => {
      mockDb.transaction.mockReturnValue(
        errAsync(AppError.unauthorized('Not a participant'))
      )

      const result = await service.selectCharacter('m1', 'outsider', 'Mario')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('UNAUTHORIZED')
    })

    it('returns ALREADY_EXISTS when character already selected', async () => {
      mockDb.transaction.mockReturnValue(
        errAsync(AppError.alreadyExists('Character already selected'))
      )

      const result = await service.selectCharacter('m1', 'p1', 'Mario')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('ALREADY_EXISTS')
    })
  })

  describe('banStage', () => {
    it('returns success when stage banned', async () => {
      mockDb.transaction.mockReturnValue(okAsync({ success: true }))

      const result = await service.banStage('m1', 'p1', 'Battlefield')

      expect(result.isOk()).toBe(true)
    })

    it('returns UNAUTHORIZED when not your turn to ban', async () => {
      mockDb.transaction.mockReturnValue(
        errAsync(AppError.unauthorized('Not your turn to ban'))
      )

      const result = await service.banStage('m1', 'p2', 'Battlefield')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('UNAUTHORIZED')
    })

    it('returns ALREADY_EXISTS when stage already banned', async () => {
      mockDb.transaction.mockReturnValue(
        errAsync(AppError.alreadyExists('Stage already banned'))
      )

      const result = await service.banStage('m1', 'p1', 'Battlefield')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('ALREADY_EXISTS')
    })
  })

  describe('pickStage', () => {
    it('returns success when stage picked', async () => {
      mockDb.transaction.mockReturnValue(okAsync({ success: true }))

      const result = await service.pickStage('m1', 'p1', 'Smashville')

      expect(result.isOk()).toBe(true)
    })

    it('returns UNAUTHORIZED when not your turn to pick', async () => {
      mockDb.transaction.mockReturnValue(
        errAsync(AppError.unauthorized('Not your turn to pick'))
      )

      const result = await service.pickStage('m1', 'p1', 'Smashville')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('UNAUTHORIZED')
    })

    it('returns UNAUTHORIZED when stage is banned', async () => {
      mockDb.transaction.mockReturnValue(
        errAsync(AppError.unauthorized('Stage is banned'))
      )

      const result = await service.pickStage('m1', 'p1', 'Battlefield')

      expect(result.isErr()).toBe(true)
    })
  })

  describe('reportWinner', () => {
    it('returns success on first report', async () => {
      mockDb.transaction.mockReturnValue(okAsync({ success: true }))

      const result = await service.reportWinner('m1', 'p1', 'p1')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({ success: true })
    })

    it('returns success with conflict flag on disagreement', async () => {
      mockDb.transaction.mockReturnValue(
        okAsync({ success: true, conflict: true })
      )

      const result = await service.reportWinner('m1', 'p1', 'p1')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap().conflict).toBe(true)
    })

    it('returns UNAUTHORIZED for invalid winner', async () => {
      mockDb.transaction.mockReturnValue(
        errAsync(AppError.unauthorized('Winner must be a match participant'))
      )

      const result = await service.reportWinner('m1', 'p1', 'outsider')

      expect(result.isErr()).toBe(true)
    })

    it('returns ALREADY_EXISTS when already reported', async () => {
      mockDb.transaction.mockReturnValue(
        errAsync(AppError.alreadyExists('Already reported'))
      )

      const result = await service.reportWinner('m1', 'p1', 'p1')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('ALREADY_EXISTS')
    })
  })

  describe('forfeit', () => {
    it('returns success when match forfeited', async () => {
      mockDb.transaction.mockReturnValue(okAsync({ success: true }))

      const result = await service.forfeit('m1', 'p1')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({ success: true })
    })

    it('returns NOT_FOUND when match does not exist', async () => {
      mockDb.transaction.mockReturnValue(errAsync(AppError.notFound('Match')))

      const result = await service.forfeit('m1', 'p1')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
    })

    it('returns UNAUTHORIZED when match is not in progress', async () => {
      mockDb.transaction.mockReturnValue(
        errAsync(AppError.unauthorized('Match is not in progress'))
      )

      const result = await service.forfeit('m1', 'p1')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('UNAUTHORIZED')
    })
  })
})
