import styled from "styled-components"

import { spacing } from "@/foundation"

import { photoBackdrop } from "../shared/backdrop/photoBackdrop"

// Same full-screen centering as the login (the background itself comes from GlobalStyle, with the photoBackdrop over it).
export const UnknownSchoolWrapper = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  padding: ${spacing[24]};
  ${photoBackdrop}

  /* Without a form inside, the centered grid would shrink to its text: it takes the whole width. */
  > * {
    width: 100%;
  }
`

// The example of a school's address, kept on one line, and the help below it.
export const UnknownSchoolHint = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${spacing[12]};
`
