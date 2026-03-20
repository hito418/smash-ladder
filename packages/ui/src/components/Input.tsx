import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

const inputStyle = cva(
  [
    'w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all',
  ],
  {
    variants: {
      size: {
        sm: ['text-sm'],
        md: ['text-base'],
        lg: ['text-lg'],
      },
      error: {
        true: ['border-red-500 focus:ring-red-500 focus:border-red-500'],
        false: ['border-gray-300'],
      },
    },
    defaultVariants: {
      size: 'md',
      error: false,
    },
  }
)

export type InputVariants = VariantProps<typeof inputStyle>

export const Input = (
  props: InputVariants & JSX.InputHTMLAttributes<HTMLInputElement>
) => {
  const [local, rest] = splitProps(props, ['size', 'error', 'class'])
  return (
    <input
      class={`${inputStyle({ size: local.size, error: local.error })} ${local.class ?? ''}`}
      aria-invalid={local.error ? true : undefined}
      {...rest}
    />
  )
}
