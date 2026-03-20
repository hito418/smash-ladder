import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'

const alertStyle = cva(
  ['rounded-md px-4 py-3 text-sm border'],
  {
    variants: {
      variant: {
        error: ['bg-red-50 text-red-700 border-red-200'],
        success: ['bg-emerald-50 text-emerald-700 border-emerald-200'],
        warning: ['bg-amber-50 text-amber-700 border-amber-200'],
        info: ['bg-blue-50 text-blue-700 border-blue-200'],
      },
    },
    defaultVariants: {
      variant: 'error',
    },
  }
)

const ROLE_MAP = {
  error: 'alert',
  warning: 'alert',
  success: 'status',
  info: 'status',
} as const

export type AlertVariants = VariantProps<typeof alertStyle>

export const Alert = (
  props: {
    variant?: AlertVariants['variant']
  } & JSX.HTMLAttributes<HTMLDivElement>
) => {
  const [local, rest] = splitProps(props, ['variant', 'children', 'class'])
  return (
    <div
      role={ROLE_MAP[local.variant ?? 'error']}
      class={`${alertStyle({ variant: local.variant })} ${local.class ?? ''}`}
      {...rest}
    >
      {local.children}
    </div>
  )
}
