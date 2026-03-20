import { createFileRoute, Link } from '@tanstack/solid-router'
import { createQuery } from '@tanstack/solid-query'
import { For, Show } from 'solid-js'
import { profileQueryOptions } from '../features/user/user.queries'
import type { StatBlock, UserProfile } from '../features/user/user.api'
import { ApiError } from '../lib/api'
import { Alert } from '@repo/ui'

export const Route = createFileRoute('/profile/$username')({
  component: ProfilePage,
})

function ProfilePage() {
  const params = Route.useParams()
  const profile = createQuery(() => profileQueryOptions(params().username))

  return (
    <div class="mx-auto max-w-2xl space-y-6 p-6">
      <Show when={profile.data} fallback={<p class="text-sm text-slate-500">Loading profile...</p>}>
        {(data) => <ProfileView profile={data()} />}
      </Show>
      <Show when={profile.isError}>
        <Alert variant="error">
          {profile.error instanceof ApiError
            ? profile.error.message
            : 'Failed to load profile'}
        </Alert>
      </Show>
    </div>
  )
}

function ProfileView(props: { profile: UserProfile }) {
  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold">{props.profile.username}</h1>
        <p class="text-sm text-slate-500">
          Joined {new Date(props.profile.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <StatCard title="Sets" stats={props.profile.sets} />
        <StatCard title="Games" stats={props.profile.games} />
      </div>

      <Show when={props.profile.topCharacters.length > 0}>
        <div>
          <h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Top Characters
          </h2>
          <div class="space-y-1.5">
            <For each={props.profile.topCharacters}>
              {(char, i) => (
                <div class="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-slate-500">
                      #{i() + 1}
                    </span>
                    <span class="text-sm font-medium text-slate-200">{char.character}</span>
                  </div>
                  <div class="flex items-center gap-3 text-sm">
                    <span class="text-slate-500">{char.count} games</span>
                    <span class="font-mono font-semibold text-slate-300">
                      {char.percentage}%
                    </span>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <div>
        <h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Match History
        </h2>
        <Show
          when={props.profile.matches.length > 0}
          fallback={<p class="text-sm text-slate-500">No matches yet.</p>}
        >
          <div class="space-y-1.5">
            <For each={props.profile.matches}>
              {(match) => {
                const isP1 = () =>
                  match.player1Username === props.profile.username
                const won = () => {
                  if (match.status !== 'COMPLETED') return null
                  const matchUserId = isP1()
                    ? match.player1Id
                    : match.player2Id
                  return match.winnerId === matchUserId
                }

                return (
                  <Link
                    to="/matches/$matchId"
                    params={{ matchId: match.id }}
                    class="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2.5 text-sm transition-colors hover:border-slate-600"
                  >
                    <div class="flex items-center gap-2">
                      <span class="text-slate-400">
                        {match.player1Username} vs {match.player2Username}
                      </span>
                      <span
                        class={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          match.status === 'COMPLETED'
                            ? won()
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {match.status === 'COMPLETED'
                          ? won()
                            ? 'Won'
                            : 'Lost'
                          : 'In Progress'}
                      </span>
                    </div>
                    <span class="text-xs text-slate-500">
                      {new Date(match.created_at).toLocaleDateString()}
                    </span>
                  </Link>
                )
              }}
            </For>
          </div>
        </Show>
      </div>
    </div>
  )
}

function StatCard(props: { title: string; stats: StatBlock }) {
  return (
    <div class="rounded-lg border border-slate-700/50 bg-slate-800/60 p-4">
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {props.title}
      </h3>
      <div class="font-mono text-3xl font-bold">
        {props.stats.winRate}
        <span class="text-lg text-slate-500">%</span>
      </div>
      <div class="mt-1 flex gap-3 text-sm">
        <span class="text-emerald-400">{props.stats.wins}W</span>
        <span class="text-red-400">{props.stats.losses}L</span>
        <span class="text-slate-500">{props.stats.total} total</span>
      </div>
    </div>
  )
}
