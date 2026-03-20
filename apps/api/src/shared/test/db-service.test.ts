import { describe, it, expect } from 'vitest'
import { ok, err } from 'neverthrow'
import { DbService } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

describe('DbService.cleanUpdate', () => {
  it('strips undefined values and adds updated_at', () => {
    const result = DbService.cleanUpdate({
      name: 'Alice',
      bio: undefined,
      age: 25,
    })

    expect(result).toHaveProperty('name', 'Alice')
    expect(result).toHaveProperty('age', 25)
    expect(result).not.toHaveProperty('bio')
    expect(result.updated_at).toBeInstanceOf(Date)
  })

  it('returns only updated_at when all values are undefined', () => {
    const result = DbService.cleanUpdate({
      name: undefined,
      bio: undefined,
    })

    expect(Object.keys(result)).toEqual(['updated_at'])
    expect(result.updated_at).toBeInstanceOf(Date)
  })

  it('preserves falsy non-undefined values', () => {
    const result = DbService.cleanUpdate({
      count: 0,
      label: '',
      active: false,
      data: null,
    })

    expect(result).toHaveProperty('count', 0)
    expect(result).toHaveProperty('label', '')
    expect(result).toHaveProperty('active', false)
    expect(result).toHaveProperty('data', null)
  })

  it('sets updated_at to approximately now', () => {
    const before = Date.now()
    const result = DbService.cleanUpdate({ x: 1 })
    const after = Date.now()

    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(before)
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(after)
  })
})

describe('DbService.guard', () => {
  it('returns ok when value is defined', () => {
    const guard = DbService.guard()
    const result = guard({ id: '1' })
    expect(result).toEqual(ok({ id: '1' }))
  })

  it('returns ok for falsy but defined values', () => {
    const guard = DbService.guard()
    expect(guard(0)).toEqual(ok(0))
    expect(guard('')).toEqual(ok(''))
    expect(guard(false)).toEqual(ok(false))
    expect(guard(null)).toEqual(ok(null))
  })

  it('returns err with default NOT_FOUND when value is undefined', () => {
    const guard = DbService.guard()
    const result = guard(undefined)
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
  })

  it('returns err with custom error when value is undefined', () => {
    const customError = AppError.unauthorized('Nope')
    const guard = DbService.guard(customError)
    const result = guard(undefined)
    expect(result).toEqual(err(customError))
  })
})
