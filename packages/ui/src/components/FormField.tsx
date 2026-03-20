import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

export const FormField = (props: {
  id: string
  label: string
  error?: string
  children: JSX.Element
}) => {
  return (
    <div class="space-y-1">
      <label for={props.id} class="text-sm font-medium">
        {props.label}
      </label>
      {props.children}
      <div aria-live="polite">
        <Show when={props.error}>
          <p id={`${props.id}-error`} class="text-sm text-red-500">
            {props.error}
          </p>
        </Show>
      </div>
    </div>
  )
}
