import type { SxProps, Theme } from "@mui/material/styles"
import styled from "styled-components"

import { colors, motion, opacity, shadows, spacing } from "@/foundation"

export const SwitchWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

export const SwitchRow = styled.label`
  align-items: center;
  cursor: pointer;
  display: inline-flex;
  gap: ${spacing[8]};
`

export const getSwitchSx = (disabled?: boolean): SxProps<Theme> => ({
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
    backgroundColor: colors.primary[500],
    opacity: opacity.visible,
  },
  "& .MuiSwitch-thumb": {
    backgroundColor: colors.neutral[0],
    boxShadow: shadows.xs,
  },
  "& .MuiSwitch-track": {
    backgroundColor: colors.neutral[300],
    opacity: opacity.visible,
    transitionDuration: motion.duration.fast,
    transitionTimingFunction: motion.easing.ease,
  },
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? opacity.disabled : opacity.visible,
})
