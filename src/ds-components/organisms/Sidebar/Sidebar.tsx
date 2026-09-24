import type { CSSProperties } from "react"

import type { IconName } from "@/ds-components/atoms"
import { Image } from "@/ds-components/atoms"

import {
  SidebarBottom,
  SidebarBrand,
  SidebarBrandTitle,
  SidebarItemList,
  SidebarNav,
  SidebarNavContent,
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

export const Sidebar = (props: SidebarProps) => {
  const { bottomItems = [], className, items, logoAlt, logoSrc, style, title } = props

  return (
    <SidebarWrapper className={className} style={style}>
      <SidebarBrand>
        <Image alt={logoAlt} borderRadius="low" boxShadow="none" size={32} src={logoSrc} />

        <SidebarBrandTitle>{title}</SidebarBrandTitle>
      </SidebarBrand>

      <SidebarNav aria-label="Navegação principal">
        <SidebarNavContent>
          <SidebarItemList>
            {items.map((item) => (
              <SidebarItem item={item} key={item.key} />
            ))}
          </SidebarItemList>
        </SidebarNavContent>
      </SidebarNav>

      {bottomItems.length > 0 && (
        <SidebarBottom>
          <SidebarItemList>
            {bottomItems.map((item) => (
              <SidebarItem item={item} key={item.key} />
            ))}
          </SidebarItemList>
        </SidebarBottom>
      )}
    </SidebarWrapper>
  )
}
