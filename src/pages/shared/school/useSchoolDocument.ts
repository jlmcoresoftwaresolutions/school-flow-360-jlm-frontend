import { useEffect } from "react"

import type { PublicBrandingResponse } from "@/models"
import { setDocumentIdentity } from "@/utils/documentIdentity"
import { applySchoolColors } from "@/utils/theme"

// The browser tab and the colors of a screen before signing in: with the school's published identity,
// its favicon, "<page> · <school>" and its colors; without one, the product's own. While the identity
// is unknown (undefined: being read, or unreadable) the colors kept from the last visit stay.
export const useSchoolDocument = (branding: PublicBrandingResponse | null | undefined, pageTitle: string) => {
  const faviconUrl = branding?.favicon?.url ?? null
  const isKnown = branding !== undefined
  const primaryColor = branding?.primaryColor
  const secondaryColor = branding?.secondaryColor ?? null
  const title = branding ? `${pageTitle} · ${branding.displayName}` : null

  useEffect(() => {
    setDocumentIdentity({ faviconUrl, title })
  }, [faviconUrl, title])

  useEffect(() => {
    if (!isKnown) return
    applySchoolColors(primaryColor ? { primaryColor, secondaryColor } : null)
  }, [isKnown, primaryColor, secondaryColor])
}
