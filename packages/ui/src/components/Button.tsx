import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

const buttonStyle = cva(
  [
    'flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed rounded px-4 py-2 font-medium transition-colors duration-150',
  ],
  {
    variants: {
      size: {
        sm: ['text-xs px-3 py-1.5'],
        md: ['text-sm'],
        lg: ['text-base px-5 py-2.5'],
      },
      color: {
        primary: ['bg-cyan-600 text-white hover:bg-cyan-500'],
        secondary: ['bg-slate-700 text-slate-200 hover:bg-slate-600'],
      },
    },
    defaultVariants: {
      size: 'md',
      color: 'primary',
    },
  }
)

export type ButtonVariants = VariantProps<typeof buttonStyle>

export const Button = (
  props: ButtonVariants & JSX.ButtonHTMLAttributes<HTMLButtonElement>
) => {
  const [local, rest] = splitProps(props, ['size', 'color', 'class'])
  return (
    <button
      class={`${buttonStyle({ size: local.size, color: local.color })} ${local.class ?? ''}`}
      {...rest}
    />
  )
}
