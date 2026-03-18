import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { deletedAt, timestamps } from './utils/timestamps'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  ...timestamps,
  deletedAt,
})

export type User = typeof users.$inferSelect
export type UserInsert = typeof users.$inferInsert
