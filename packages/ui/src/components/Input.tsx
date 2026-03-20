import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

const inputStyle = cva(
  [
    'w-full rounded border bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 transition-colors duration-150',
  ],
  {
    variants: {
      size: {
        sm: ['text-xs'],
        md: ['text-sm'],
        lg: ['text-base'],
      },
      error: {
        true: ['border-red-500/50 focus:ring-red-500/20 focus:border-red-500'],
        false: [
          'border-slate-700 focus:ring-cyan-500/20 focus:border-cyan-500',
        ],
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
