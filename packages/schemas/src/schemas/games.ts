import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './utils/timestamps'
import { matches } from './matches'
import { users } from './users'

export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  gameNumber: integer('game_number').notNull(),
  player1Character: text('player1_character'),
  player2Character: text('player2_character'),
  stage: text('stage'),
  winnerId: uuid('winner_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  player1Report: uuid('player1_report'),
  player2Report: uuid('player2_report'),
  status: text('status').notNull().default('CHARACTER_SELECT'),
  firstBannerId: uuid('first_banner_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  ...timestamps,
})

export type Game = typeof games.$inferSelect
export type GameInsert = typeof games.$inferInsert
