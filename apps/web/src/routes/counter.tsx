import { createFileRoute } from '@tanstack/solid-router'
import { Counter } from '@repo/ui'
import { createSignal } from 'solid-js'

export const Route = createFileRoute('/counter')({
  component: RouteComponent,
})

function RouteComponent() {
  const [count, setCount] = createSignal(22)
  const increment = () => setCount((old) => old + 1)

  return (
    <div class="flex flex-col gap-1">
      <span>Hello "/counter"!</span>
      <Counter count={count()} onIncrement={increment} />
      <span>Test</span>
    </div>
  )
}
