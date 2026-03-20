import { queryOptions } from '@tanstack/solid-query'
import { authApi } from './auth.api'
import { ApiError } from '../../lib/api'

export const authKeys = {
  me: ['auth', 'me'] as const,
}

export const meQueryOptions = () =>
  queryOptions({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        return await authApi.me()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null
        }
        throw error
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  })
