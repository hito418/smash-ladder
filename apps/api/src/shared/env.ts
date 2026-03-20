import { type } from 'arktype'

const envSchema = type({
  PG_HOST: 'string',
  PG_PORT: 'string.numeric.parse',
  PG_DB: 'string',
  PG_USER: 'string',
  PG_PASSWORD: 'string',
  COOKIE_SECRET: 'string',
  COOKIE_DOMAIN: 'string | undefined',
  CORS_ORIGIN: 'string',
  APP_PORT: 'string.numeric.parse = "4000"',
  PAGE_SIZE: 'string.numeric.parse = "15"',
  NODE_ENV: '"DEV" | "STAGING" | "PROD" = "DEV"',
})

const result = envSchema(process.env)
if (result instanceof type.errors) {
  console.error('Invalid Environment Variables')
  console.error(result.summary)
  process.exit(1)
}

export const env = result
