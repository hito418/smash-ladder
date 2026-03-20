import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync, errAsync } from 'neverthrow'
import { AuthService } from 'src/features/auth/auth.service'
import { AppError } from 'src/shared/errors'
import { createMockDb, type MockDbService } from 'src/shared/test/helpers'

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

describe('AuthService', () => {
  let mockDb: MockDbService
  let service: AuthService

  beforeEach(() => {
    mockDb = createMockDb()
    service = new AuthService(mockDb as any)
  })

  describe('registerUser', () => {
    it('returns user credentials on success', async () => {
      mockDb.query.mockReturnValue(
        okAsync({
          id: 'user-1',
          username: 'alice',
          password: 'hashed_password',
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })
      )

      const result = await service.registerUser('alice', 'password123')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({
        id: 'user-1',
        username: 'alice',
      })
    })

    it('only exposes id and username, not password', async () => {
      mockDb.query.mockReturnValue(
        okAsync({
          id: 'user-1',
          username: 'alice',
          password: 'hashed_password',
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })
      )

      const result = await service.registerUser('alice', 'password123')
      const value = result._unsafeUnwrap()

      expect(value).not.toHaveProperty('password')
      expect(value).not.toHaveProperty('created_at')
      expect(Object.keys(value)).toEqual(['id', 'username'])
    })

    it('hashes the password before storing', async () => {
      const bcrypt = await import('bcrypt')
      mockDb.query.mockReturnValue(
        okAsync({ id: 'user-1', username: 'alice', password: 'hashed_password' })
      )

      await service.registerUser('alice', 'mypassword')

      expect(bcrypt.default.hash).toHaveBeenCalledWith('mypassword', 10)
    })

    it('returns DATABASE_ERROR when insert fails', async () => {
      mockDb.query.mockReturnValue(
        errAsync(AppError.databaseError('Failed to register user'))
      )

      const result = await service.registerUser('alice', 'password123')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('DATABASE_ERROR')
    })

    it('returns NOT_FOUND when insert returns undefined (guard)', async () => {
      mockDb.query.mockReturnValue(okAsync(undefined))

      const result = await service.registerUser('alice', 'password123')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
    })
  })

  describe('loginUser', () => {
    it('returns user credentials for valid login', async () => {
      const bcrypt = await import('bcrypt')
      mockDb.query.mockReturnValue(
        okAsync({ id: 'user-1', username: 'alice', password: 'hashed_password' })
      )

      const result = await service.loginUser('alice', 'password123')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({
        id: 'user-1',
        username: 'alice',
      })
      expect(bcrypt.default.compare).toHaveBeenCalledWith(
        'password123',
        'hashed_password'
      )
    })

    it('only exposes id and username on successful login', async () => {
      mockDb.query.mockReturnValue(
        okAsync({ id: 'user-1', username: 'alice', password: 'hashed_password' })
      )

      const result = await service.loginUser('alice', 'password123')
      const value = result._unsafeUnwrap()

      expect(value).not.toHaveProperty('password')
      expect(Object.keys(value)).toEqual(['id', 'username'])
    })

    it('returns NOT_FOUND when user does not exist', async () => {
      mockDb.query.mockReturnValue(okAsync(undefined))

      const result = await service.loginUser('ghost', 'password123')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
      expect(result._unsafeUnwrapErr().message).toBe('User not found')
    })

    it('returns INVALID_CREDENTIALS for wrong password', async () => {
      const bcrypt = await import('bcrypt')
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(false as never)

      mockDb.query.mockReturnValue(
        okAsync({ id: 'user-1', username: 'alice', password: 'hashed_password' })
      )

      const result = await service.loginUser('alice', 'wrong')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('INVALID_CREDENTIALS')
      expect(result._unsafeUnwrapErr().message).toBe('Wrong password')
    })

    it('returns error when database query fails', async () => {
      mockDb.query.mockReturnValue(errAsync(AppError.databaseError()))

      const result = await service.loginUser('alice', 'password123')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('DATABASE_ERROR')
    })
  })
})
