import { type ReactNode, useEffect } from "react"

import { applySchoolColors, type SchoolColors } from "@/utils/theme"

// Sample school colors for the "Cor da escola" toolbar: every component on colors.primary and
// colors.accent follows them, as it follows a school's published identity in the app (see the
// "Foundation/Cor da escola" page). A light primary shows the contrast guard darkening it.
const schoolColorSamples: Record<string, SchoolColors | null> = {
  green: { primaryColor: "#2E7D32", secondaryColor: null },
  product: null,
  red: { primaryColor: "#B71C1C", secondaryColor: "#F9A825" },
  yellow: { primaryColor: "#FFD600", secondaryColor: "#1E88E5" },
}

type SchoolColorThemeProps = {
  children: ReactNode
  sample: string
}

export const SchoolColorTheme = (props: SchoolColorThemeProps) => {
  const { children, sample } = props

  useEffect(() => {
    applySchoolColors(schoolColorSamples[sample] ?? null)
  }, [sample])

  return children
}
