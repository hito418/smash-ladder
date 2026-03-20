import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './utils/timestamps'
import { users } from './users'

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  player1Id: uuid('player1_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  player2Id: uuid('player2_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('PENDING'),
  winnerId: uuid('winner_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  ...timestamps,
})

export type Match = typeof matches.$inferSelect
export type MatchInsert = typeof matches.$inferInsert
