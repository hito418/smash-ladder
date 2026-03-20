import { createRouter as createTanstackSolidRouter } from '@tanstack/solid-router'
import type { QueryClient } from '@tanstack/solid-query'
import { routeTree } from './routeTree.gen'

export function createRouter() {
  const router = createTanstackSolidRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultErrorComponent: ({ error }) => (
      <div class="p-8 text-center">
        <h1 class="text-xl font-bold text-red-600">Something went wrong</h1>
        <p class="mt-2 text-neutral-500">{error.message}</p>
      </div>
    ),
    defaultNotFoundComponent: () => (
      <div class="p-8 text-center">
        <h1 class="text-xl font-bold">Page not found</h1>
      </div>
    ),
    context: { queryClient: undefined! },
  })

  return router
}

export const router = createRouter()

declare module '@tanstack/solid-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}

export type RouterContext = {
  queryClient: QueryClient
}
