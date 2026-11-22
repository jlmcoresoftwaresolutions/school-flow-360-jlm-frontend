import type { ReactNode } from "react"

import type { ButtonProps } from "@/ds-components/atoms"
import { Button, Icon } from "@/ds-components/atoms"
import { motion } from "@/foundation"

import { useCollapsibleContext } from "./CollapsibleContext"

export type CollapsibleTriggerProps = Pick<
  ButtonProps,
  "className" | "color" | "size" | "style" | "tooltip" | "variant"
> & {
  // The label, or a function of the open state, for a label that changes ("Expandir" / "Ocultar").
  children: ReactNode | ((state: { open: boolean }) => ReactNode)
}

// The button that opens and closes its Collapsible: a small link-style Button with a chevron that flips
// with the state, wired with aria-expanded and aria-controls. It owns no copy: the label is its children.
export const CollapsibleTrigger = (props: CollapsibleTriggerProps) => {
  const { children, size = "small", variant = "link", ...rest } = props

  const { contentId, open, toggle } = useCollapsibleContext()

  return (
    <Button
      {...rest}
      aria-controls={contentId}
      aria-expanded={open}
      endIcon={
        <Icon
          color="inherit"
          name="chevron-down"
          size={16}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: `transform ${motion.duration.fast} ${motion.easing.ease}`,
          }}
        />
      }
      onClick={toggle}
      size={size}
      variant={variant}
    >
      {typeof children === "function" ? children({ open }) : children}
    </Button>
  )
}
