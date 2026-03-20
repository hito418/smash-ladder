import {
  matchQuery,
  MutationCache,
  QueryCache,
  QueryClient,
  type QueryKey,
} from '@tanstack/solid-query'
import { ApiError } from './api'
import { authKeys } from '../features/auth/auth.queries'

declare module '@tanstack/solid-query' {
  interface Register {
    mutationMeta: {
      invalidates?: Array<QueryKey>
    }
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 60 * 5,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        queryClient.setQueryData(authKeys.me, null)
      }
    },
  }),
  mutationCache: new MutationCache({
    onSuccess: (_data, _vars, _ctx, mutation) => {
      const invalidates = mutation.meta?.invalidates
      if (!invalidates) return

      queryClient.invalidateQueries({
        predicate: (query) =>
          invalidates.some((queryKey) =>
            matchQuery({ queryKey }, query)
          ),
      })
    },
  }),
})
