import type { CSSProperties, KeyboardEvent, ReactNode } from "react"
import { useEffect, useId, useRef, useState } from "react"

import type { IconName } from "@/ds-components/atoms"
import { Icon } from "@/ds-components/atoms"
import { useMediaQuery } from "@/hooks"

import { StyledTab, StyledTabList, StyledTabPanel } from "./Tabs.styles"

export type TabsItem = {
  key: string
  label: string
  content?: ReactNode
  disabled?: boolean
  icon?: IconName
}

type Overflow = {
  end: boolean
  start: boolean
}

// How far from an edge a tab must be to count as visible: the width of the edge's fade.
const revealInset = 24

// Whether tabs are hidden past each edge of the scrolling bar (a pixel of slack for rounding).
const readOverflow = (list: HTMLElement): Overflow => ({
  end: list.scrollLeft + list.clientWidth < list.scrollWidth - 1,
  start: list.scrollLeft > 1,
})

export type TabsProps = {
  items: TabsItem[]
  value: string
  attached?: boolean
  className?: string
  label?: string
  style?: CSSProperties
  onChange: (key: string) => void
}

// A controlled tab bar, styled after browser tabs: white tabs, bordered and rounded at the top, set
// slightly apart on a baseline across the whole width; the selected one (in the brand color) opens into
// the content below.
// `value` is the key of the selected tab and onChange reports the one the user picked. A tab can show
// an icon before its label, and carry its own `content`, rendered below the bar while it is selected;
// tabs without it are just a selector, for pages that swap the content themselves (e.g. one route per
// tab). `attached` joins the bar to the content right below it (typically a Card, with no gap in
// between): the baseline goes away and the selected tab takes the card's look, sitting over its top
// edge, so the tab and its content read as one piece. A tab's own `content` then starts right at the
// bar too, without the gap it has otherwise.
// Keyboard follows the WAI-ARIA pattern: only the selected tab is in the Tab order, and the arrows,
// Home and End move between the enabled tabs, selecting as they go.
// On a narrow screen the tabs are a step smaller and the bar scrolls sideways: an edge with tabs hidden
// past it fades out, the scroll snaps to whole tabs, and the selected tab (by click, keyboard or a new
// `value`) is scrolled into view, smoothly unless the user asked for reduced motion.
export const Tabs = (props: TabsProps) => {
  const { attached = false, className, items, label, onChange, style, value } = props

  const listRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const baseId = useId()
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)")

  const [overflow, setOverflow] = useState<Overflow>({ end: false, start: false })

  const enabledKeys = items.filter((item) => !item.disabled).map((item) => item.key)
  const selectedItem = items.find((item) => item.key === value)
  // Without a valid selection the bar must still be reachable by keyboard, so the first enabled tab
  // takes the Tab stop.
  const tabStopKey = selectedItem ? selectedItem.key : enabledKeys[0]

  const tabId = (key: string) => `${baseId}-tab-${key}`
  const panelId = (key: string) => `${baseId}-panel-${key}`

  const updateOverflow = () => {
    const list = listRef.current
    if (!list) return
    const next = readOverflow(list)
    setOverflow((current) => (current.end === next.end && current.start === next.start ? current : next))
  }

  // The edges are measured again whenever the bar or a tab changes size (a narrower screen, a longer
  // label); a browser without ResizeObserver measures them on scroll only.
  useEffect(() => {
    const list = listRef.current
    if (!list || typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(() => {
      const next = readOverflow(list)
      setOverflow((current) => (current.end === next.end && current.start === next.start ? current : next))
    })
    observer.observe(list)
    Array.from(list.children).forEach((child) => observer.observe(child))

    return () => observer.disconnect()
  }, [items.length])

  // The selected tab is scrolled into the bar's view (clear of the fades), moving only the bar, never
  // the page.
  useEffect(() => {
    const list = listRef.current
    const tab = tabRefs.current[value]
    if (!list || !tab || typeof list.scrollBy !== "function") return

    const listBox = list.getBoundingClientRect()
    const tabBox = tab.getBoundingClientRect()
    let distance = 0
    if (tabBox.left < listBox.left + revealInset) distance = tabBox.left - listBox.left - revealInset
    else if (tabBox.right > listBox.right - revealInset) distance = tabBox.right - listBox.right + revealInset

    if (distance !== 0) list.scrollBy({ behavior: reduceMotion ? "auto" : "smooth", left: distance })
  }, [reduceMotion, value])

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
      <StyledTabList
        $attached={attached}
        aria-label={label}
        data-overflow-end={overflow.end || undefined}
        data-overflow-start={overflow.start || undefined}
        onKeyDown={handleKeyDown}
        onScroll={updateOverflow}
        ref={listRef}
        role="tablist"
      >
        {items.map((item) => {
          const isSelected = item.key === value

          return (
            <StyledTab
              $attached={attached}
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
              {item.icon && <Icon color={isSelected ? "brand" : "secondary"} name={item.icon} size={16} />}
              {item.label}
            </StyledTab>
          )
        })}
      </StyledTabList>

      {selectedItem && selectedItem.content !== undefined && (
        <StyledTabPanel
          $attached={attached}
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
