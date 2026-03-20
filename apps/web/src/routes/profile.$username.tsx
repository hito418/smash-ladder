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
    <div class="mx-auto max-w-2xl space-y-6 p-4">
      <Show when={profile.data} fallback={<p>Loading profile...</p>}>
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
        <p class="text-sm text-neutral-500">
          Joined {new Date(props.profile.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <StatCard title="Sets" stats={props.profile.sets} />
        <StatCard title="Games" stats={props.profile.games} />
      </div>

      <Show when={props.profile.topCharacters.length > 0}>
        <div>
          <h2 class="mb-2 text-lg font-semibold">Top Characters</h2>
          <div class="space-y-2">
            <For each={props.profile.topCharacters}>
              {(char, i) => (
                <div class="flex items-center justify-between rounded border border-neutral-200 px-3 py-2">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-neutral-400">
                      #{i() + 1}
                    </span>
                    <span class="font-medium">{char.character}</span>
                  </div>
                  <div class="flex items-center gap-3 text-sm text-neutral-500">
                    <span>{char.count} games</span>
                    <span class="font-semibold text-neutral-700">
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
        <h2 class="mb-2 text-lg font-semibold">Match History</h2>
        <Show
          when={props.profile.matches.length > 0}
          fallback={<p class="text-sm text-neutral-500">No matches yet.</p>}
        >
          <div class="space-y-2">
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
                    class="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50 transition-colors"
                  >
                    <div class="flex items-center gap-2">
                      <span class="text-neutral-500">
                        {match.player1Username} vs {match.player2Username}
                      </span>
                      <span
                        class={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          match.status === 'COMPLETED'
                            ? won()
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {match.status === 'COMPLETED'
                          ? won()
                            ? 'Won'
                            : 'Lost'
                          : 'In Progress'}
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
    </div>
  )
}

function StatCard(props: { title: string; stats: StatBlock }) {
  return (
    <div class="rounded-lg border border-neutral-200 p-4">
      <h3 class="mb-2 text-sm font-semibold text-neutral-500">{props.title}</h3>
      <div class="text-3xl font-bold">
        {props.stats.winRate}
        <span class="text-lg text-neutral-400">%</span>
      </div>
      <div class="mt-1 flex gap-3 text-sm">
        <span class="text-emerald-600">{props.stats.wins}W</span>
        <span class="text-red-500">{props.stats.losses}L</span>
        <span class="text-neutral-400">{props.stats.total} total</span>
      </div>
    </div>
  )
}
