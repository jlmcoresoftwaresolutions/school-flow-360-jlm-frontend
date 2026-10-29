import styled from "styled-components"

import { spacing } from "@/foundation"

// Same full-screen centering as the login (the background itself comes from GlobalStyle). The grid
// is stretched to the full width, or the flex centering would shrink it to its (short) content and
// squeeze the card.
export const ResetPasswordWrapper = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  padding: ${spacing[24]};

  & > * {
    width: 100%;
  }
`
