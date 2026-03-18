import { type } from 'arktype'
import { resolver } from 'hono-openapi'
import { Result, ok, err } from 'neverthrow'
import { AppError } from 'src/shared/errors'

const dateToString = type('Date').pipe((d) => d.toISOString(), type('string'))

export const timestamps = {
  created_at: dateToString,
  updated_at: dateToString,
}

export const timestampsWithSoftDelete = {
  ...timestamps,
  'deleted_at?': dateToString.or(type('null')),
}

const strip = { '+': 'delete' } as const

export const ErrorSchema = type({ ...strip, message: 'string' })

export const DeletedIdSchema = type({ ...strip, id: 'string' })

type ErrorResponseEntry = {
  description: string
  content: { 'application/json': { schema: object } }
}

export const errResponse = (description: string): ErrorResponseEntry => ({
  description,
  content: { 'application/json': { schema: resolver(ErrorSchema) } },
})

export { strip, dateToString }

export function paginatedSchema<t>(itemType: type.Any<t>) {
  return type({
    '+': 'delete',
    data: itemType.array(),
    page: 'number',
    size: 'number',
    total: 'number',
    totalPages: 'number',
  })
}

export function dto<T extends type.Any>(
  schema: T,
  data: unknown
): Result<T['infer'], AppError> {
  const out = schema(data)
  if (out instanceof type.errors) {
    return err(
      AppError.internalError(`Response schema mismatch: ${out.summary}`)
    )
  }
  return ok(out)
}
