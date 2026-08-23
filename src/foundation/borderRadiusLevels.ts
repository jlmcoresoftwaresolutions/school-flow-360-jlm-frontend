import { radius } from "./radius"

export const borderRadiusLevels = {
  full: radius.full,
  high: radius["5xl"],
  low: radius.md,
  medium: radius.xl,
  subtle: radius.sm,
}

export type BorderRadiusLevelsType = typeof borderRadiusLevels
