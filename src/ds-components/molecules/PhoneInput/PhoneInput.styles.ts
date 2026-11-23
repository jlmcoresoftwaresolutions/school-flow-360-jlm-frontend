import styled from "styled-components"

import { colors, motion, radius, spacing, typography, zIndex } from "@/foundation"

import { StyledInput } from "../Input/Input.styles"

export const PhoneInputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

// The country selector and the number side by side, as one field.
export const PhoneInputRow = styled.div`
  align-items: stretch;
  display: flex;
`

export type PhoneCountryProps = {
  // How many digits the selected calling code has (1 for "+1", 3 for "+351").
  $codeLength: number
  $size: "medium" | "small"
}

// As wide as the flag, the "+", the calling code and the chevron need - the fixed part (the same in both
// sizes: the paddings, the flag and the chevron) plus one "ch" (the width of a digit, in the selector's
// own font size) per character -, sliding to a new width when the country changes.
export const PhoneCountry = styled.div<PhoneCountryProps>`
  ${(props) => {
    const { $codeLength, $size } = props

    return `
      flex: 0 0 auto;
      font-size: ${$size === "small" ? typography.fontSize.sm : typography.fontSize.md}px;
      transition: width ${motion.duration.normal} ${motion.easing.ease};
      width: calc(${spacing[96]} + ${$codeLength + 1}ch);

      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }

      /* The country search is a search field (for password managers to skip it), without its native look. */
      input[type="search"] {
        appearance: none;
      }

      input[type="search"]::-webkit-search-cancel-button,
      input[type="search"]::-webkit-search-decoration {
        appearance: none;
        display: none;
      }
    `
  }}
`

// The number overlaps the selector's right border by one pixel, so the two read as a single field,
// and comes forward while focused so its whole border shows.
export const PhoneNumberInput = styled(StyledInput)`
  flex: 1;
  margin-left: -1px;
  min-width: 0;
  position: relative;

  &:focus {
    z-index: ${zIndex.base + 1};
  }
`

// A country: its flag beside its name and calling code in the open list, or beside the code alone closed.
export const PhoneCountryOption = styled.span`
  align-items: center;
  display: flex;
  gap: ${spacing[8]};
`

// The flag keeps its 3:2 shape and its place while it loads; a thin outline keeps a white flag visible.
export const PhoneCountryFlag = styled.span`
  aspect-ratio: 3 / 2;
  background: ${colors.neutral[100]};
  border-radius: ${radius.sm};
  box-shadow: 0 0 0 1px ${colors.neutral[200]};
  display: inline-flex;
  flex: 0 0 ${spacing[20]};
  overflow: hidden;

  svg {
    display: block;
    height: 100%;
    width: 100%;
  }
`
