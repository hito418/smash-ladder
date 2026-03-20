import pino from 'pino'
import { env } from './env'

export const logger = pino({
  level: env.NODE_ENV === 'PROD' ? 'info' : 'debug',
  ...(env.NODE_ENV === 'DEV' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
})
