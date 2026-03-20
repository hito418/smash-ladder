import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { Hono } from 'hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { SessionPayloadSchema } from 'src/features/auth/auth.dto'
import { type } from 'arktype'
import { env } from 'src/shared/env'
import { dto, errResponse } from 'src/shared/response-schemas'
import { errorToHttpStatus } from 'src/shared/errors'
import { authService } from 'src/container'
import { provide } from 'src/shared/provide'

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV !== 'DEV',
  sameSite: env.NODE_ENV === 'STAGING' ? ('None' as const) : ('Lax' as const),
  path: '/',
}

const authRoute = new Hono()
  .basePath('/auth')
  .use(provide('auth', authService))
  .post(
    '/register',
    describeRoute({
      tags: ['Auth'],
      summary: 'Register',
      description:
        'Creates a new user account and starts a session. Sets a signed session cookie on success.',
      responses: {
        201: {
          description: 'User registered and session created',
          content: {
            'application/json': { schema: resolver(SessionPayloadSchema) },
          },
        },
        500: errResponse('Database or internal server error'),
      },
    }),
    validator(
      'json',
      type({
        username: 'string >= 3',
        password: 'string > 8',
      })
    ),
    async (ctx) => {
      const { username, password } = ctx.req.valid('json')
      const COOKIE_SECRET = env.COOKIE_SECRET

      const result = await ctx
        .get('auth')
        .registerUser(username, password)
        .andThen((credentials) =>
          ctx
            .get('sessionService')
            .create(credentials.id, credentials.username)
        )

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      const { sessionId, payload } = result.value
      await setSignedCookie(
        ctx,
        'session_id',
        sessionId,
        COOKIE_SECRET,
        SESSION_COOKIE_OPTIONS
      )

      return dto(SessionPayloadSchema, payload).match(
        (data) => ctx.json(data, 201),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/login',
    describeRoute({
      tags: ['Auth'],
      summary: 'Login',
      description:
        'Authenticates with username and password. Returns the existing session if a valid cookie is already present.',
      responses: {
        200: {
          description: 'Logged in and session created',
          content: {
            'application/json': { schema: resolver(SessionPayloadSchema) },
          },
        },
        401: errResponse('Invalid credentials'),
        404: errResponse('User not found'),
        500: errResponse('Database or internal server error'),
      },
    }),
    async (ctx, next) => {
      const COOKIE_SECRET = env.COOKIE_SECRET
      const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')

      if (!sessionId) {
        await next()
        return
      }

      const result = await ctx.get('sessionService').validate(sessionId)

      if (result.isErr()) {
        await next()
        return
      }

      return dto(SessionPayloadSchema, result.value).match(
        (data) => ctx.json(data, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    },
    validator(
      'json',
      type({
        username: 'string',
        password: 'string',
      })
    ),
    async (ctx) => {
      const { username, password } = ctx.req.valid('json')
      const COOKIE_SECRET = env.COOKIE_SECRET

      const result = await ctx
        .get('auth')
        .loginUser(username, password)
        .andThen((credentials) =>
          ctx
            .get('sessionService')
            .create(credentials.id, credentials.username)
        )

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      const { sessionId, payload } = result.value
      await setSignedCookie(
        ctx,
        'session_id',
        sessionId,
        COOKIE_SECRET,
        SESSION_COOKIE_OPTIONS
      )

      return dto(SessionPayloadSchema, payload).match(
        (data) => ctx.json(data, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get(
    '/me',
    describeRoute({
      tags: ['Auth'],
      summary: 'Get current user',
      description:
        'Returns the current session payload if authenticated.',
      responses: {
        200: {
          description: 'Current session payload',
          content: {
            'application/json': { schema: resolver(SessionPayloadSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
      },
    }),
    isAuth(),
    async (ctx) => {
      const payload = ctx.get('userPayload')
      return dto(SessionPayloadSchema, payload).match(
        (data) => ctx.json(data, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/logout',
    describeRoute({
      tags: ['Auth'],
      summary: 'Logout',
      description:
        'Destroys the current session and clears the session cookie. Requires authentication.',
      responses: {
        200: { description: 'Logged out' },
        401: errResponse('Missing or invalid session cookie'),
      },
    }),
    isAuth(),
    async (ctx) => {
      const COOKIE_SECRET = env.COOKIE_SECRET
      const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')

      if (sessionId) {
        await ctx.get('sessionService').delete(sessionId)
      }

      deleteCookie(ctx, 'session_id')
      return ctx.json({ success: true }, 200)
    }
  )

export default authRoute
