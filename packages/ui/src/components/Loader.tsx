import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'
import LoaderCircle from "lucide-solid/icons/loader-circle";

export const Loader = (props: JSX.SvgSVGAttributes<SVGSVGElement>) => {
  const [local, rest] = splitProps(props, ['class'])
  return (
    <LoaderCircle
      aria-label="Loading"
      class={`animate-spin ${local.class ?? ''}`}
      {...rest}
    />
  )
}
