import { createRootRoute, Link, Outlet } from '@tanstack/solid-router'
import { Suspense } from 'solid-js'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <Link to="/">Index</Link>
      <Link to="/counter">Counter</Link>
      <Suspense>
        <Outlet />
      </Suspense>
    </>
  )
}
