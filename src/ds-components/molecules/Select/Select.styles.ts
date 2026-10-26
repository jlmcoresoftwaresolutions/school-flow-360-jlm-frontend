import type { StylesConfig } from "react-select"
import styled from "styled-components"

import { colors, motion, shadows, spacing, typography, zIndex } from "@/foundation"

export const SelectWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

export type SelectStylesConfig = {
  borderRadius: string
  elevated: boolean
  hasError?: boolean
}

export const getSelectStyles = <Option>(config: SelectStylesConfig): StylesConfig<Option, false> => {
  const { borderRadius, elevated, hasError } = config

  // An error keeps the border red even while focused, so the state doesn't vanish on focus.
  const borderColorFor = (isFocused: boolean) => {
    if (hasError) return colors.danger[500]
    return isFocused ? colors.primary[500] : colors.neutral[300]
  }

  return {
    control: (base, state) => ({
      ...base,
      "&:hover": {
        borderColor: borderColorFor(state.isFocused),
      },
      background: state.isDisabled ? colors.neutral[50] : colors.neutral[0],
      borderColor: borderColorFor(state.isFocused),
      borderRadius,
      boxShadow: state.isFocused ? "none" : elevated ? shadows.sm : shadows.none,
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      minHeight: "unset",
      padding: `${spacing[12]} ${spacing[4]}`,
      transition: `border-color ${motion.duration.fast} ${motion.easing.ease}`,
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: `0 ${spacing[8]}`,
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    input: (base) => ({
      ...base,
      color: colors.neutral[900],
      fontFamily: typography.fontFamily.sans,
      margin: 0,
      padding: 0,
    }),
    menu: (base) => ({
      ...base,
      borderRadius,
      boxShadow: shadows.md,
      overflow: "hidden",
      zIndex: zIndex.dropdown,
    }),
    menuList: (base) => ({
      ...base,
      padding: spacing[4],
    }),
    option: (base, state) => {
      let background = "transparent"

      if (state.isSelected) {
        background = colors.primary[500]
      } else if (state.isFocused) {
        background = colors.primary[100]
      }

      return {
        ...base,
        background,
        borderRadius,
        color: state.isSelected ? colors.neutral[0] : colors.neutral[900],
        cursor: "pointer",
        padding: `${spacing[8]} ${spacing[12]}`,
      }
    },
    placeholder: (base) => ({
      ...base,
      color: colors.neutral[500],
    }),
    singleValue: (base, state) => ({
      ...base,
      color: state.isDisabled ? colors.neutral[500] : colors.neutral[900],
    }),
    valueContainer: (base) => ({
      ...base,
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.md,
      padding: `0 ${spacing[8]}`,
    }),
  }
}
