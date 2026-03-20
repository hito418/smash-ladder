import { describe, it, expect } from 'vitest'
import { AppError, isAppError, errorToHttpStatus } from 'src/shared/errors'

describe('AppError', () => {
  it('creates a NOT_FOUND error', () => {
    const err = AppError.notFound('User')
    expect(err.type).toBe('NOT_FOUND')
    expect(err.message).toBe('User not found')
    expect(err.name).toBe('AppError')
  })

  it('creates an ALREADY_EXISTS error', () => {
    const err = AppError.alreadyExists('Session')
    expect(err.type).toBe('ALREADY_EXISTS')
    expect(err.message).toBe('Session already exists')
  })

  it('creates an UNAUTHORIZED error with default message', () => {
    const err = AppError.unauthorized()
    expect(err.type).toBe('UNAUTHORIZED')
    expect(err.message).toBe('Unauthorized')
  })

  it('creates an UNAUTHORIZED error with custom message', () => {
    const err = AppError.unauthorized('Token expired')
    expect(err.message).toBe('Token expired')
  })

  it('creates an INVALID_CREDENTIALS error', () => {
    const err = AppError.invalidCredentials()
    expect(err.type).toBe('INVALID_CREDENTIALS')
    expect(err.message).toBe('Invalid credentials')
  })

  it('creates an INVALID_CREDENTIALS error with custom message', () => {
    const err = AppError.invalidCredentials('Bad token')
    expect(err.message).toBe('Bad token')
  })

  it('creates a DATABASE_ERROR with default message', () => {
    const err = AppError.databaseError()
    expect(err.type).toBe('DATABASE_ERROR')
    expect(err.message).toBe('Database operation failed')
  })

  it('creates a DATABASE_ERROR with custom message', () => {
    const err = AppError.databaseError('Insert failed')
    expect(err.message).toBe('Insert failed')
  })

  it('creates an INTERNAL_ERROR with default message', () => {
    const err = AppError.internalError()
    expect(err.type).toBe('INTERNAL_ERROR')
    expect(err.message).toBe('Internal server error')
  })

  it('creates an INTERNAL_ERROR with custom message', () => {
    const err = AppError.internalError('Hash failed')
    expect(err.message).toBe('Hash failed')
  })

  it('is an instance of Error', () => {
    const err = AppError.notFound('X')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
  })
})

describe('isAppError', () => {
  it('returns true for AppError instances', () => {
    expect(isAppError(AppError.notFound('X'))).toBe(true)
  })

  it('returns false for plain Error', () => {
    expect(isAppError(new Error('oops'))).toBe(false)
  })

  it('returns false for non-error values', () => {
    expect(isAppError(null)).toBe(false)
    expect(isAppError(undefined)).toBe(false)
    expect(isAppError('string')).toBe(false)
    expect(isAppError(42)).toBe(false)
    expect(isAppError({})).toBe(false)
  })
})

describe('errorToHttpStatus', () => {
  it.each([
    ['NOT_FOUND', 404],
    ['ALREADY_EXISTS', 409],
    ['UNAUTHORIZED', 401],
    ['INVALID_CREDENTIALS', 401],
    ['DATABASE_ERROR', 500],
    ['INTERNAL_ERROR', 500],
  ] as const)('maps %s to %d', (type, expected) => {
    const err = new AppError(type, 'msg')
    expect(errorToHttpStatus(err)).toBe(expected)
  })
})
