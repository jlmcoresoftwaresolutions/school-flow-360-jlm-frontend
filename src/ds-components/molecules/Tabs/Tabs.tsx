import type { CSSProperties, KeyboardEvent, ReactNode } from "react"
import { useId, useRef } from "react"

import { StyledTab, StyledTabList, StyledTabPanel } from "./Tabs.styles"

export type TabsItem = {
  key: string
  label: string
  content?: ReactNode
  disabled?: boolean
}

export type TabsProps = {
  items: TabsItem[]
  value: string
  className?: string
  label?: string
  style?: CSSProperties
  onChange: (key: string) => void
}

// A controlled tab bar: `value` is the key of the selected tab and onChange reports the one the user
// picked. A tab can carry its own `content`, rendered below the bar while it is selected; tabs without
// it are just a selector, for pages that swap the content themselves (e.g. one route per tab).
// Keyboard follows the WAI-ARIA pattern: only the selected tab is in the Tab order, and the arrows,
// Home and End move between the enabled tabs, selecting as they go.
export const Tabs = (props: TabsProps) => {
  const { className, items, label, onChange, style, value } = props

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const baseId = useId()

  const enabledKeys = items.filter((item) => !item.disabled).map((item) => item.key)
  const selectedItem = items.find((item) => item.key === value)
  // Without a valid selection the bar must still be reachable by keyboard, so the first enabled tab
  // takes the Tab stop.
  const tabStopKey = selectedItem ? selectedItem.key : enabledKeys[0]

  const tabId = (key: string) => `${baseId}-tab-${key}`
  const panelId = (key: string) => `${baseId}-panel-${key}`

  const select = (key: string) => {
    onChange(key)
    tabRefs.current[key]?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentKey = (event.target as HTMLElement).closest("[data-key]")?.getAttribute("data-key") ?? ""
    const current = enabledKeys.indexOf(currentKey)
    if (current === -1) return

    let next: number | null = null

    if (event.key === "ArrowRight") next = (current + 1) % enabledKeys.length
    else if (event.key === "ArrowLeft") next = (current - 1 + enabledKeys.length) % enabledKeys.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = enabledKeys.length - 1

    if (next === null) return

    event.preventDefault()
    select(enabledKeys[next])
  }

  return (
    <div className={className} style={style}>
      <StyledTabList aria-label={label} onKeyDown={handleKeyDown} role="tablist">
        {items.map((item) => {
          const isSelected = item.key === value

          return (
            <StyledTab
              $selected={isSelected}
              aria-controls={isSelected && item.content !== undefined ? panelId(item.key) : undefined}
              aria-selected={isSelected}
              data-key={item.key}
              disabled={item.disabled}
              id={tabId(item.key)}
              key={item.key}
              onClick={() => onChange(item.key)}
              ref={(element) => {
                tabRefs.current[item.key] = element
              }}
              role="tab"
              tabIndex={item.key === tabStopKey ? 0 : -1}
              type="button"
            >
              {item.label}
            </StyledTab>
          )
        })}
      </StyledTabList>

      {selectedItem && selectedItem.content !== undefined && (
        <StyledTabPanel
          aria-labelledby={tabId(selectedItem.key)}
          id={panelId(selectedItem.key)}
          role="tabpanel"
          tabIndex={0}
        >
          {selectedItem.content}
        </StyledTabPanel>
      )}
    </div>
  )
}
