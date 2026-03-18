import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import { splitProps } from 'solid-js'
import type { JSX } from 'solid-js/jsx-runtime'

const buttonStyle = cva(
  [
    'flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-amber-400 text-white rounded-md px-4 py-2 hover:opacity-80 transition-all duration-faster linear',
  ],
  {
    variants: {
      size: {
        sm: ['text-sm'],
        md: ['text-md'],
        lg: ['text-lg'],
      },
      color: {
        primary: ['bg-amber-400 text-white'],
        secondary: ['bg-emerald-400 text-white'],
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
  props: { variants: ButtonVariants } & JSX.HTMLAttributes<HTMLButtonElement>
) => {
  const [local, rest] = splitProps(props, ['variants'])
  return (
    <button class={buttonStyle(local.variants)} {...rest}>
      {props.children}
    </button>
  )
}
