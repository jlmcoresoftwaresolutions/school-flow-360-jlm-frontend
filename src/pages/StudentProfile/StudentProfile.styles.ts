import styled from "styled-components"

import { spacing } from "@/foundation"

// Below the page header: the student's status and code on the left, its actions on the right.
export const ProfileBar = styled.div`
  align-items: center;
  display: flex;
  gap: ${spacing[12]};
  justify-content: space-between;
  margin-bottom: ${spacing[16]};
`

export const ProfileBarInfo = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
`
