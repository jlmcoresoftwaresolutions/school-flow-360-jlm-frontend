import styled from "styled-components"

import { spacing, zIndex } from "@/foundation"

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
  $size: "medium" | "small"
}

// Wide enough for a code and the longest calling code ("BR +55", "FI +358").
export const PhoneCountry = styled.div<PhoneCountryProps>`
  flex: 0 0 ${(props) => (props.$size === "small" ? spacing[112] : spacing[128])};
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
