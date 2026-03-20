import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useNavigate,
} from '@tanstack/solid-router'
import {
  createMutation,
  createQuery,
  useQueryClient,
} from '@tanstack/solid-query'
import { Show, Suspense } from 'solid-js'
import { authApi } from '../features/auth/auth.api'
import { authKeys, meQueryOptions } from '../features/auth/auth.queries'
import type { RouterContext } from '../router'
import Home from 'lucide-solid/icons/home'
import User from 'lucide-solid/icons/user'
import LogIn from 'lucide-solid/icons/log-in'
import LogOut from 'lucide-solid/icons/log-out'
import UserPlus from 'lucide-solid/icons/user-plus'

const NAV_SHARED =
  'flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors'
const NAV_ACTIVE = 'bg-slate-800 text-cyan-400'
const NAV_INACTIVE = 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = createQuery(() => meQueryOptions())

  const logout = createMutation(() => ({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me, null)
      navigate({ to: '/' })
    },
  }))

  return (
    <div class="flex h-screen">
      <aside class="flex w-52 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
        <div class="px-4 py-5">
          <Link to="/" class="text-lg font-bold tracking-tight">
            Smash<span class="text-cyan-400">Ladder</span>
          </Link>
        </div>

        <nav class="flex-1 space-y-1 px-2">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            class={NAV_SHARED}
            activeProps={{ class: NAV_ACTIVE }}
            inactiveProps={{ class: NAV_INACTIVE }}
          >
            <Home size={16} />
            Home
          </Link>

          <Show when={me.data}>
            {(user) => (
              <Link
                to="/profile/$username"
                params={{ username: user().username }}
                class={NAV_SHARED}
                activeProps={{ class: NAV_ACTIVE }}
                inactiveProps={{ class: NAV_INACTIVE }}
              >
                <User size={16} />
                Profile
              </Link>
            )}
          </Show>
        </nav>

        <div class="border-t border-slate-800 p-3">
          <Show
            when={me.data}
            fallback={
              <div class="space-y-1">
                <Link
                  to="/login"
                  class={NAV_SHARED}
                  activeProps={{ class: NAV_ACTIVE }}
                  inactiveProps={{ class: NAV_INACTIVE }}
                >
                  <LogIn size={16} />
                  Login
                </Link>
                <Link
                  to="/register"
                  class={NAV_SHARED}
                  activeProps={{ class: NAV_ACTIVE }}
                  inactiveProps={{ class: NAV_INACTIVE }}
                >
                  <UserPlus size={16} />
                  Register
                </Link>
              </div>
            }
          >
            {(user) => (
              <div class="space-y-2">
                <div class="truncate px-3 text-sm font-medium text-slate-300">
                  {user().username}
                </div>
                <button
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                  class="flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-red-400"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </Show>
        </div>
      </aside>

      <main class="flex-1 overflow-y-auto">
        <Suspense>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
