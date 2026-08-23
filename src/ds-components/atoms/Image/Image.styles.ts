import styled, { css } from "styled-components"

export type StyledImageProps = { $borderRadius: string; $boxShadow: string; $size: string }

export const StyledImage = styled.img<StyledImageProps>`
  ${(props) => {
    const { $borderRadius, $boxShadow, $size } = props

    return css`
      align-self: flex-start;
      border-radius: ${$borderRadius};
      box-shadow: ${$boxShadow};
      height: ${$size};
      object-fit: cover;
      width: ${$size};
    `
  }}
`
