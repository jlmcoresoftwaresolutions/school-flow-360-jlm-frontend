import { useEffect, useState } from "react"

import type { PublicBrandingResponse } from "@/models"
import { getPublicBranding } from "@/services/branding"

// What the address's school published (name, colors, logo), for the screens before signing in. null
// while it is read, when nothing was published (404 BRANDING_NOT_PUBLISHED) or when it can't be read:
// the screen keeps the default look and never waits for it. An address whose school doesn't exist
// (404 TENANT_NOT_FOUND) leaves for the page that says so, through the httpClient. The logo's link
// lasts 5 minutes: it is shown, never stored.
export const usePublicBranding = (): PublicBrandingResponse | null => {
  const [branding, setBranding] = useState<PublicBrandingResponse | null>(null)

  useEffect(() => {
    let stale = false

    const read = async () => {
      try {
        const published = await getPublicBranding({ showLoading: false })
        if (!stale) setBranding(published)
      } catch {
        // The default look stays.
      }
    }

    void read()

    return () => {
      stale = true
    }
  }, [])

  return branding
}
