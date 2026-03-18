import { createMiddleware } from 'hono/factory'

export function provide<K extends string, V>(key: K, value: V) {
  return createMiddleware<{ Variables: Record<K, V> }>(async (ctx, next) => {
    ctx.set(key, value)
    await next()
  })
}
