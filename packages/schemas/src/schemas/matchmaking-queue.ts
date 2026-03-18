import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './utils/timestamps'
import { users } from './users'

export const matchmakingQueue = pgTable('matchmaking_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
  ...timestamps,
})

export type MatchmakingQueueEntry = typeof matchmakingQueue.$inferSelect
export type MatchmakingQueueInsert = typeof matchmakingQueue.$inferInsert
