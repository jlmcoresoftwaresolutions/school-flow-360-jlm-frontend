import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react"
import { useId, useState } from "react"

import { CollapsibleContent } from "./CollapsibleContent"
import { CollapsibleContext } from "./CollapsibleContext"
import { CollapsibleTrigger } from "./CollapsibleTrigger"

export type { CollapsibleContentProps } from "./CollapsibleContent"
export type { CollapsibleTriggerProps } from "./CollapsibleTrigger"

type CollapsibleOwnProps = {
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export type CollapsibleProps = CollapsibleOwnProps & Omit<ComponentPropsWithoutRef<"div">, keyof CollapsibleOwnProps>

type CollapsibleComponentType = ((props: CollapsibleProps) => ReactElement) & {
  Content: typeof CollapsibleContent
  Trigger: typeof CollapsibleTrigger
}

// A section that expands and collapses. It is a compound component: the root holds the open state and
// renders a div (it takes className, style and any div attribute), Collapsible.Trigger is the button that
// toggles it and Collapsible.Content is the part that is shown or hidden. The trigger and the content
// only need to be inside the root, not next to each other, so a header can hold the trigger while the
// content sits further down. Uncontrolled by default (defaultOpen, closed unless set); pass open and
// onOpenChange to control it. The content stays mounted while hidden, so what it holds keeps its state.
export const Collapsible = ((props: CollapsibleProps) => {
  const { children, defaultOpen = false, onOpenChange, open: controlledOpen, ...rest } = props

  const contentId = useId()

  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)

  const open = controlledOpen ?? uncontrolledOpen

  const toggle = () => {
    const next = !open

    if (controlledOpen === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  return (
    <CollapsibleContext.Provider value={{ contentId, open, toggle }}>
      <div {...rest}>{children}</div>
    </CollapsibleContext.Provider>
  )
}) as CollapsibleComponentType

Collapsible.Content = CollapsibleContent
Collapsible.Trigger = CollapsibleTrigger
