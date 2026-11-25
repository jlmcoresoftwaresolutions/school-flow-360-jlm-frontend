import type { StylesConfig } from "react-select"
import styled from "styled-components"

import { colors, motion, shadows, spacing, typography, zIndex } from "@/foundation"

export const SelectWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

// How many options the open menu shows before its list scrolls.
export const visibleMenuOptions = 5

const optionPaddingY = Number.parseFloat(spacing[8])
const menuListPadding = Number.parseFloat(spacing[4])

// The open menu's height for exactly five options of the size, from the same tokens the options use: each
// is its line (font size times line height) plus its vertical padding, and the list adds its own padding.
// An option whose label wraps takes more room, and the list scrolls sooner.
export const getMenuMaxHeight = (size: "medium" | "small"): number => {
  const fontSize = size === "small" ? typography.fontSize.sm : typography.fontSize.md
  const lineHeight = size === "small" ? typography.lineHeight.sm : typography.lineHeight.md
  const optionHeight = fontSize * lineHeight + optionPaddingY * 2

  return visibleMenuOptions * optionHeight + menuListPadding * 2
}

export type SelectStylesConfig = {
  borderRadius: string
  elevated: boolean
  size: "medium" | "small"
  hasError?: boolean
}

export const getSelectStyles = <Option>(config: SelectStylesConfig): StylesConfig<Option, false> => {
  const { borderRadius, elevated, hasError, size } = config
  const isSmall = size === "small"

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
      padding: `${isSmall ? spacing[8] : spacing[12]} ${spacing[4]}`,
      transition: `border-color ${motion.duration.normal} ${motion.easing.ease}`,
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
    }),
    menuList: (base) => ({
      ...base,
      padding: spacing[4],
    }),
    // The menu is portaled to document.body (see Select.tsx), so it is never clipped by a Modal body or a
    // card with overflow, and this layer keeps it above a Modal (and its overlay) that it opens from.
    menuPortal: (base) => ({
      ...base,
      zIndex: zIndex.popover,
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
        // Set explicitly, so every option is as tall as getMenuMaxHeight counts.
        fontSize: `${isSmall ? typography.fontSize.sm : typography.fontSize.md}px`,
        lineHeight: isSmall ? typography.lineHeight.sm : typography.lineHeight.md,
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
      fontSize: isSmall ? typography.fontSize.sm : typography.fontSize.md,
      padding: `0 ${spacing[8]}`,
    }),
  }
}
