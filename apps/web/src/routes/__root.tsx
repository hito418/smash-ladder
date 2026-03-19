import { createRootRoute, Link, Outlet } from '@tanstack/solid-router'
import { Suspense } from 'solid-js'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <div class="flex gap-2">
        <Link to="/counter" activeProps={{ class: 'bg-red-100' }}>
          Counter
        </Link>
        <Link to="/" activeProps={{ class: 'bg-red-100' }}>
          Index
        </Link>
      </div>
      <Suspense>
        <Outlet />
      </Suspense>
    </>
  )
}
