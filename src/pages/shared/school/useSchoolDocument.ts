import { useEffect } from "react"

import type { PublicBrandingResponse } from "@/models"
import { setDocumentIdentity } from "@/utils/documentIdentity"
import { applySchoolColor } from "@/utils/theme"

// The browser tab and the color of a screen before signing in: with the school's published identity,
// its favicon, "<page> · <school>" and its primary color; without one, the product's own.
export const useSchoolDocument = (branding: PublicBrandingResponse | null, pageTitle: string) => {
  const faviconUrl = branding?.favicon?.url ?? null
  const primaryColor = branding?.primaryColor ?? null
  const title = branding ? `${pageTitle} · ${branding.displayName}` : null

  useEffect(() => {
    setDocumentIdentity({ faviconUrl, title })
  }, [faviconUrl, title])

  useEffect(() => {
    applySchoolColor(primaryColor)
  }, [primaryColor])
}
