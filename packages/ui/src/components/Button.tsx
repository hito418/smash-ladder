import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

const buttonStyle = cva(
  [
    'flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-md px-4 py-2 hover:opacity-80 transition-all duration-150 linear',
  ],
  {
    variants: {
      size: {
        sm: ['text-sm'],
        md: ['text-base'],
        lg: ['text-lg'],
      },
      color: {
        primary: ['bg-amber-600 text-white'],
        secondary: ['bg-emerald-600 text-white'],
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
