import styled from "styled-components"

import { colors, spacing } from "@/foundation"

// The 100vh line is a fallback for browsers without dvh: on mobile, 100vh includes the area the
// collapsing address bar covers, so dvh (the currently visible height) is what actually fills the
// screen. Sidebar's own height is 100%, so it follows whatever height this wrapper resolves to.
export const AppShellWrapper = styled.div`
  display: flex;
  height: 100vh;
  height: 100dvh;
`

export const AppShellContent = styled.main`
  background: ${colors.neutral[50]};
  flex: 1;
  overflow-y: auto;
  padding: ${spacing[32]};
`
