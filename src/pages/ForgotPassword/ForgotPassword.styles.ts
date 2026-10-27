import styled from "styled-components"

import { spacing } from "@/foundation"

// Same full-screen centering as the login (the background itself comes from GlobalStyle).
export const ForgotPasswordWrapper = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  padding: ${spacing[24]};
`
