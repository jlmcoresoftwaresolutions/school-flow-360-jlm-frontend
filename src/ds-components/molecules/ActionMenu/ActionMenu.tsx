import type { CSSProperties, KeyboardEvent, ReactNode } from "react"
import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"

import type { IconName } from "@/ds-components/atoms"
import { Icon, IconButton } from "@/ds-components/atoms"
import { spacing } from "@/foundation"

import {
  StyledActionMenuItem,
  StyledActionMenuItemLabel,
  StyledActionMenuList,
  StyledActionMenuTrigger,
} from "./ActionMenu.styles"

export type ActionMenuItem = {
  key: string
  label: string
  checked?: boolean
  disabled?: boolean
  icon?: IconName
  tone?: "danger" | "default"
  onClick?: () => void
}

export type ActionMenuProps = {
  items: ActionMenuItem[]
  triggerLabel: string
  align?: "end" | "start"
  className?: string
  disabled?: boolean
  style?: CSSProperties
  trigger?: ReactNode
  triggerIcon?: IconName
}

// The enabled items, in order; menuitemradio items (see `checked`) count too.
const enabledItemSelector = "[role^='menuitem']:not(:disabled)"

// Gap between the trigger and its menu, and a rough row height used only to decide whether the menu
// fits below the trigger before it has been rendered (and so measured).
const menuGap = parseInt(spacing[4])
const estimatedItemHeight = parseInt(spacing[40])

// Where the menu is drawn for a trigger at `rect`: below it, or above when there isn't room below (judged
// from a rough row height, since the menu isn't measured yet), lined up with the trigger's `align` edge.
const menuPosition = (rect: DOMRect, itemCount: number, align: "end" | "start"): CSSProperties => {
  const estimatedHeight = itemCount * estimatedItemHeight
  const spaceBelow = window.innerHeight - rect.bottom
  const opensUpward = spaceBelow < estimatedHeight && rect.top > spaceBelow

  const position: CSSProperties = opensUpward
    ? { bottom: window.innerHeight - rect.top + menuGap }
    : { top: rect.bottom + menuGap }

  if (align === "end") position.right = window.innerWidth - rect.right
  else position.left = rect.left

  return position
}

const isOutOfView = (rect: DOMRect) =>
  rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth

// A "more actions" button (the kebab of a table row) that opens a menu of actions. The menu is
// rendered in a portal at fixed coordinates so it isn't clipped by overflow on a parent; it opens
// downward, or upward when there isn't room below, follows its trigger when the page scrolls (closing
// once the trigger leaves the screen) and closes when the window resizes. Keyboard follows the WAI-ARIA menu pattern: focus
// moves into the menu when it opens, arrows/Home/End move between the enabled items, Escape closes it
// and returns focus to the trigger. It owns no copy: triggerLabel is the trigger's accessible name.
// An item with `checked` set (true or false) is a menuitemradio instead, for picking one option out
// of several (e.g. a language): the checked one shows a check mark and is announced as checked.
// `trigger` replaces the trigger's icon with any content (e.g. the signed-in user, in the Topbar); the
// button is then named by that visible content, and triggerLabel names only the menu.
export const ActionMenu = (props: ActionMenuProps) => {
  const {
    align = "end",
    className,
    disabled,
    items,
    style,
    trigger,
    triggerIcon = "dots-vertical",
    triggerLabel,
  } = props

  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const menuId = useId()

  // null means closed; otherwise it is the fixed position the menu is drawn at.
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)

  const isOpen = menuStyle !== null
  const itemCount = items.length

  useEffect(() => {
    if (!isOpen) return

    // A radio-style menu opens on its checked item, so the arrows start from the current choice.
    const initialItem =
      menuRef.current?.querySelector<HTMLElement>("[aria-checked='true']:not(:disabled)") ??
      menuRef.current?.querySelector<HTMLElement>(enabledItemSelector)

    initialItem?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node

      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) setMenuStyle(null)
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return

      setMenuStyle(null)
      triggerRef.current?.focus()
    }

    const handleDetach = () => setMenuStyle(null)

    // Only a scroll that moves the trigger matters: the page, or a container around the trigger (not,
    // e.g., a text field elsewhere scrolling its own text back when it loses focus to the menu). The menu
    // then follows the trigger - which also covers the scroll that brought the trigger into view just
    // before it was clicked, whose event arrives after the menu opened - and closes once the trigger is
    // off the screen.
    const handleScroll = (event: Event) => {
      const target = event.target
      const trigger = triggerRef.current

      if (!trigger || (target instanceof Node && !target.contains(trigger))) return

      const rect = trigger.getBoundingClientRect()
      setMenuStyle(isOutOfView(rect) ? null : menuPosition(rect, itemCount, align))
    }

    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", handleDetach)
    window.addEventListener("scroll", handleScroll, true)

    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", handleDetach)
      window.removeEventListener("scroll", handleScroll, true)
    }
  }, [align, isOpen, itemCount])

  const open = () => {
    const trigger = triggerRef.current
    if (!trigger) return

    setMenuStyle(menuPosition(trigger.getBoundingClientRect(), itemCount, align))
  }

  const handleSelect = (item: ActionMenuItem) => {
    item.onClick?.()
    setMenuStyle(null)
    triggerRef.current?.focus()
  }

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(enabledItemSelector) ?? [])
    if (enabled.length === 0) return

    const current = enabled.indexOf(document.activeElement as HTMLElement)
    let next: number | null = null

    if (event.key === "ArrowDown") next = (current + 1) % enabled.length
    else if (event.key === "ArrowUp") next = (current - 1 + enabled.length) % enabled.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = enabled.length - 1
    else if (event.key === "Tab") setMenuStyle(null)

    if (next === null) return

    event.preventDefault()
    enabled[next].focus()
  }

  return (
    <>
      {trigger ? (
        <StyledActionMenuTrigger
          aria-controls={isOpen ? menuId : undefined}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className={className}
          disabled={disabled}
          onClick={isOpen ? () => setMenuStyle(null) : open}
          ref={triggerRef}
          style={style}
          type="button"
        >
          {trigger}
        </StyledActionMenuTrigger>
      ) : (
        <IconButton
          aria-controls={isOpen ? menuId : undefined}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className={className}
          disabled={disabled}
          icon={triggerIcon}
          label={triggerLabel}
          onClick={isOpen ? () => setMenuStyle(null) : open}
          ref={triggerRef}
          style={style}
          tooltip=""
        />
      )}

      {isOpen &&
        createPortal(
          <StyledActionMenuList
            aria-label={triggerLabel}
            id={menuId}
            onKeyDown={handleMenuKeyDown}
            ref={menuRef}
            role="menu"
            style={menuStyle}
          >
            {items.map((item) => (
              <StyledActionMenuItem
                $danger={item.tone === "danger"}
                aria-checked={item.checked}
                disabled={item.disabled}
                key={item.key}
                onClick={() => handleSelect(item)}
                role={item.checked === undefined ? "menuitem" : "menuitemradio"}
                tabIndex={-1}
                type="button"
              >
                {item.icon && (
                  <Icon color={item.tone === "danger" ? "danger" : "secondary"} name={item.icon} size={16} />
                )}
                <StyledActionMenuItemLabel>{item.label}</StyledActionMenuItemLabel>
                {item.checked && <Icon color="brand" name="check" size={16} />}
              </StyledActionMenuItem>
            ))}
          </StyledActionMenuList>,
          document.body,
        )}
    </>
  )
}
