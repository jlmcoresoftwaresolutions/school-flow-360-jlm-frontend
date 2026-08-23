import styled, { css } from "styled-components"

export type StyledIconWrapperProps = { $color: string }

export const StyledIconWrapper = styled.span<StyledIconWrapperProps>`
  ${(props) => {
    const { $color } = props

    return css`
      align-items: center;
      color: ${$color};
      display: inline-flex;
      justify-content: center;
    `
  }}
`
