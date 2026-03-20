import { describe, it, expect } from 'vitest'
import { type } from 'arktype'
import { dto } from 'src/shared/response-schemas'
import 'src/config/arktype'

const TestSchema = type({
  '+': 'delete',
  id: 'string',
  name: 'string',
})

describe('dto', () => {
  it('returns ok with valid data', () => {
    const result = dto(TestSchema, { id: '1', name: 'Alice' })
    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toEqual({ id: '1', name: 'Alice' })
  })

  it('strips extra properties', () => {
    const result = dto(TestSchema, { id: '1', name: 'Alice', extra: true })
    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toEqual({ id: '1', name: 'Alice' })
  })

  it('returns err for invalid data', () => {
    const result = dto(TestSchema, { id: 123 })
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr().type).toBe('INTERNAL_ERROR')
    expect(result._unsafeUnwrapErr().message).toContain('Response schema mismatch')
  })

  it('returns err when data is null', () => {
    const result = dto(TestSchema, null)
    expect(result.isErr()).toBe(true)
  })

  it('returns err when required fields are missing', () => {
    const result = dto(TestSchema, { id: '1' })
    expect(result.isErr()).toBe(true)
  })
})
