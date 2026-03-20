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
    <div class="mx-auto max-w-2xl space-y-6 p-6">
      <Show
        when={match.data}
        fallback={<p class="text-sm text-slate-500">Loading match...</p>}
      >
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
      <Scoreboard match={props.match} score={score()} />

      <div class="flex items-center gap-3">
        <span
          class={`rounded px-2 py-1 text-xs font-medium ${
            props.match.status === 'COMPLETED'
              ? 'bg-slate-700/50 text-slate-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}
        >
          {props.match.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
        </span>
        <Show when={props.match.status === 'IN_PROGRESS' && isParticipant()}>
          <Link
            to="/match/$matchId"
            params={{ matchId: props.match.id }}
            class="text-sm text-cyan-400 hover:text-cyan-300"
          >
            Go to match
          </Link>
        </Show>
      </div>

      <Show when={props.match.games.length > 0}>
        <div class="space-y-2">
          <For each={props.match.games}>
            {(game) => <GameDetail game={game} match={props.match} />}
          </For>
        </div>
      </Show>
    </div>
  )
}

function Scoreboard(props: {
  match: MatchDetail
  score: { p1: number; p2: number }
}) {
  return (
    <div class="flex items-center justify-center gap-6 rounded-lg border border-slate-700/50 bg-slate-800/80 px-8 py-6">
      <Link
        to="/profile/$username"
        params={{ username: props.match.player1Username }}
        class="flex-1 text-right text-xl font-bold text-slate-200 transition-colors hover:text-cyan-400"
      >
        {props.match.player1Username}
      </Link>
      <div class="flex items-center gap-3 font-mono text-4xl font-bold">
        <span>{props.score.p1}</span>
        <span class="text-slate-600">&mdash;</span>
        <span>{props.score.p2}</span>
      </div>
      <Link
        to="/profile/$username"
        params={{ username: props.match.player2Username }}
        class="flex-1 text-xl font-bold text-slate-200 transition-colors hover:text-cyan-400"
      >
        {props.match.player2Username}
      </Link>
    </div>
  )
}

function GameDetail(props: { game: Game; match: MatchDetail }) {
  const winnerId = () => props.game.winnerId
  const winnerIsP1 = () => winnerId() === props.match.player1Id

  return (
    <div class="rounded-lg border border-slate-700/50 bg-slate-800/60 p-3 text-sm space-y-2">
      <div class="flex items-center justify-between">
        <span class="font-semibold text-slate-200">
          Game {props.game.gameNumber}
        </span>
        <span
          class={`rounded px-1.5 py-0.5 text-xs font-medium ${
            props.game.status === 'COMPLETED'
              ? 'bg-slate-700/50 text-slate-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}
        >
          {props.game.status.replace(/_/g, ' ')}
        </span>
      </div>

      <Show when={props.game.player1Character || props.game.player2Character}>
        <div class="flex gap-4 text-slate-400">
          <span>
            <Link
              to="/profile/$username"
              params={{ username: props.match.player1Username }}
              class="hover:text-cyan-400"
            >
              {props.match.player1Username}
            </Link>
            :{' '}
            <span class="font-medium text-slate-300">
              {props.game.player1Character ?? '—'}
            </span>
          </span>
          <span class="text-slate-600">vs</span>
          <span>
            <Link
              to="/profile/$username"
              params={{ username: props.match.player2Username }}
              class="hover:text-cyan-400"
            >
              {props.match.player2Username}
            </Link>
            :{' '}
            <span class="font-medium text-slate-300">
              {props.game.player2Character ?? '—'}
            </span>
          </span>
        </div>
      </Show>

      <Show when={props.game.stage}>
        <p class="text-slate-500">
          Stage:{' '}
          <span class="font-medium text-slate-400">{props.game.stage}</span>
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
            class="font-semibold text-emerald-400 hover:text-emerald-300"
          >
            {winnerIsP1()
              ? props.match.player1Username
              : props.match.player2Username}
          </Link>
        </p>
      </Show>

      <Show when={props.game.bans.length > 0}>
        <div class="text-xs text-slate-500">
          Bans: {props.game.bans.map((b) => b.stage).join(', ')}
        </div>
      </Show>
    </div>
  )
}
