import styled from "styled-components"

import { colors, spacing } from "@/foundation"

export const AppShellWrapper = styled.div`
  display: flex;
  height: 100vh;
`

export const AppShellContent = styled.main`
  background: ${colors.neutral[50]};
  flex: 1;
  overflow-y: auto;
  padding: ${spacing[32]};
`
