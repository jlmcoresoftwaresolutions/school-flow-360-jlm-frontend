import styled from "styled-components"

import { colors, radius, spacing } from "@/foundation"

export const LoginWrapper = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  padding: ${spacing[24]};
`

// The open sessions to choose from when the limit is reached: one row each, its description beside the
// button that ends it. On a narrow screen the button goes under the text.
export const SessionList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${spacing[12]};
  list-style: none;
  margin: 0;
  padding: 0;
`

export const SessionRow = styled.li`
  align-items: center;
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${radius.md};
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
  justify-content: space-between;
  padding: ${spacing[12]} ${spacing[16]};
`

export const SessionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`
