import type { Database } from '@repo/schemas'
import { Kysely, PostgresDialect } from 'kysely'
import pkg from 'pg'
import { env } from './env'

const { Pool } = pkg

const dialect = new PostgresDialect({
  pool: new Pool({
    database: env.PG_DB,
    host: env.PG_HOST,
    user: env.PG_USER,
    password: env.PG_PASSWORD,
    port: env.PG_PORT,
    max: 10,
  }),
})

export const db = new Kysely<Database>({
  dialect,
})
