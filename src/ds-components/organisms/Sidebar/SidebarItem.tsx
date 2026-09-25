import { useId } from "react"

import { Icon, useTooltip } from "@/ds-components/atoms"
import { motion, opacity } from "@/foundation"

import type { SidebarNavItem } from "./Sidebar"
import {
  SidebarChildButton,
  SidebarChildList,
  SidebarChildrenClip,
  SidebarChildrenWrapper,
  SidebarDot,
  SidebarItemButton,
  SidebarItemLabel,
} from "./Sidebar.styles"

export type SidebarItemProps = {
  collapsed: boolean
  expanded: boolean
  item: SidebarNavItem
  onExpand: () => void
  onNavigate: () => void
  onToggleGroup: (open: boolean) => void
}

// Internal to Sidebar (deliberately not re-exported from index.ts): it owns the item's tooltip
// state, which is why this is its own component rather than a render helper. Which group is open is
// NOT decided here: the Sidebar keeps a single open group at a time, so `expanded` comes in as a
// prop and a click reports the wanted state through onToggleGroup.
//
// `collapsed` is the Sidebar's icon-only rail (not this group's own open/closed state): only the
// icon shows, with the label kept for screen readers and as a tooltip over the whole item, and children are not
// rendered at all - clicking a group there asks the Sidebar to expand (onExpand) and opens the
// group, since its children have nowhere to show in the rail.
export const SidebarItem = (props: SidebarItemProps) => {
  const { collapsed, expanded, item, onExpand, onNavigate, onToggleGroup } = props

  const childrenId = useId()

  const { tooltipElement, tooltipHandlers } = useTooltip(collapsed ? item.label : undefined)

  const children = item.children ?? []
  const hasChildren = children.length > 0
  const hasActiveChild = children.some((child) => child.active)
  const isActive = Boolean(item.active) || hasActiveChild
  const isExpanded = hasChildren && expanded

  const handleClick = () => {
    if (hasChildren && collapsed) {
      onToggleGroup(true)
      onExpand()
    } else if (hasChildren) {
      onToggleGroup(!isExpanded)
    } else {
      onNavigate()
    }

    item.onClick?.()
  }

  const handleChildClick = (onClick?: () => void) => () => {
    onClick?.()
    onNavigate()
  }

  // The handlers go on the <li>, not the button: a disabled button doesn't dispatch mouse events,
  // and most rail items are disabled placeholders that should still name themselves on hover.
  return (
    <li {...tooltipHandlers}>
      <SidebarItemButton
        $active={isActive}
        $collapsed={collapsed}
        aria-controls={hasChildren && !collapsed ? childrenId : undefined}
        aria-current={item.active ? "page" : undefined}
        aria-expanded={hasChildren && !collapsed ? isExpanded : undefined}
        disabled={item.disabled}
        onClick={handleClick}
        type="button"
      >
        <Icon color={isActive ? "info" : "secondary"} name={item.icon} size={20} />

        <SidebarItemLabel $active={isActive} $hidden={collapsed}>
          {item.label}
        </SidebarItemLabel>

        {hasChildren && (
          <Icon
            color={isActive ? "info" : "muted"}
            name="chevron-down"
            size={16}
            style={{
              opacity: collapsed ? opacity.hidden : opacity.visible,
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: `transform ${motion.duration.normal} ${motion.easing.ease}, opacity ${motion.duration.normal} ${motion.easing.ease}`,
            }}
          />
        )}
      </SidebarItemButton>

      {hasChildren && (
        <SidebarChildrenWrapper $expanded={isExpanded && !collapsed} id={childrenId}>
          <SidebarChildrenClip>
            <SidebarChildList>
              {children.map((child) => (
                <li key={child.key}>
                  <SidebarChildButton
                    $active={Boolean(child.active)}
                    aria-current={child.active ? "page" : undefined}
                    disabled={child.disabled}
                    onClick={handleChildClick(child.onClick)}
                    type="button"
                  >
                    <SidebarDot $active={Boolean(child.active)} />

                    <SidebarItemLabel $active={Boolean(child.active)}>{child.label}</SidebarItemLabel>
                  </SidebarChildButton>
                </li>
              ))}
            </SidebarChildList>
          </SidebarChildrenClip>
        </SidebarChildrenWrapper>
      )}

      {tooltipElement}
    </li>
  )
}
