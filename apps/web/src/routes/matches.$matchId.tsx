import { createFileRoute, Link } from '@tanstack/solid-router'
import { createQuery } from '@tanstack/solid-query'
import { For, Show } from 'solid-js'
import { meQueryOptions } from '../features/auth/auth.queries'
import { matchDetailsQueryOptions } from '../features/match/match.queries'
import type { Game, MatchDetail } from '../features/match/match.api'
import { computeScore } from '../features/match/match.utils'
import { ApiError } from '../lib/api'
import { Alert } from '@repo/ui'

export const Route = createFileRoute('/matches/$matchId')({
  component: MatchDetailsPage,
})

function MatchDetailsPage() {
  const params = Route.useParams()
  const match = createQuery(() => matchDetailsQueryOptions(params().matchId))

  return (
    <div class="mx-auto max-w-2xl space-y-6 p-4">
      <Show when={match.data} fallback={<p>Loading match...</p>}>
        {(data) => <MatchDetailsView match={data()} />}
      </Show>
      <Show when={match.isError}>
        <Alert variant="error">
          {match.error instanceof ApiError
            ? match.error.message
            : 'Failed to load match'}
        </Alert>
      </Show>
    </div>
  )
}

function MatchDetailsView(props: { match: MatchDetail }) {
  const me = createQuery(() => meQueryOptions())
  const userId = () => me.data?.sub.id ?? ''

  const score = () => computeScore(props.match)

  const isParticipant = () =>
    userId() === props.match.player1Id || userId() === props.match.player2Id

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Match Details</h1>
        <div class="text-lg font-mono">
          <Link
            to="/profile/$username"
            params={{ username: props.match.player1Username }}
            class="hover:underline"
          >
            {props.match.player1Username}
          </Link>{' '}
          {score().p1} - {score().p2}{' '}
          <Link
            to="/profile/$username"
            params={{ username: props.match.player2Username }}
            class="hover:underline"
          >
            {props.match.player2Username}
          </Link>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span
          class={`rounded px-2 py-1 text-sm font-medium ${
            props.match.status === 'COMPLETED'
              ? 'bg-neutral-100 text-neutral-600'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {props.match.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
        </span>
        <Show when={props.match.status === 'IN_PROGRESS' && isParticipant()}>
          <Link
            to="/match/$matchId"
            params={{ matchId: props.match.id }}
            class="text-sm text-amber-600 hover:underline"
          >
            Go to match
          </Link>
        </Show>
      </div>

      <Show when={props.match.games.length > 0}>
        <div class="space-y-3">
          <For each={props.match.games}>
            {(game) => <GameDetail game={game} match={props.match} />}
          </For>
        </div>
      </Show>
    </div>
  )
}

function GameDetail(props: { game: Game; match: MatchDetail }) {
  const winnerId = () => props.game.winnerId
  const winnerIsP1 = () => winnerId() === props.match.player1Id

  return (
    <div class="rounded border border-neutral-200 p-3 text-sm space-y-2">
      <div class="flex items-center justify-between">
        <span class="font-semibold">Game {props.game.gameNumber}</span>
        <span
          class={`rounded px-1.5 py-0.5 text-xs font-medium ${
            props.game.status === 'COMPLETED'
              ? 'bg-neutral-100 text-neutral-600'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {props.game.status.replace(/_/g, ' ')}
        </span>
      </div>

      <Show when={props.game.player1Character || props.game.player2Character}>
        <div class="flex gap-4 text-neutral-600">
          <span>
            <Link
              to="/profile/$username"
              params={{ username: props.match.player1Username }}
              class="hover:underline"
            >
              {props.match.player1Username}
            </Link>
            :{' '}
            <span class="font-medium">
              {props.game.player1Character ?? '—'}
            </span>
          </span>
          <span>vs</span>
          <span>
            <Link
              to="/profile/$username"
              params={{ username: props.match.player2Username }}
              class="hover:underline"
            >
              {props.match.player2Username}
            </Link>
            :{' '}
            <span class="font-medium">
              {props.game.player2Character ?? '—'}
            </span>
          </span>
        </div>
      </Show>

      <Show when={props.game.stage}>
        <p class="text-neutral-500">
          Stage: <span class="font-medium">{props.game.stage}</span>
        </p>
      </Show>

      <Show when={props.game.status === 'COMPLETED' && winnerId()}>
        <p>
          Winner:{' '}
          <Link
            to="/profile/$username"
            params={{
              username: winnerIsP1()
                ? props.match.player1Username
                : props.match.player2Username,
            }}
            class="font-semibold text-emerald-600 hover:underline"
          >
            {winnerIsP1()
              ? props.match.player1Username
              : props.match.player2Username}
          </Link>
        </p>
      </Show>

      <Show when={props.game.bans.length > 0}>
        <div class="text-xs text-neutral-400">
          Bans: {props.game.bans.map((b) => b.stage).join(', ')}
        </div>
      </Show>
    </div>
  )
}
