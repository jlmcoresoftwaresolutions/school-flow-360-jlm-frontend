import styled from "styled-components"

import { colors, media, spacing } from "@/foundation"

// The 100vh line is a fallback for browsers without dvh: on mobile, 100vh includes the area the
// collapsing address bar covers, so dvh (the currently visible height) is what actually fills the
// screen. Sidebar's own height is 100%, so it follows whatever height this wrapper resolves to.
export const AppShellWrapper = styled.div`
  display: flex;
  height: 100vh;
  height: 100dvh;
`

// min-width: 0 lets the column shrink below its content's width (a wide table, a long breadcrumb)
// instead of pushing the page into horizontal scroll; only AppShellContent below it scrolls.
export const AppShellBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
`

export const AppShellContent = styled.main`
  background: ${colors.neutral[50]};
  flex: 1;
  overflow-y: auto;
  padding: ${spacing[16]};

  @media ${media.md} {
    padding: ${spacing[32]};
  }
`
