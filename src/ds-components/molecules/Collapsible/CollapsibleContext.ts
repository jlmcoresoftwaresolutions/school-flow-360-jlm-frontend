import { createContext, useContext } from "react"

export type CollapsibleContextValue = {
  contentId: string
  open: boolean
  toggle: () => void
}

export const CollapsibleContext = createContext<CollapsibleContextValue | null>(null)

// What Collapsible.Trigger and Collapsible.Content read from their Collapsible: the open state and the id
// that links the trigger (aria-controls) to the content.
export const useCollapsibleContext = () => {
  const context = useContext(CollapsibleContext)

  if (!context) throw new Error("Collapsible.Trigger and Collapsible.Content must be rendered inside a Collapsible.")

  return context
}
