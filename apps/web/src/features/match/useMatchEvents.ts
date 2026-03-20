import { createEffect, onCleanup } from 'solid-js'
import type { Accessor } from 'solid-js'
import { useQueryClient } from '@tanstack/solid-query'
import { matchKeys } from './match.queries'
import { BASE_URL } from '../../lib/api'

const MATCH_EVENTS = [
  'character_selected',
  'stage_banned',
  'stage_picked',
  'report_submitted',
  'report_conflict',
  'next_game',
  'match_completed',
] as const

export function useMatchEvents(matchId: Accessor<string>) {
  const queryClient = useQueryClient()

  createEffect(() => {
    const id = matchId()
    const source = new EventSource(`${BASE_URL}/matches/${id}/events`, {
      withCredentials: true,
    })

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: matchKeys.details(id) })
    }

    for (const event of MATCH_EVENTS) {
      source.addEventListener(event, invalidate)
    }

    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        invalidate()
      }
    }

    onCleanup(() => source.close())
  })
}
