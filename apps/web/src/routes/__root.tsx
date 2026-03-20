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
    <>
      <nav class="flex items-center justify-between border-b px-4 py-2">
        <Link to="/" class="font-bold">
          Smash Ladder
        </Link>

        <Show
          when={me.data}
          fallback={
            <div class="flex gap-2">
              <Link to="/login" activeProps={{ class: 'text-amber-500' }}>
                Login
              </Link>
              <Link to="/register" activeProps={{ class: 'text-amber-500' }}>
                Register
              </Link>
            </div>
          }
        >
          {(user) => (
            <div class="flex items-center gap-3">
              <Link
                to="/profile/$username"
                params={{ username: user().username }}
                class="text-sm hover:underline"
              >
                {user().username}
              </Link>
              <button
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                class="cursor-pointer text-sm text-red-500 hover:underline"
              >
                Logout
              </button>
            </div>
          )}
        </Show>
      </nav>

      <Suspense>
        <Outlet />
      </Suspense>
    </>
  )
}
