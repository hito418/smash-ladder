import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schemas/**/*',
  out: './migrations',
  dbCredentials: {
    url: 'postgresql://postgres:postgres@db:5432/postgres',
  },
})
