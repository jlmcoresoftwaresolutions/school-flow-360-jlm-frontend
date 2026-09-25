import type { CSSProperties } from "react"
import { useEffect, useId, useState } from "react"

import type { IconName } from "@/ds-components/atoms"
import { Icon, Image } from "@/ds-components/atoms"
import { media } from "@/foundation"
import { useMediaQuery } from "@/hooks"

import {
  SidebarBackdrop,
  SidebarBottom,
  SidebarBrand,
  SidebarBrandInfo,
  SidebarBrandTitle,
  SidebarItemList,
  SidebarNav,
  SidebarNavContent,
  SidebarPanel,
  SidebarToggleButton,
  SidebarWrapper,
} from "./Sidebar.styles"
import { SidebarItem } from "./SidebarItem"

export type SidebarNavChild = {
  key: string
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}

export type SidebarNavItem = {
  icon: IconName
  key: string
  label: string
  active?: boolean
  children?: SidebarNavChild[]
  disabled?: boolean
  onClick?: () => void
}

export type SidebarProps = {
  items: SidebarNavItem[]
  logoAlt: string
  logoSrc: string
  title: string
  bottomItems?: SidebarNavItem[]
  className?: string
  style?: CSSProperties
}

// "Compact" is every screen narrower than the md breakpoint: `not all and (min-width: 768px)`
// is that breakpoint's own media token, negated, so the two can't drift apart.
const compactQuery = `not all and ${media.md}`

// On compact screens the sidebar is an icon-only rail with a button that opens it over the content;
// on wider screens it is always fully expanded and that button doesn't exist.
export const Sidebar = (props: SidebarProps) => {
  const { bottomItems = [], className, items, logoAlt, logoSrc, style, title } = props

  const panelId = useId()

  const isCompact = useMediaQuery(compactQuery)

  const [isOpen, setIsOpen] = useState(false)
  // Which group is open. undefined means "not chosen by the user yet" - the group holding the current
  // page is then the open one, so it opens by itself on navigation without needing an effect; null
  // means the user closed everything. Only one group is ever open: opening one closes the other.
  const [openGroupKey, setOpenGroupKey] = useState<null | string | undefined>(undefined)

  const isOverlay = isCompact && isOpen
  const isCollapsed = isCompact && !isOpen

  const activeGroupKey = [...items, ...bottomItems].find((item) => item.children?.some((child) => child.active))?.key
  const expandedGroupKey = openGroupKey === undefined ? activeGroupKey : openGroupKey

  useEffect(() => {
    if (!isOverlay) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOverlay])

  const collapse = () => setIsOpen(false)
  const expand = () => setIsOpen(true)

  const renderItems = (list: SidebarNavItem[]) =>
    list.map((item) => (
      <SidebarItem
        collapsed={isCollapsed}
        expanded={item.key === expandedGroupKey}
        item={item}
        key={item.key}
        onExpand={expand}
        onNavigate={collapse}
        onToggleGroup={(open) => setOpenGroupKey(open ? item.key : null)}
      />
    ))

  return (
    <SidebarWrapper $compact={isCompact} className={className} style={style}>
      {isCompact && <SidebarBackdrop $visible={isOverlay} onClick={collapse} role="presentation" />}

      <SidebarPanel $collapsed={isCollapsed} $overlay={isOverlay} id={panelId}>
        <SidebarBrand $collapsed={isCollapsed}>
          <SidebarBrandInfo $collapsed={isCollapsed}>
            {/* Image defaults to align-self: flex-start, which would pin the logo to the top of a row that the toggle button makes taller. */}
            <Image
              alt={logoAlt}
              borderRadius="low"
              boxShadow="none"
              size={32}
              src={logoSrc}
              style={{ alignSelf: "center", flexShrink: 0 }}
            />

            <SidebarBrandTitle>{title}</SidebarBrandTitle>
          </SidebarBrandInfo>

          {isCompact && (
            <SidebarToggleButton
              aria-controls={panelId}
              aria-expanded={isOpen}
              aria-label={isOpen ? "Recolher menu" : "Expandir menu"}
              onClick={isOpen ? collapse : expand}
              type="button"
            >
              <Icon color="secondary" name={isOpen ? "x" : "menu"} size={24} />
            </SidebarToggleButton>
          )}
        </SidebarBrand>

        <SidebarNav $collapsed={isCollapsed} aria-label="Navegação principal">
          <SidebarNavContent $collapsed={isCollapsed}>
            <SidebarItemList>{renderItems(items)}</SidebarItemList>
          </SidebarNavContent>
        </SidebarNav>

        {bottomItems.length > 0 && (
          <SidebarBottom $collapsed={isCollapsed}>
            <SidebarItemList>{renderItems(bottomItems)}</SidebarItemList>
          </SidebarBottom>
        )}
      </SidebarPanel>
    </SidebarWrapper>
  )
}
