import type { CSSProperties } from "react"

import type { IconName } from "@/ds-components/atoms"
import { Icon } from "@/ds-components/atoms"

import {
  StyledPageHeader,
  StyledPageHeaderDescription,
  StyledPageHeaderText,
  StyledPageHeaderTitle,
} from "./PageHeader.styles"

export type PageHeaderProps = {
  title: string
  className?: string
  description?: string
  icon?: IconName
  style?: CSSProperties
}

// The top of every page: its title (the page's one <h1>), an optional description below it and an
// optional icon beside them.
export const PageHeader = (props: PageHeaderProps) => {
  const { className, description, icon, style, title } = props

  return (
    <StyledPageHeader className={className} style={style}>
      {icon && <Icon color="brand" name={icon} size={40} />}

      <StyledPageHeaderText>
        <StyledPageHeaderTitle>{title}</StyledPageHeaderTitle>
        {description && <StyledPageHeaderDescription>{description}</StyledPageHeaderDescription>}
      </StyledPageHeaderText>
    </StyledPageHeader>
  )
}
