import type { users } from './schemas/users'
import type { sessions } from './schemas/sessions'
import type { matchmakingQueue } from './schemas/matchmaking-queue'
import type { matches } from './schemas/matches'
import type { Kyselify } from 'drizzle-orm/kysely'

export type Database = {
  users: Kyselify<typeof users>
  sessions: Kyselify<typeof sessions>
  matchmaking_queue: Kyselify<typeof matchmakingQueue>
  matches: Kyselify<typeof matches>
}
