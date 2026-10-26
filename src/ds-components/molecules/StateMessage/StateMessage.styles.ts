import styled from "styled-components"

import { colors, radius, spacing } from "@/foundation"

export type StateMessageVariant = "empty" | "error" | "restricted"

export const stateIconBackgroundMap: Record<StateMessageVariant, string> = {
  empty: colors.neutral[100],
  error: colors.danger[50],
  restricted: colors.warning[50],
}

export const StyledStateMessage = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${spacing[16]};
  padding: ${spacing[48]} ${spacing[24]};
  text-align: center;
`

export type StyledStateIconProps = {
  $background: string
}

export const StyledStateIcon = styled.div<StyledStateIconProps>`
  align-items: center;
  background: ${(props) => props.$background};
  border-radius: ${radius.full};
  display: flex;
  height: ${spacing[64]};
  justify-content: center;
  width: ${spacing[64]};
`

export const StyledStateText = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
  max-width: calc(${spacing[256]} + ${spacing[128]});
`
