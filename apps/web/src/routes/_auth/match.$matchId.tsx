import { Alert, Button } from '@repo/ui'
import {
  createMutation,
  createQuery,
  useQueryClient,
} from '@tanstack/solid-query'
import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, For, Match, Show, Switch } from 'solid-js'
import { meQueryOptions } from '../../features/auth/auth.queries'
import type { Game, MatchDetail } from '../../features/match/match.api'
import { matchApi } from '../../features/match/match.api'
import {
  matchKeys,
  matchQueryOptions,
} from '../../features/match/match.queries'
import { computeScore } from '../../features/match/match.utils'
import { useMatchEvents } from '../../features/match/useMatchEvents'
import { ApiError } from '../../lib/api'

const CHARACTERS = [
  'Mario',
  'Donkey Kong',
  'Link',
  'Samus',
  'Yoshi',
  'Kirby',
  'Fox',
  'Pikachu',
  'Luigi',
  'Ness',
  'Captain Falcon',
  'Jigglypuff',
  'Peach',
  'Bowser',
  'Zelda',
  'Sheik',
  'Marth',
  'Mr. Game & Watch',
  'Meta Knight',
  'Pit',
  'Wario',
  'Snake',
  'Ike',
  'Diddy Kong',
  'Lucas',
  'Sonic',
  'Lucario',
  'R.O.B.',
  'Villager',
  'Greninja',
  'Palutena',
  'Cloud',
  'Joker',
  'Steve',
  'Kazuya',
]

const STAGES = [
  'Battlefield',
  'Final Destination',
  'Smashville',
  'Town & City',
  'Pokemon Stadium 2',
  'Kalos Pokemon League',
  'Hollow Bastion',
]

export const Route = createFileRoute('/_auth/match/$matchId')({
  component: MatchPage,
})

function MatchPage() {
  const params = Route.useParams()
  const match = createQuery(() => matchQueryOptions(params().matchId))

  useMatchEvents(() => params().matchId)

  return (
    <div class="mx-auto max-w-4xl space-y-6 p-4">
      <Show when={match.data} fallback={<p>Loading match...</p>}>
        {(data) => <MatchView match={data()} />}
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

function MatchView(props: { match: MatchDetail }) {
  const me = createQuery(() => meQueryOptions())
  const userId = () => me.data?.sub.id ?? ''
  const isPlayer1 = () => userId() === props.match.player1Id

  const currentGame = () => {
    const games = props.match.games
    return games[games.length - 1]
  }

  const score = () => computeScore(props.match)

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Match</h1>
        <div class="text-lg font-mono">
          <span class={isPlayer1() ? 'text-amber-500 font-bold' : ''}>
            {props.match.player1Username}
          </span>{' '}
          {score().p1} - {score().p2}{' '}
          <span class={!isPlayer1() ? 'text-amber-500 font-bold' : ''}>
            {props.match.player2Username}
          </span>
        </div>
      </div>

      <Switch>
        <Match when={props.match.status === 'COMPLETED'}>
          <MatchComplete match={props.match} userId={userId()} />
        </Match>
        <Match when={currentGame()}>
          {(game) => (
            <>
              <GamePhase
                game={game()}
                match={props.match}
                userId={userId()}
                isPlayer1={isPlayer1()}
              />
              <ForfeitButton matchId={props.match.id} />
            </>
          )}
        </Match>
      </Switch>
    </div>
  )
}

function GamePhase(props: {
  game: Game
  match: MatchDetail
  userId: string
  isPlayer1: boolean
}) {
  return (
    <div class="space-y-4">
      <h2 class="text-lg font-semibold">
        Game {props.game.gameNumber}
        <span class="ml-2 text-sm font-normal text-neutral-500">
          {props.game.status.replace(/_/g, ' ')}
        </span>
      </h2>

      <Switch>
        <Match when={props.game.status === 'CHARACTER_SELECT'}>
          <CharacterSelect
            game={props.game}
            match={props.match}
            userId={props.userId}
            isPlayer1={props.isPlayer1}
          />
        </Match>
        <Match when={props.game.status === 'MAP_BAN'}>
          <MapBan
            game={props.game}
            match={props.match}
            userId={props.userId}
            isPlayer1={props.isPlayer1}
          />
        </Match>
        <Match when={props.game.status === 'STAGE_PICK'}>
          <StagePick
            game={props.game}
            match={props.match}
            userId={props.userId}
          />
        </Match>
        <Match when={props.game.status === 'RESULT_PENDING'}>
          <ResultPending
            game={props.game}
            match={props.match}
            userId={props.userId}
            isPlayer1={props.isPlayer1}
          />
        </Match>
        <Match when={props.game.status === 'COMPLETED'}>
          <GameCompleted
            game={props.game}
            match={props.match}
            userId={props.userId}
          />
        </Match>
      </Switch>
    </div>
  )
}

function CharacterSelect(props: {
  game: Game
  match: MatchDetail
  userId: string
  isPlayer1: boolean
}) {
  const queryClient = useQueryClient()
  const [error, setError] = createSignal('')

  const myPick = () =>
    props.isPlayer1 ? props.game.player1Character : props.game.player2Character

  const opponentPick = () =>
    props.isPlayer1 ? props.game.player2Character : props.game.player1Character

  // Games 2+: loser picks first, winner waits
  const prevGameWinner = () => {
    if (props.game.gameNumber <= 1) return null
    const prev = props.match.games.find(
      (g) => g.gameNumber === props.game.gameNumber - 1
    )
    return prev?.winnerId ?? null
  }
  const isWinner = () => prevGameWinner() === props.userId
  const mustWait = () => isWinner() && !opponentPick()

  const selectChar = createMutation(() => ({
    mutationFn: (character: string) =>
      matchApi.selectCharacter(props.match.id, character),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: matchKeys.detail(props.match.id),
      })
    },
    onError: (err: Error) => {
      setError(
        err instanceof ApiError ? err.message : 'Failed to select character'
      )
    },
  }))

  return (
    <div class="space-y-4">
      <Show when={props.game.gameNumber > 1 && opponentPick()}>
        <p class="text-sm text-neutral-500">
          Opponent picked: <span class="font-semibold">{opponentPick()}</span>
        </p>
      </Show>

      <Show when={myPick()}>
        <Alert variant="info">
          You picked <span class="font-semibold">{myPick()}</span>. Waiting for
          opponent...
        </Alert>
      </Show>

      <Show when={mustWait() && !myPick()}>
        <Alert variant="info">Waiting for opponent to pick first...</Alert>
      </Show>

      <Show when={error()}>
        <Alert variant="error">{error()}</Alert>
      </Show>

      <Show when={!myPick() && !mustWait()}>
        <CharacterPicker
          onPick={(char) => selectChar.mutate(char)}
          isPending={selectChar.isPending}
        />
      </Show>
    </div>
  )
}

function CharacterPicker(props: {
  onPick: (char: string) => void
  isPending: boolean
}) {
  const [selected, setSelected] = createSignal('')
  return (
    <div class="flex items-end gap-2">
      <div class="flex-1">
        <label
          for="character"
          class="mb-1 block text-sm text-neutral-500"
        >
          Select your character
        </label>
        <select
          id="character"
          value={selected()}
          onChange={(e) => setSelected(e.currentTarget.value)}
          disabled={props.isPending}
          class="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Choose...</option>
          <For each={CHARACTERS}>
            {(char) => <option value={char}>{char}</option>}
          </For>
        </select>
      </div>
      <Button
        disabled={!selected() || props.isPending}
        onClick={() => props.onPick(selected())}
      >
        {props.isPending ? 'Picking...' : 'Confirm'}
      </Button>
    </div>
  )
}

function MapBan(props: {
  game: Game
  match: MatchDetail
  userId: string
  isPlayer1: boolean
}) {
  const queryClient = useQueryClient()
  const [error, setError] = createSignal('')

  const bannedStages = () => props.game.bans.map((b) => b.stage)
  const totalBans = () => props.game.bans.length

  const isFirstGame = () => props.game.gameNumber === 1
  const isFirstBanner = () => props.userId === props.game.firstBannerId
  // Game 1: first banner bans 3, second bans 2. Games 2+: winner bans 3 only.
  const maxBans = () => (isFirstGame() ? 5 : 3)

  const myTurn = () => {
    const bans = totalBans()
    if (bans >= maxBans()) return false
    if (isFirstGame()) {
      return bans < 3 ? isFirstBanner() : !isFirstBanner()
    }
    // Games 2+: only the first banner (winner) bans
    return isFirstBanner()
  }

  const ban = createMutation(() => ({
    mutationFn: (stage: string) => matchApi.banStage(props.match.id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: matchKeys.detail(props.match.id),
      })
    },
    onError: (err: Error) => {
      setError(err instanceof ApiError ? err.message : 'Failed to ban stage')
    },
  }))

  const banPhaseLabel = () => {
    const bans = totalBans()
    if (isFirstGame()) {
      if (bans < 3)
        return `${isFirstBanner() ? 'Your' : "Opponent's"} bans (${bans}/3)`
      return `${!isFirstBanner() ? 'Your' : "Opponent's"} bans (${bans - 3}/2)`
    }
    return `${isFirstBanner() ? 'Your' : "Opponent's"} bans (${bans}/3)`
  }

  return (
    <div class="space-y-4">
      <p class="text-sm font-semibold">
        Characters: {props.game.player1Character} vs{' '}
        {props.game.player2Character}
      </p>

      <p class="text-sm text-neutral-500">
        {banPhaseLabel()}
        {myTurn() ? ' — Your turn to ban!' : ' — Waiting for opponent...'}
      </p>

      <Show when={error()}>
        <Alert variant="error">{error()}</Alert>
      </Show>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <For each={STAGES}>
          {(stage) => {
            const isBanned = () => bannedStages().includes(stage)
            return (
              <button
                aria-label={isBanned() ? `${stage} (banned)` : `Ban ${stage}`}
                class={`rounded border px-3 py-4 text-sm transition-colors ${
                  isBanned()
                    ? 'border-neutral-200 bg-neutral-100 text-neutral-400 line-through'
                    : myTurn()
                      ? 'border-neutral-300 hover:border-red-400 hover:bg-red-50 cursor-pointer'
                      : 'border-neutral-300 cursor-default'
                }`}
                disabled={isBanned() || !myTurn() || ban.isPending}
                onClick={() => ban.mutate(stage)}
              >
                {stage}
              </button>
            )
          }}
        </For>
      </div>
    </div>
  )
}

function StagePick(props: { game: Game; match: MatchDetail; userId: string }) {
  const queryClient = useQueryClient()
  const [error, setError] = createSignal('')

  const bannedStages = () => props.game.bans.map((b) => b.stage)
  const remainingStages = () =>
    STAGES.filter((s) => !bannedStages().includes(s))
  // Game 1: first banner picks. Games 2+: second banner (loser) picks.
  const isPicker = () =>
    props.game.gameNumber === 1
      ? props.userId === props.game.firstBannerId
      : props.userId !== props.game.firstBannerId

  const pick = createMutation(() => ({
    mutationFn: (stage: string) => matchApi.pickStage(props.match.id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: matchKeys.detail(props.match.id),
      })
    },
    onError: (err: Error) => {
      setError(err instanceof ApiError ? err.message : 'Failed to pick stage')
    },
  }))

  return (
    <div class="space-y-4">
      <p class="text-sm font-semibold">
        Characters: {props.game.player1Character} vs{' '}
        {props.game.player2Character}
      </p>

      <p class="text-sm text-neutral-500">
        {isPicker()
          ? `Pick a stage from the remaining ${remainingStages().length}!`
          : 'Waiting for opponent to pick a stage...'}
      </p>

      <Show when={error()}>
        <Alert variant="error">{error()}</Alert>
      </Show>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <For each={STAGES}>
          {(stage) => {
            const isBanned = () => bannedStages().includes(stage)
            const isRemaining = () => remainingStages().includes(stage)
            return (
              <button
                aria-label={isBanned() ? `${stage} (banned)` : `Pick ${stage}`}
                class={`rounded border px-3 py-4 text-sm transition-colors ${
                  isBanned()
                    ? 'border-neutral-200 bg-neutral-100 text-neutral-400 line-through'
                    : isPicker() && isRemaining()
                      ? 'border-emerald-300 bg-emerald-50 hover:border-emerald-500 hover:bg-emerald-100 cursor-pointer font-semibold'
                      : 'border-neutral-300 cursor-default'
                }`}
                disabled={
                  isBanned() || !isPicker() || !isRemaining() || pick.isPending
                }
                onClick={() => pick.mutate(stage)}
              >
                {stage}
              </button>
            )
          }}
        </For>
      </div>
    </div>
  )
}

function ResultPending(props: {
  game: Game
  match: MatchDetail
  userId: string
  isPlayer1: boolean
}) {
  const queryClient = useQueryClient()
  const [error, setError] = createSignal('')
  const [conflict, setConflict] = createSignal(false)

  const myReport = () =>
    props.isPlayer1 ? props.game.player1Report : props.game.player2Report

  const report = createMutation(() => ({
    mutationFn: (winnerId: string) =>
      matchApi.reportWinner(props.match.id, winnerId),
    onSuccess: (data) => {
      if (data.conflict) setConflict(true)
      queryClient.invalidateQueries({
        queryKey: matchKeys.detail(props.match.id),
      })
    },
    onError: (err: Error) => {
      setError(err instanceof ApiError ? err.message : 'Failed to report')
    },
  }))

  return (
    <div class="space-y-4">
      <p class="text-sm">
        Stage: <span class="font-semibold">{props.game.stage}</span> |{' '}
        {props.game.player1Character} vs {props.game.player2Character}
      </p>

      <Show when={conflict()}>
        <Alert variant="warning">
          Reports conflicted. Please report again.
        </Alert>
      </Show>

      <Show when={error()}>
        <Alert variant="error">{error()}</Alert>
      </Show>

      <Show
        when={!myReport()}
        fallback={
          <Alert variant="info">Waiting for opponent to report...</Alert>
        }
      >
        <p class="font-semibold">Who won this game?</p>
        <div class="flex gap-3">
          <Button
            disabled={report.isPending}
            onClick={() => report.mutate(props.userId)}
          >
            I won
          </Button>
          <Button
            color="secondary"
            disabled={report.isPending}
            onClick={() =>
              report.mutate(
                props.isPlayer1 ? props.match.player2Id : props.match.player1Id
              )
            }
          >
            Opponent won
          </Button>
        </div>
      </Show>
    </div>
  )
}

function GameCompleted(props: {
  game: Game
  match: MatchDetail
  userId: string
}) {
  const iWon = () => props.game.winnerId === props.userId

  return (
    <div class="rounded border border-neutral-200 p-3 text-sm">
      <p>
        Game {props.game.gameNumber}: {props.game.player1Character} vs{' '}
        {props.game.player2Character} on {props.game.stage}
        {' — '}
        <span class={iWon() ? 'text-emerald-600 font-bold' : 'text-red-500'}>
          {iWon() ? 'You won' : 'You lost'}
        </span>
      </p>
    </div>
  )
}

function ForfeitButton(props: { matchId: string }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = createSignal(false)
  const [error, setError] = createSignal('')

  const forfeit = createMutation(() => ({
    mutationFn: () => matchApi.forfeit(props.matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: matchKeys.detail(props.matchId),
      })
    },
    onError: (err: Error) => {
      setError(err instanceof ApiError ? err.message : 'Failed to forfeit')
    },
  }))

  return (
    <div class="border-t border-neutral-200 pt-4">
      <Show when={error()}>
        <Alert variant="error">{error()}</Alert>
      </Show>
      <Show
        when={confirming()}
        fallback={
          <button
            class="text-sm text-red-500 hover:underline cursor-pointer"
            onClick={() => setConfirming(true)}
          >
            Forfeit match
          </button>
        }
      >
        <div class="flex items-center gap-3">
          <span class="text-sm text-red-600">Are you sure?</span>
          <Button
            size="sm"
            color="primary"
            disabled={forfeit.isPending}
            onClick={() => forfeit.mutate()}
          >
            {forfeit.isPending ? 'Forfeiting...' : 'Yes, forfeit'}
          </Button>
          <button
            class="text-sm text-neutral-500 hover:underline cursor-pointer"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </button>
        </div>
      </Show>
    </div>
  )
}

function MatchComplete(props: { match: MatchDetail; userId: string }) {
  const iWon = () => props.match.winnerId === props.userId
  const score = () => computeScore(props.match)

  return (
    <div class="space-y-4 text-center">
      <div
        class={`rounded-lg p-8 ${
          iWon()
            ? 'bg-emerald-50 border border-emerald-200'
            : 'bg-red-50 border border-red-200'
        }`}
      >
        <h2
          class={`text-3xl font-bold ${iWon() ? 'text-emerald-600' : 'text-red-500'}`}
        >
          {iWon() ? 'Victory!' : 'Defeat'}
        </h2>
        <p class="mt-2 text-lg font-mono">
          {score().p1} - {score().p2}
        </p>
      </div>

      <div class="space-y-2">
        <For each={props.match.games.filter((g) => g.status === 'COMPLETED')}>
          {(game) => (
            <GameCompleted
              game={game}
              match={props.match}
              userId={props.userId}
            />
          )}
        </For>
      </div>
    </div>
  )
}
