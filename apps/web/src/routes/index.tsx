import { createFileRoute, Link, useNavigate } from '@tanstack/solid-router'
import {
  createMutation,
  createQuery,
  useQueryClient,
} from '@tanstack/solid-query'
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js'
import { meQueryOptions } from '../features/auth/auth.queries'
import { matchListQueryOptions } from '../features/match/match.queries'
import { ApiError, BASE_URL, api } from '../lib/api'
import { Alert, Button } from '@repo/ui'

type MatchmakingStatus =
  | { status: 'IDLE' }
  | { status: 'IN_QUEUE'; joinedAt: string }
  | { status: 'MATCHED'; matchId: string; opponentId: string }

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const me = createQuery(() => meQueryOptions())

  return (
    <div class="mx-auto max-w-sm space-y-6 pt-12">
      <h1 class="text-2xl font-bold">Smash Ladder</h1>

      <Show when={me.data}>
        <Matchmaking />
      </Show>

      <Show when={!me.data && !me.isLoading}>
        <div class="rounded border border-neutral-200 p-4 text-center space-y-2">
          <p class="text-sm text-neutral-500">
            Log in to find matches and play.
          </p>
          <div class="flex justify-center gap-2">
            <Link to="/login">
              <Button>Login</Button>
            </Link>
            <Link to="/register">
              <Button color="secondary">Register</Button>
            </Link>
          </div>
        </div>
      </Show>

      <MatchList />
    </div>
  )
}

function Matchmaking() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = createSignal('')

  const status = createQuery(() => ({
    queryKey: ['matchmaking', 'status'],
    queryFn: () => api<MatchmakingStatus>('/matchmaking/status'),
  }))

  const joinQueue = createMutation(() => ({
    mutationFn: () =>
      api<{ status: string; matchId?: string }>('/matchmaking/join', {
        method: 'POST',
      }),
    onSuccess: (data) => {
      if (data.status === 'MATCHED' && data.matchId) {
        navigate({ to: '/match/$matchId', params: { matchId: data.matchId } })
      } else {
        queryClient.invalidateQueries({ queryKey: ['matchmaking', 'status'] })
      }
    },
    onError: (err: Error) => {
      setError(err instanceof ApiError ? err.message : 'Failed to join queue')
    },
  }))

  const leaveQueue = createMutation(() => ({
    mutationFn: () =>
      api<{ success: boolean }>('/matchmaking/leave', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchmaking', 'status'] })
    },
    onError: (err: Error) => {
      setError(err instanceof ApiError ? err.message : 'Failed to leave queue')
    },
  }))

  const setupSSE = () => {
    const source = new EventSource(`${BASE_URL}/matchmaking/events`, {
      withCredentials: true,
    })

    source.addEventListener('match_found', (event) => {
      try {
        const data = JSON.parse(event.data) as { matchId: string }
        navigate({ to: '/match/$matchId', params: { matchId: data.matchId } })
      } catch (err) {
        console.error('Failed to parse match_found event:', err)
        setError('Match found but failed to process. Please refresh.')
      }
    })

    onCleanup(() => source.close())
  }

  createEffect(() => {
    const d = status.data
    if (!d) return
    if (d.status === 'MATCHED' && 'matchId' in d) {
      navigate({ to: '/match/$matchId', params: { matchId: d.matchId } })
    }
    if (d.status === 'IN_QUEUE') {
      setupSSE()
    }
  })

  return (
    <div class="space-y-4">
      <Show when={error()}>
        <Alert variant="error">{error()}</Alert>
      </Show>

      <Show when={status.data}>
        {(data) => (
          <>
            <Show when={data().status === 'MATCHED'}>
              <p>Redirecting to match...</p>
            </Show>

            <Show when={data().status === 'IN_QUEUE'}>
              <div class="rounded border border-amber-200 bg-amber-50 p-4 text-center">
                <p class="font-semibold text-amber-700">
                  Searching for opponent...
                </p>
                <div class="mt-3">
                  <Button
                    color="secondary"
                    disabled={leaveQueue.isPending}
                    onClick={() => leaveQueue.mutate()}
                  >
                    {leaveQueue.isPending ? 'Leaving...' : 'Leave Queue'}
                  </Button>
                </div>
              </div>
            </Show>

            <Show when={data().status === 'IDLE'}>
              <Button
                disabled={joinQueue.isPending}
                onClick={() => joinQueue.mutate()}
              >
                {joinQueue.isPending ? 'Joining...' : 'Find Match'}
              </Button>
            </Show>
          </>
        )}
      </Show>
    </div>
  )
}

function MatchList() {
  const me = createQuery(() => meQueryOptions())
  const matches = createQuery(() => matchListQueryOptions())
  const userId = () => me.data?.sub.id ?? ''

  return (
    <div class="space-y-3">
      <h2 class="text-lg font-bold">Matches</h2>

      <Show when={matches.isLoading}>
        <p class="text-sm text-neutral-500">Loading...</p>
      </Show>

      <Show when={matches.data?.length === 0}>
        <p class="text-sm text-neutral-500">No matches yet.</p>
      </Show>

      <Show when={matches.data && matches.data.length > 0}>
        <div class="space-y-2">
          <For each={matches.data}>
            {(match) => {
              const isParticipant = () =>
                match.player1Id === userId() || match.player2Id === userId()
              const iWon = () => match.winnerId === userId()
              const isPlaying = () =>
                match.status === 'IN_PROGRESS' && isParticipant()

              return (
                <Link
                  to={isPlaying() ? '/match/$matchId' : '/matches/$matchId'}
                  params={{ matchId: match.id }}
                  class="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50 transition-colors"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-neutral-500">
                      {match.player1Username} vs {match.player2Username}
                    </span>
                    <span
                      class={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        match.status === 'COMPLETED'
                          ? isParticipant()
                            ? iWon()
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                            : 'bg-neutral-100 text-neutral-600'
                          : match.status === 'IN_PROGRESS'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {match.status === 'COMPLETED'
                        ? isParticipant()
                          ? iWon()
                            ? 'Won'
                            : 'Lost'
                          : 'Completed'
                        : match.status === 'IN_PROGRESS'
                          ? 'In Progress'
                          : match.status}
                    </span>
                  </div>
                  <span class="text-xs text-neutral-400">
                    {new Date(match.created_at).toLocaleDateString()}
                  </span>
                </Link>
              )
            }}
          </For>
        </div>
      </Show>
    </div>
  )
}
