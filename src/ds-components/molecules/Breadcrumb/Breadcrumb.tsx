import type { CSSProperties, MouseEvent } from "react"

import type { IconName } from "@/ds-components/atoms"
import { Icon } from "@/ds-components/atoms"

import {
  StyledBreadcrumbButton,
  StyledBreadcrumbCurrent,
  StyledBreadcrumbItem,
  StyledBreadcrumbLink,
  StyledBreadcrumbList,
  StyledBreadcrumbText,
} from "./Breadcrumb.styles"

export type BreadcrumbItem = {
  key: string
  label: string
  href?: string
  icon?: IconName
  onClick?: () => void
}

export type BreadcrumbProps = {
  items: BreadcrumbItem[]
  label: string
  className?: string
  style?: CSSProperties
}

// A click the browser should handle itself (middle button, or modified to open a new tab/window).
const isModifiedClick = (event: MouseEvent) =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey

// The trail of pages leading to the current one. The last item is the current page: plain text marked
// aria-current="page", never a link. An earlier item is a link when it has an href, a button when it
// has only an onClick, and plain text (e.g. a menu group that has no page of its own) when it has
// neither. An item's icon shows before its label (the AppShell gives the first one the icon of its menu
// entry). When an item has both, a plain click runs onClick instead of following the href - so a
// client-side router can navigate - while a modified click (new tab) still follows it.
// It owns no copy: `label` is the accessible name of the <nav>.
export const Breadcrumb = (props: BreadcrumbProps) => {
  const { className, items, label, style } = props

  const handleLinkClick = (item: BreadcrumbItem) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!item.onClick || isModifiedClick(event)) return

    event.preventDefault()
    item.onClick()
  }

  const renderItem = (item: BreadcrumbItem, isLast: boolean) => {
    if (isLast) return <StyledBreadcrumbCurrent aria-current="page">{item.label}</StyledBreadcrumbCurrent>

    if (item.href) {
      return (
        <StyledBreadcrumbLink href={item.href} onClick={handleLinkClick(item)}>
          {item.label}
        </StyledBreadcrumbLink>
      )
    }

    if (item.onClick) {
      return (
        <StyledBreadcrumbButton onClick={item.onClick} type="button">
          {item.label}
        </StyledBreadcrumbButton>
      )
    }

    return <StyledBreadcrumbText>{item.label}</StyledBreadcrumbText>
  }

  return (
    <nav aria-label={label} className={className} style={style}>
      <StyledBreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <StyledBreadcrumbItem key={item.key}>
              {item.icon && <Icon color="secondary" name={item.icon} size={16} />}
              {renderItem(item, isLast)}
              {!isLast && <Icon color="muted" name="chevron-right" size={16} />}
            </StyledBreadcrumbItem>
          )
        })}
      </StyledBreadcrumbList>
    </nav>
  )
}
