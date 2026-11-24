import { useState } from "react"

import { Text } from "@/ds-components/atoms"
import type { PublicBrandingResponse } from "@/models"

import { SchoolIdentityLogo, SchoolIdentityWrapper } from "./SchoolIdentity.styles"

export type SchoolIdentityProps = {
  // What the school published (usePublicBranding); nothing is shown without it.
  branding: PublicBrandingResponse | null
}

// The school's logo and name at the top of a screen before signing in, so the person sees whose
// address they opened. The name is the text; the logo beside it is decorative. A logo whose link
// can't be loaded (expired, storage off) is dropped, leaving the name.
export const SchoolIdentity = (props: SchoolIdentityProps) => {
  const { branding } = props

  const [failedLogo, setFailedLogo] = useState<string | null>(null)

  if (!branding) return null

  const logoUrl = branding.logo?.url
  const showLogo = Boolean(logoUrl) && failedLogo !== logoUrl

  return (
    <SchoolIdentityWrapper>
      {showLogo && <SchoolIdentityLogo alt="" onError={() => setFailedLogo(logoUrl ?? null)} src={logoUrl} />}
      <Text as="p" fontSize="lg" bold>
        {branding.displayName}
      </Text>
    </SchoolIdentityWrapper>
  )
}
