import { Hono } from 'hono'
import { describeRoute, resolver } from 'hono-openapi'
import { UserProfileSchema } from 'src/features/user/user.dto'
import { dto, errResponse } from 'src/shared/response-schemas'
import { errorToHttpStatus } from 'src/shared/errors'
import { userService } from 'src/container'
import { provide } from 'src/shared/provide'

const usersRoute = new Hono()
  .basePath('/users')
  .use(provide('userService', userService))
  .get(
    '/:username',
    describeRoute({
      tags: ['Users'],
      summary: 'Get user profile and stats',
      responses: {
        200: {
          description: 'User profile',
          content: {
            'application/json': { schema: resolver(UserProfileSchema) },
          },
        },
        404: errResponse('User not found'),
      },
    }),
    async (ctx) => {
      const username = ctx.req.param('username')
      const result = await ctx.get('userService').getProfile(username)

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      return dto(UserProfileSchema, result.value).match(
        (data) => ctx.json(data, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default usersRoute
