import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './utils/timestamps'
import { users } from './users'

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ...timestamps,
})

export type Session = typeof sessions.$inferSelect
export type SessionInsert = typeof sessions.$inferInsert
