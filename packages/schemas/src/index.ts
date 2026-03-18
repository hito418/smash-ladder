import type { users } from './schemas/users'
import type { sessions } from './schemas/sessions'
import type { Kyselify } from 'drizzle-orm/kysely'

export type Database = {
  users: Kyselify<typeof users>
  sessions: Kyselify<typeof sessions>
}
