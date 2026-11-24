import styled from "styled-components"

import { spacing } from "@/foundation"

export const SchoolIdentityWrapper = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
`

// A logo may be up to 4:1 (the backend's rule): it keeps its proportion inside a fixed height, never
// cropped like the square Image atom.
export const SchoolIdentityLogo = styled.img`
  height: ${spacing[48]};
  max-width: 100%;
  object-fit: contain;
  width: auto;
`
