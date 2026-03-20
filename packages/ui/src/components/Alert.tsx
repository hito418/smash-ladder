import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'

const alertStyle = cva(
  ['rounded px-4 py-3 text-sm border-l-4'],
  {
    variants: {
      variant: {
        error: ['bg-red-500/10 border-l-red-500 text-red-300'],
        success: ['bg-emerald-500/10 border-l-emerald-500 text-emerald-300'],
        warning: ['bg-amber-500/10 border-l-amber-500 text-amber-300'],
        info: ['bg-cyan-500/10 border-l-cyan-500 text-cyan-300'],
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
