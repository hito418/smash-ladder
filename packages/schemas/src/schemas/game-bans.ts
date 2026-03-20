import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { games } from './games'
import { users } from './users'

export const gameBans = pgTable('game_bans', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  stage: text('stage').notNull(),
  banOrder: integer('ban_order').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type GameBan = typeof gameBans.$inferSelect
export type GameBanInsert = typeof gameBans.$inferInsert
