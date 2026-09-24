import { useId, useState } from "react"

import { Icon } from "@/ds-components/atoms"
import { motion } from "@/foundation"

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
  item: SidebarNavItem
}

// Internal to Sidebar (deliberately not re-exported from index.ts): a group owns its own
// expanded/collapsed state, which is why this is its own component rather than a render helper.
export const SidebarItem = (props: SidebarItemProps) => {
  const { item } = props

  const childrenId = useId()

  // null means "not toggled by the user yet" - a group then follows whether one of its children
  // is the current page, so it opens by itself on navigation without needing an effect.
  const [toggled, setToggled] = useState<boolean | null>(null)

  const children = item.children ?? []
  const hasChildren = children.length > 0
  const hasActiveChild = children.some((child) => child.active)
  const isActive = Boolean(item.active) || hasActiveChild
  const isExpanded = toggled ?? hasActiveChild

  const handleClick = () => {
    if (hasChildren) setToggled(!isExpanded)
    item.onClick?.()
  }

  return (
    <li>
      <SidebarItemButton
        $active={isActive}
        aria-controls={hasChildren ? childrenId : undefined}
        aria-current={item.active ? "page" : undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
        disabled={item.disabled}
        onClick={handleClick}
        type="button"
      >
        <Icon color={isActive ? "info" : "secondary"} name={item.icon} size={20} />

        <SidebarItemLabel $active={isActive}>{item.label}</SidebarItemLabel>

        {hasChildren && (
          <Icon
            color={isActive ? "info" : "muted"}
            name="chevron-down"
            size={16}
            style={{
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: `transform ${motion.duration.normal} ${motion.easing.ease}`,
            }}
          />
        )}
      </SidebarItemButton>

      {hasChildren && (
        <SidebarChildrenWrapper $expanded={isExpanded} id={childrenId}>
          <SidebarChildrenClip>
            <SidebarChildList>
              {children.map((child) => (
                <li key={child.key}>
                  <SidebarChildButton
                    $active={Boolean(child.active)}
                    aria-current={child.active ? "page" : undefined}
                    disabled={child.disabled}
                    onClick={child.onClick}
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
    </li>
  )
}
