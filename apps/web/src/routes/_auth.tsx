import { meQueryOptions } from '../features/auth/auth.queries'
import { createFileRoute, Outlet, redirect } from '@tanstack/solid-router'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions())
    if (!user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  component: () => <Outlet />,
})
