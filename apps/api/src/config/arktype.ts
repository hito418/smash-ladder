import { configure } from 'arktype/config'

configure({
  toJsonSchema: {
    fallback: {
      date: (ctx) => ({
        ...ctx.base,
        type: 'string',
        format: 'date-time',
      }),
      morph: (ctx) => ({
        ...ctx.base,
      }),
      predicate: (ctx) => ({ ...ctx.base }),
    },
  },
})
