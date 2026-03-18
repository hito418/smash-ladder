import { createFileRoute } from '@tanstack/solid-router'
import { Counter } from '@repo/ui'

export const Route = createFileRoute('/counter')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      Hello "/counter"!
      <Counter />
    </div>
  )
}
