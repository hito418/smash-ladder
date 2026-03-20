import { Alert, Button, FormField, Input } from '@repo/ui'
import { createMutation, useQueryClient } from '@tanstack/solid-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/solid-router'
import { createSignal, Show } from 'solid-js'
import { authApi } from '../../features/auth/auth.api'
import { authKeys } from '../../features/auth/auth.queries'
import { ApiError } from '../../lib/api'
import { type } from 'arktype'

export const Route = createFileRoute('/_guest/login')({
  validateSearch: type({
    redirect: 'string?',
  }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const search = Route.useSearch()
  const [username, setUsername] = createSignal('')
  const [password, setPassword] = createSignal('')

  const login = createMutation(() => ({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.me, data)
      navigate({ to: search().redirect ?? '/' })
    },
  }))

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault()
    if (login.isPending) return
    login.mutate({ username: username(), password: password() })
  }

  return (
    <div class="mx-auto max-w-sm space-y-6 p-6">
      <h1 class="text-xl font-bold">Login</h1>

      <Show when={login.isError}>
        <Alert variant="error">
          {login.error instanceof ApiError
            ? login.error.message
            : 'Something went wrong'}
        </Alert>
      </Show>

      <form onSubmit={handleSubmit} class="space-y-4">
        <FormField id="username" label="Username">
          <Input
            id="username"
            type="text"
            autocomplete="username"
            value={username()}
            onInput={(e) => setUsername(e.currentTarget.value)}
            required
            minLength={3}
          />
        </FormField>

        <FormField id="password" label="Password">
          <Input
            id="password"
            type="password"
            autocomplete="current-password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            required
            minLength={9}
          />
        </FormField>

        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? 'Logging in...' : 'Login'}
        </Button>
      </form>

      <p class="text-sm text-slate-400">
        Don't have an account?{' '}
        <Link to="/register" class="text-cyan-400 hover:text-cyan-300">
          Register
        </Link>
      </p>
    </div>
  )
}
