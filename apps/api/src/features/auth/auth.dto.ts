import { type } from 'arktype'
import { strip, timestamps } from 'src/shared/response-schemas'

export const SafeUserSchema = type({
  ...strip,
  id: 'string',
  username: 'string',
  ...timestamps,
})

export const SessionPayloadSchema = type({
  ...strip,
  sub: { ...strip, id: 'string' },
  username: 'string',
})
