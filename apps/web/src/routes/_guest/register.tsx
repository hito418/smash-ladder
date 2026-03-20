import { Alert, Button, FormField, Input } from '@repo/ui'
import { createMutation, useQueryClient } from '@tanstack/solid-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/solid-router'
import { createSignal, Show } from 'solid-js'
import { authApi } from '../../features/auth/auth.api'
import { authKeys } from '../../features/auth/auth.queries'
import { ApiError } from '../../lib/api'

export const Route = createFileRoute('/_guest/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [username, setUsername] = createSignal('')
  const [password, setPassword] = createSignal('')

  const register = createMutation(() => ({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.me, data)
      navigate({ to: '/' })
    },
  }))

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault()
    if (register.isPending) return
    register.mutate({ username: username(), password: password() })
  }

  return (
    <div class="mx-auto max-w-sm space-y-6 pt-12">
      <h1 class="text-2xl font-bold">Register</h1>

      <Show when={register.isError}>
        <Alert variant="error">
          {register.error instanceof ApiError
            ? register.error.message
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
            autocomplete="new-password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            required
            minLength={9}
          />
        </FormField>

        <Button type="submit" disabled={register.isPending}>
          {register.isPending ? 'Creating account...' : 'Register'}
        </Button>
      </form>

      <p class="text-sm">
        Already have an account?{' '}
        <Link to="/login" class="text-amber-500 underline">
          Login
        </Link>
      </p>
    </div>
  )
}
