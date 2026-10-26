import type { CSSProperties, KeyboardEvent } from "react"
import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"

import type { IconName } from "@/ds-components/atoms"
import { Icon } from "@/ds-components/atoms"
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
  triggerIcon?: IconName
}

// The enabled items, in order; menuitemradio items (see `checked`) count too.
const enabledItemSelector = "[role^='menuitem']:not(:disabled)"

// Gap between the trigger and its menu, and a rough row height used only to decide whether the menu
// fits below the trigger before it has been rendered (and so measured).
const menuGap = parseInt(spacing[4])
const estimatedItemHeight = parseInt(spacing[40])

// A "more actions" button (the kebab of a table row) that opens a menu of actions. The menu is
// rendered in a portal at fixed coordinates so it isn't clipped by overflow on a parent; it opens
// downward, or upward when there isn't room below, and closes when the page scrolls or resizes since
// those would leave it detached from its trigger. Keyboard follows the WAI-ARIA menu pattern: focus
// moves into the menu when it opens, arrows/Home/End move between the enabled items, Escape closes it
// and returns focus to the trigger. It owns no copy: triggerLabel is the trigger's accessible name.
// An item with `checked` set (true or false) is a menuitemradio instead, for picking one option out
// of several (e.g. a language): the checked one shows a check mark and is announced as checked.
export const ActionMenu = (props: ActionMenuProps) => {
  const { align = "end", className, disabled, items, style, triggerIcon = "dots-vertical", triggerLabel } = props

  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const menuId = useId()

  // null means closed; otherwise it is the fixed position the menu is drawn at.
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)

  const isOpen = menuStyle !== null

  useEffect(() => {
    if (!isOpen) return

    // A radio-style menu opens on its checked item, so the arrows start from the current choice.
    const initialItem =
      menuRef.current?.querySelector<HTMLElement>("[aria-checked='true']:not(:disabled)") ??
      menuRef.current?.querySelector<HTMLElement>(enabledItemSelector)

    initialItem?.focus()

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

    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", handleDetach)
    window.addEventListener("scroll", handleDetach, true)

    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", handleDetach)
      window.removeEventListener("scroll", handleDetach, true)
    }
  }, [isOpen])

  const open = () => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const estimatedHeight = items.length * estimatedItemHeight
    const spaceBelow = window.innerHeight - rect.bottom
    const opensUpward = spaceBelow < estimatedHeight && rect.top > spaceBelow

    const position: CSSProperties = opensUpward
      ? { bottom: window.innerHeight - rect.top + menuGap }
      : { top: rect.bottom + menuGap }

    if (align === "end") position.right = window.innerWidth - rect.right
    else position.left = rect.left

    setMenuStyle(position)
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
      <StyledActionMenuTrigger
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={triggerLabel}
        className={className}
        disabled={disabled}
        onClick={isOpen ? () => setMenuStyle(null) : open}
        ref={triggerRef}
        style={style}
        type="button"
      >
        <Icon color="secondary" name={triggerIcon} size={20} />
      </StyledActionMenuTrigger>

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
