import type { CSSProperties, ReactNode } from "react"

import type { IconName } from "@/ds-components/atoms"
import { Icon, Image, Text } from "@/ds-components/atoms"

import {
  SidebarBrand,
  SidebarBrandText,
  SidebarFooter,
  SidebarItemButton,
  SidebarItemList,
  SidebarNav,
  SidebarSection,
  SidebarSectionTitle,
  SidebarWrapper,
} from "./Sidebar.styles"

export type SidebarNavItem = {
  icon: IconName
  key: string
  label: string
  active?: boolean
  onClick?: () => void
}

export type SidebarNavSection = {
  items: SidebarNavItem[]
  key: string
  title?: string
}

export type SidebarProps = {
  logoAlt: string
  logoSrc: string
  sections: SidebarNavSection[]
  title: string
  className?: string
  footer?: ReactNode
  style?: CSSProperties
  subtitle?: string
}

export const Sidebar = (props: SidebarProps) => {
  const { className, footer, logoAlt, logoSrc, sections, style, subtitle, title } = props

  return (
    <SidebarWrapper className={className} style={style}>
      <SidebarBrand>
        <Image alt={logoAlt} borderRadius="medium" size={40} src={logoSrc} />

        <SidebarBrandText>
          <Text as="p" color="inverse" fontSize="lg" bold>
            {title}
          </Text>

          {subtitle && (
            <Text as="p" color="muted" fontSize="xs">
              {subtitle}
            </Text>
          )}
        </SidebarBrandText>
      </SidebarBrand>

      <SidebarNav aria-label="Navegação principal">
        {sections.map((section) => (
          <SidebarSection key={section.key}>
            {section.title && (
              <SidebarSectionTitle>
                <Text as="p" color="muted" fontSize="xs" uppercase semibold>
                  {section.title}
                </Text>
              </SidebarSectionTitle>
            )}

            <SidebarItemList>
              {section.items.map((item) => (
                <li key={item.key}>
                  <SidebarItemButton
                    $active={Boolean(item.active)}
                    aria-current={item.active ? "page" : undefined}
                    onClick={item.onClick}
                    type="button"
                  >
                    <Icon color={item.active ? "brand" : "inverse"} name={item.icon} size={20} />

                    <Text as="span" color={item.active ? "brand" : "inverse"} fontSize="sm" semibold={item.active}>
                      {item.label}
                    </Text>
                  </SidebarItemButton>
                </li>
              ))}
            </SidebarItemList>
          </SidebarSection>
        ))}
      </SidebarNav>

      {footer && <SidebarFooter>{footer}</SidebarFooter>}
    </SidebarWrapper>
  )
}
