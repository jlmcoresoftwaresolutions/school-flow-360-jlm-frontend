import type { CSSProperties } from "react"
import { useEffect, useId, useRef, useState } from "react"

import type { IconName } from "@/ds-components/atoms"
import { IconButton, Image, Skeleton, useTooltip } from "@/ds-components/atoms"
import { media, spacing } from "@/foundation"
import { useMediaQuery } from "@/hooks"

import {
  SidebarBackdrop,
  SidebarBottom,
  SidebarBrand,
  SidebarBrandInfo,
  SidebarBrandSubtitle,
  SidebarBrandText,
  SidebarBrandTitle,
  SidebarItemList,
  SidebarNav,
  SidebarNavContent,
  SidebarPanel,
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
  // The brand (logo, title and subtitle) is still being read: placeholders take its place, so a school's
  // identity doesn't replace the product's a moment after the page shows.
  brandLoading?: boolean
  className?: string
  collapseLabel?: string
  expandLabel?: string
  navLabel?: string
  style?: CSSProperties
  // A discreet line under the title (e.g. "Powered by SchoolFlow360º" when the title is a school's name).
  subtitle?: string
}

// "Compact" is every screen narrower than the md breakpoint: `not all and (min-width: 768px)`
// is that breakpoint's own media token, negated, so the two can't drift apart.
const compactQuery = `not all and ${media.md}`

// A title longer than this is set a step smaller, so a school's long name fits in two lines.
const longTitleLength = 20

// On compact screens the sidebar is an icon-only rail with a button that opens it over the content;
// on wider screens it is always fully expanded and that button doesn't exist.
export const Sidebar = (props: SidebarProps) => {
  const {
    bottomItems = [],
    brandLoading = false,
    className,
    collapseLabel = "Recolher menu",
    expandLabel = "Expandir menu",
    items,
    logoAlt,
    logoSrc,
    navLabel = "Navegação principal",
    style,
    subtitle,
    title,
  } = props

  const titleRef = useRef<HTMLParagraphElement>(null)

  const panelId = useId()

  const isCompact = useMediaQuery(compactQuery)

  // Whether the title is still cut after two lines: only then the whole name shows on hover.
  const [isTitleCut, setIsTitleCut] = useState(false)

  const { tooltipElement, tooltipHandlers } = useTooltip(isTitleCut ? title : undefined)

  const [isOpen, setIsOpen] = useState(false)
  // Which group is open. undefined means "not chosen by the user yet" - the group holding the current
  // page is then the open one, so it opens by itself on navigation without needing an effect; null
  // means the user closed everything. Only one group is ever open: opening one closes the other.
  const [openGroupKey, setOpenGroupKey] = useState<null | string | undefined>(undefined)

  const isOverlay = isCompact && isOpen
  const isCollapsed = isCompact && !isOpen

  const activeGroupKey = [...items, ...bottomItems].find((item) => item.children?.some((child) => child.active))?.key
  const expandedGroupKey = openGroupKey === undefined ? activeGroupKey : openGroupKey

  // The title is measured again whenever it changes size (another name, a narrower panel).
  useEffect(() => {
    const element = titleRef.current
    if (!element || typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(() => setIsTitleCut(element.scrollHeight > element.clientHeight + 1))
    observer.observe(element)

    return () => observer.disconnect()
  }, [title, brandLoading])

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
          <SidebarBrandInfo $collapsed={isCollapsed} aria-busy={brandLoading || undefined}>
            {brandLoading ? (
              <>
                <Skeleton height={spacing[32]} style={{ flexShrink: 0 }} variant="rect" width={spacing[32]} />
                <SidebarBrandText style={{ gap: spacing[4] }}>
                  <Skeleton height={spacing[20]} width="70%" />
                  <Skeleton height={spacing[12]} width="50%" />
                </SidebarBrandText>
              </>
            ) : (
              <>
                {/* Image defaults to align-self: flex-start, which would pin the logo to the top of a row that the toggle button makes taller. */}
                <Image
                  alt={logoAlt}
                  borderRadius="low"
                  boxShadow="none"
                  size={32}
                  src={logoSrc}
                  style={{ alignSelf: "center", flexShrink: 0, objectFit: "contain" }}
                />

                <SidebarBrandText>
                  <SidebarBrandTitle
                    ref={titleRef}
                    $long={title.length > longTitleLength}
                    tabIndex={isTitleCut ? 0 : undefined}
                    {...tooltipHandlers}
                  >
                    {title}
                  </SidebarBrandTitle>
                  {tooltipElement}
                  {subtitle && <SidebarBrandSubtitle>{subtitle}</SidebarBrandSubtitle>}
                </SidebarBrandText>
              </>
            )}
          </SidebarBrandInfo>

          {isCompact && (
            <IconButton
              aria-controls={panelId}
              aria-expanded={isOpen}
              icon={isOpen ? "x" : "menu"}
              label={isOpen ? collapseLabel : expandLabel}
              onClick={isOpen ? collapse : expand}
              tooltip=""
            />
          )}
        </SidebarBrand>

        <SidebarNav $collapsed={isCollapsed} aria-label={navLabel}>
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
