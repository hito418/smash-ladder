import { serve } from '@hono/node-server'
import { Scalar } from '@scalar/hono-api-reference'
import { Hono } from 'hono'
import { openAPIRouteHandler } from 'hono-openapi'
import { cors } from 'hono/cors'
import { showRoutes } from 'hono/dev'
import './config/arktype'
import authRoute from './routes/auth'
import matchmakingRoute from './routes/matchmaking'
import matchRoute from './routes/match'
import usersRoute from './routes/users'
import { env } from './shared/env'
import './shared/hono'
import { logger } from './shared/logger'
import { provide } from './shared/provide'
import { sessionService, matchmakingService, matchService } from './container'
import { PgListener } from './shared/pg-listener'

const app = new Hono()
  .use(async (ctx, next) => {
    const start = Date.now()
    await next()
    logger.info(
      {
        method: ctx.req.method,
        path: ctx.req.path,
        status: ctx.res.status,
        duration: Date.now() - start,
      },
      `${ctx.req.method} ${ctx.req.path}`
    )
  })
  .use(provide('sessionService', sessionService))
  .use(
    cors({
      origin: env.CORS_ORIGIN.split(','),
      credentials: true,
    })
  )
  .route('/', authRoute)
  .route('/', matchmakingRoute)
  .route('/', matchRoute)
  .route('/', usersRoute)
  .get('/healthcheck', (ctx) => {
    return ctx.json({ status: 'ok' }, 200)
  })

app
  .get(
    '/openapi.json',
    openAPIRouteHandler(app, {
      documentation: {
        info: {
          title: 'Smash Ladder',
          version: '1.0.0',
          description: 'Smash Ladder API',
        },
      },
    })
  )
  .get(
    '/docs',
    Scalar({
      theme: 'saturn',
      url: '/openapi.json',
    })
  )

if (process?.env?.NODE_ENV === 'DEV' || process?.env?.NODE_ENV === 'STAGING') {
  showRoutes(app)
}

const pgListener = new PgListener()

pgListener
  .listen('match_found', (payload) =>
    matchmakingService.handleNotification(payload)
  )
  .then(() =>
    pgListener.listen('match_update', (payload) =>
      matchService.handleNotification(payload)
    )
  )
  .then(() => pgListener.connect())
  .then(() => logger.info('PgListener connected'))
  .catch((err) => logger.error(err, 'PgListener failed to start'))

const server = serve(
  {
    fetch: app.fetch,
    port: env.APP_PORT,
  },
  (info) => logger.info(`Listening on http://localhost:${info.port}`)
)

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received: closing HTTP server')
  await pgListener.close()
  server.close()
  process.exit(0)
})
process.on('SIGINT', async () => {
  logger.info('SIGINT received: closing HTTP server')
  await pgListener.close()
  server.close()
  process.exit(0)
})
