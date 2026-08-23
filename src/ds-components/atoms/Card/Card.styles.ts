import styled, { css } from "styled-components"

import { spacing } from "@/foundation"

export type StyledCardProps = {
  $background: string
  $border: string
  $borderRadius: string
  $backdropFilter?: string
  $boxShadow?: string
}

export const StyledCard = styled.div<StyledCardProps>`
  ${(props) => {
    const { $backdropFilter, $background, $border, $borderRadius, $boxShadow } = props

    return css`
      background: ${$background};
      border-radius: ${$borderRadius};
      border: ${$border};
      overflow: hidden;
      padding: ${spacing[12]};
      ${$backdropFilter &&
      css`
        backdrop-filter: ${$backdropFilter};
      `}
      ${$boxShadow &&
      css`
        box-shadow: ${$boxShadow};
      `}
    `
  }}
`
