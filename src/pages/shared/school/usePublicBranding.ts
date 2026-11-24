import { useEffect, useState } from "react"

import type { PublicBrandingResponse } from "@/models"
import { getPublicBranding } from "@/services/branding"
import { getErrorCode } from "@/services/httpClient"

// What the address's school published (name, colors, logo), for the screens before signing in. null
// when nothing was published (404 BRANDING_NOT_PUBLISHED); undefined while it is read or when it can't
// be, so the colors kept from the last visit stay. Either way the screen never waits for it. An address whose school doesn't exist
// (404 TENANT_NOT_FOUND) leaves for the page that says so, through the httpClient. The logo's link
// lasts 5 minutes: it is shown, never stored.
export const usePublicBranding = (): PublicBrandingResponse | null | undefined => {
  const [branding, setBranding] = useState<PublicBrandingResponse | null | undefined>(undefined)

  useEffect(() => {
    let stale = false

    const read = async () => {
      try {
        const published = await getPublicBranding({ showLoading: false })
        if (!stale) setBranding(published)
      } catch (error) {
        if (!stale && getErrorCode(error) === "BRANDING_NOT_PUBLISHED") setBranding(null)
      }
    }

    void read()

    return () => {
      stale = true
    }
  }, [])

  return branding
}
