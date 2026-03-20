import { meQueryOptions } from '../features/auth/auth.queries'
import { createFileRoute, Outlet, redirect } from '@tanstack/solid-router'

export const Route = createFileRoute('/_guest')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions())
    if (user) throw redirect({ to: '/' })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
