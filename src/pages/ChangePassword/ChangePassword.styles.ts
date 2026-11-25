import styled from "styled-components"

import { spacing } from "@/foundation"

import { photoBackdrop } from "../shared/backdrop/photoBackdrop"

// Same full-screen centering as the login and the password reset (the background itself comes from
// GlobalStyle, with the photoBackdrop over it). The grid is stretched to the full width, or the flex centering would shrink it to its
// content and squeeze the card.
export const ChangePasswordWrapper = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  padding: ${spacing[24]};
  ${photoBackdrop}

  & > * {
    width: 100%;
  }
`
