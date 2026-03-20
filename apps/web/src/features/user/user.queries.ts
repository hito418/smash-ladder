import { queryOptions } from '@tanstack/solid-query'
import { userApi } from './user.api'

export const userKeys = {
  profile: (username: string) => ['user', username] as const,
}

export const profileQueryOptions = (username: string) =>
  queryOptions({
    queryKey: userKeys.profile(username),
    queryFn: () => userApi.getProfile(username),
  })
