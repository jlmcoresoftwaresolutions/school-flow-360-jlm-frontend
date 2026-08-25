import type { SxProps, Theme } from "@mui/material/styles"
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

export type CheckboxSize = "large" | "medium" | "small"

const iconSizeStyles: Record<CheckboxSize, string> = {
  large: spacing[24],
  medium: spacing[20],
  small: spacing[16],
}

export const getCheckboxSx = (size: CheckboxSize, disabled?: boolean): SxProps<Theme> => ({
  "&.Mui-checked": {
    color: colors.primary[500],
  },
  "& .MuiSvgIcon-root": {
    fontSize: iconSizeStyles[size],
  },
  color: colors.neutral[400],
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? opacity.disabled : opacity.visible,
  padding: 0,
})
