import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { describeRoute, resolver } from 'hono-openapi'
import { validator } from 'hono-openapi'
import { type } from 'arktype'
import { isAuth } from 'src/features/auth/auth.middleware'
import { MatchDetailSchema, MatchListSchema } from 'src/features/match/match.dto'
import { dto, errResponse } from 'src/shared/response-schemas'
import { errorToHttpStatus } from 'src/shared/errors'
import { matchService } from 'src/container'
import { provide } from 'src/shared/provide'

const SelectCharacterBody = type({ character: 'string' })
const BanStageBody = type({ stage: 'string' })
const PickStageBody = type({ stage: 'string' })
const ReportWinnerBody = type({ winnerId: 'string' })

const matchRoute = new Hono()
  .basePath('/matches')
  .use(provide('matchService', matchService))
  .get(
    '/',
    describeRoute({
      tags: ['Match'],
      summary: 'List all matches',
      responses: {
        200: {
          description: 'List of matches',
          content: {
            'application/json': { schema: resolver(MatchListSchema) },
          },
        },
      },
    }),
    async (ctx) => {
      const result = await ctx.get('matchService').listMatches()

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      return dto(MatchListSchema, result.value).match(
        (data) => ctx.json(data, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get(
    '/:id/details',
    describeRoute({
      tags: ['Match'],
      summary: 'Get match details (public view)',
      responses: {
        200: {
          description: 'Match details with games',
          content: {
            'application/json': { schema: resolver(MatchDetailSchema) },
          },
        },
        404: errResponse('Match not found'),
      },
    }),
    async (ctx) => {
      const matchId = ctx.req.param('id')
      const result = await ctx.get('matchService').getMatchDetails(matchId)

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      return dto(MatchDetailSchema, result.value).match(
        (data) => ctx.json(data, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get(
    '/:id',
    describeRoute({
      tags: ['Match'],
      summary: 'Get match state (participant only)',
      responses: {
        200: {
          description: 'Match details with games',
          content: {
            'application/json': { schema: resolver(MatchDetailSchema) },
          },
        },
        404: errResponse('Match not found'),
        401: errResponse('Unauthorized'),
      },
    }),
    isAuth(),
    async (ctx) => {
      const userId = ctx.get('userPayload').sub.id
      const matchId = ctx.req.param('id')
      const result = await ctx.get('matchService').getMatch(matchId, userId)

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      return dto(MatchDetailSchema, result.value).match(
        (data) => ctx.json(data, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/:id/character',
    describeRoute({
      tags: ['Match'],
      summary: 'Select character',
      responses: {
        200: { description: 'Character selected' },
        404: errResponse('Match or character not found'),
        401: errResponse('Unauthorized'),
        409: errResponse('Already selected'),
      },
    }),
    isAuth(),
    validator('json', SelectCharacterBody),
    async (ctx) => {
      const userId = ctx.get('userPayload').sub.id
      const matchId = ctx.req.param('id')
      const { character } = ctx.req.valid('json')
      const result = await ctx
        .get('matchService')
        .selectCharacter(matchId, userId, character)

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      return ctx.json(result.value, 200)
    }
  )
  .post(
    '/:id/ban',
    describeRoute({
      tags: ['Match'],
      summary: 'Ban stage',
      responses: {
        200: { description: 'Stage banned' },
        404: errResponse('Match or stage not found'),
        401: errResponse('Unauthorized'),
        409: errResponse('Already banned'),
      },
    }),
    isAuth(),
    validator('json', BanStageBody),
    async (ctx) => {
      const userId = ctx.get('userPayload').sub.id
      const matchId = ctx.req.param('id')
      const { stage } = ctx.req.valid('json')
      const result = await ctx
        .get('matchService')
        .banStage(matchId, userId, stage)

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      return ctx.json(result.value, 200)
    }
  )
  .post(
    '/:id/stage',
    describeRoute({
      tags: ['Match'],
      summary: 'Pick stage',
      responses: {
        200: { description: 'Stage picked' },
        404: errResponse('Match or stage not found'),
        401: errResponse('Unauthorized'),
      },
    }),
    isAuth(),
    validator('json', PickStageBody),
    async (ctx) => {
      const userId = ctx.get('userPayload').sub.id
      const matchId = ctx.req.param('id')
      const { stage } = ctx.req.valid('json')
      const result = await ctx
        .get('matchService')
        .pickStage(matchId, userId, stage)

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      return ctx.json(result.value, 200)
    }
  )
  .post(
    '/:id/report',
    describeRoute({
      tags: ['Match'],
      summary: 'Report winner',
      responses: {
        200: { description: 'Report submitted' },
        404: errResponse('Match not found'),
        401: errResponse('Unauthorized'),
        409: errResponse('Already reported or conflict'),
      },
    }),
    isAuth(),
    validator('json', ReportWinnerBody),
    async (ctx) => {
      const userId = ctx.get('userPayload').sub.id
      const matchId = ctx.req.param('id')
      const { winnerId } = ctx.req.valid('json')
      const result = await ctx
        .get('matchService')
        .reportWinner(matchId, userId, winnerId)

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      return ctx.json(result.value, 200)
    }
  )
  .post(
    '/:id/forfeit',
    describeRoute({
      tags: ['Match'],
      summary: 'Forfeit match',
      responses: {
        200: { description: 'Match forfeited' },
        404: errResponse('Match not found'),
        401: errResponse('Unauthorized'),
      },
    }),
    isAuth(),
    async (ctx) => {
      const userId = ctx.get('userPayload').sub.id
      const matchId = ctx.req.param('id')
      const result = await ctx
        .get('matchService')
        .forfeit(matchId, userId)

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      return ctx.json(result.value, 200)
    }
  )
  .get('/:id/events', isAuth(), async (ctx) => {
    const userId = ctx.get('userPayload').sub.id
    const matchId = ctx.req.param('id')
    const service = ctx.get('matchService')

    return streamSSE(ctx, async (stream) => {
      let running = true

      const unsubscribe = service.subscribe(matchId, (data) => {
        stream.writeSSE({
          data: JSON.stringify(data),
          event: data.event,
          id: `${matchId}-${Date.now()}`,
        })
      })

      stream.onAbort(() => {
        running = false
        unsubscribe()
      })

      while (running) {
        await stream.writeSSE({
          data: '',
          event: 'heartbeat',
        })
        await stream.sleep(30000)
      }
    })
  })

export default matchRoute
