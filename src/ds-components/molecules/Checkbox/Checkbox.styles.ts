import styled from "styled-components"

import { colors, opacity, spacing } from "@/foundation"

export const CheckboxWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

export const CheckboxRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${spacing[8]};
`

export const StyledCheckbox = styled.input`
  accent-color: ${colors.primary[500]};
  cursor: pointer;
  height: ${spacing[20]};
  width: ${spacing[20]};

  &:disabled {
    cursor: not-allowed;
    opacity: ${opacity.disabled};
  }
`
