import { queryOptions } from '@tanstack/solid-query'
import { matchApi } from './match.api'

export const matchKeys = {
  all: ['matches'] as const,
  list: ['matches', 'list'] as const,
  detail: (matchId: string) => ['matches', matchId] as const,
  details: (matchId: string) => ['matches', matchId, 'details'] as const,
}

export const matchListQueryOptions = () =>
  queryOptions({
    queryKey: matchKeys.list,
    queryFn: () => matchApi.list(),
  })

export const matchQueryOptions = (matchId: string) =>
  queryOptions({
    queryKey: matchKeys.detail(matchId),
    queryFn: () => matchApi.getMatch(matchId),
  })

export const matchDetailsQueryOptions = (matchId: string) =>
  queryOptions({
    queryKey: matchKeys.details(matchId),
    queryFn: () => matchApi.getMatchDetails(matchId),
  })
