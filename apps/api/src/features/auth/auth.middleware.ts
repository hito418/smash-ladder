import { getSignedCookie } from 'hono/cookie'
import type { MiddlewareHandler } from 'hono'
import type { SessionPayload } from './session.service'
import { env } from 'src/shared/env'

export const isAuth: () => MiddlewareHandler<{
  Variables: { userPayload: SessionPayload }
}> = function () {
  return async (ctx, next) => {
    const sessionId = await getSignedCookie(
      ctx,
      env.COOKIE_SECRET,
      'session_id'
    )

    if (!sessionId) {
      return ctx.json({ message: 'Unauthorized' }, 401)
    }

    const session = ctx.get('sessionService')
    const result = await session.validate(sessionId)

    if (result.isErr()) {
      return ctx.json({ message: result.error.message }, 401)
    }

    ctx.set('userPayload', result.value)

    await next()
  }
}

export const optionalAuth: () => MiddlewareHandler<{
  Variables: { userPayload: SessionPayload | null }
}> = function () {
  return async (ctx, next) => {
    const sessionId = await getSignedCookie(
      ctx,
      env.COOKIE_SECRET,
      'session_id'
    )

    if (sessionId) {
      const session = ctx.get('sessionService')
      const result = await session.validate(sessionId)

      if (result.isOk()) {
        ctx.set('userPayload', result.value)
        return next()
      }
    }

    ctx.set('userPayload', null)
    await next()
  }
}
