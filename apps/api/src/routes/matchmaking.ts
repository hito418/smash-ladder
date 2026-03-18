import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { describeRoute, resolver } from 'hono-openapi'
import { isAuth } from 'src/features/auth/auth.middleware'
import {
  JoinQueueResponseSchema,
  LeaveQueueResponseSchema,
  MatchmakingStatusSchema,
} from 'src/features/matchmaking/matchmaking.dto'
import { dto, errResponse } from 'src/shared/response-schemas'
import { errorToHttpStatus } from 'src/shared/errors'
import { matchmakingService } from 'src/container'
import { provide } from 'src/shared/provide'

const matchmakingRoute = new Hono()
  .basePath('/matchmaking')
  .use(provide('matchmaking', matchmakingService))
  .post(
    '/join',
    describeRoute({
      tags: ['Matchmaking'],
      summary: 'Join queue',
      description:
        'Joins the matchmaking queue. If an opponent is available, creates a match immediately.',
      responses: {
        200: {
          description: 'Queued or matched',
          content: {
            'application/json': { schema: resolver(JoinQueueResponseSchema) },
          },
        },
        409: errResponse('Already in queue or has pending match'),
        401: errResponse('Unauthorized'),
      },
    }),
    isAuth(),
    async (ctx) => {
      const userId = ctx.get('userPayload').sub.id
      const result = await ctx.get('matchmaking').joinQueue(userId)

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      return dto(JoinQueueResponseSchema, result.value).match(
        (data) => ctx.json(data, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/leave',
    describeRoute({
      tags: ['Matchmaking'],
      summary: 'Leave queue',
      description: 'Removes the user from the matchmaking queue.',
      responses: {
        200: {
          description: 'Left the queue',
          content: {
            'application/json': { schema: resolver(LeaveQueueResponseSchema) },
          },
        },
        404: errResponse('Not in queue'),
        401: errResponse('Unauthorized'),
      },
    }),
    isAuth(),
    async (ctx) => {
      const userId = ctx.get('userPayload').sub.id
      const result = await ctx.get('matchmaking').leaveQueue(userId)

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      return ctx.json({ success: true as const }, 200)
    }
  )
  .get(
    '/status',
    describeRoute({
      tags: ['Matchmaking'],
      summary: 'Get matchmaking status',
      description:
        'Returns the current matchmaking status for the authenticated user.',
      responses: {
        200: {
          description: 'Current status',
          content: {
            'application/json': { schema: resolver(MatchmakingStatusSchema) },
          },
        },
        401: errResponse('Unauthorized'),
      },
    }),
    isAuth(),
    async (ctx) => {
      const userId = ctx.get('userPayload').sub.id
      const result = await ctx.get('matchmaking').getStatus(userId)

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      return dto(MatchmakingStatusSchema, result.value).match(
        (data) => ctx.json(data, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get('/events', isAuth(), async (ctx) => {
    const userId = ctx.get('userPayload').sub.id
    const service = ctx.get('matchmaking')

    return streamSSE(ctx, async (stream) => {
      let running = true

      const unsubscribe = service.subscribe(userId, (data) => {
        stream.writeSSE({
          data: JSON.stringify(data),
          event: 'match_found',
          id: data.matchId,
        })
      })

      stream.onAbort(() => {
        running = false
        unsubscribe()
      })

      // Heartbeat to keep connection alive
      while (running) {
        await stream.writeSSE({
          data: '',
          event: 'heartbeat',
        })
        await stream.sleep(30000)
      }
    })
  })

export default matchmakingRoute
