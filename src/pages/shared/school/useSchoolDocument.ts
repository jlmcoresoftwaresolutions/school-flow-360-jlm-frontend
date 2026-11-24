import { useEffect } from "react"

import type { PublicBrandingResponse } from "@/models"
import { setDocumentIdentity } from "@/utils/documentIdentity"

// The browser tab of a screen before signing in: with the school's published identity, its favicon
// and "<page> · <school>"; without one, the product's own.
export const useSchoolDocument = (branding: PublicBrandingResponse | null, pageTitle: string) => {
  const faviconUrl = branding?.favicon?.url ?? null
  const title = branding ? `${pageTitle} · ${branding.displayName}` : null

  useEffect(() => {
    setDocumentIdentity({ faviconUrl, title })
  }, [faviconUrl, title])
}
