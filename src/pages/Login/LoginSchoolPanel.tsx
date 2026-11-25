import { useState } from "react"
import { useTranslation } from "react-i18next"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"
import { Skeleton, Text } from "@/ds-components/atoms"
import { colors, spacing } from "@/foundation"
import type { PublicBrandingResponse } from "@/models"

import { LogoPlate, PoweredBy, ProductIcon, SchoolLogo, SchoolPanel, SchoolPanelBody } from "./Login.styles"

export type LoginSchoolPanelProps = {
  // What the school published: undefined while it is read, null when nothing was published.
  branding: PublicBrandingResponse | null | undefined
}

// A logo at least this wide for its height is a wordmark: it already carries the school's name, which
// isn't written again beside it (the image then names the school for screen readers).
const wordmarkRatio = 2

// The school's side of the login: its logo and name, large, and a welcome; the product only signs it at
// the bottom ("Powered by SchoolFlow360º"). While the identity is read the panel shows placeholders, so
// the product's look never flashes before the school's; without a published identity the product
// itself is the host. A logo that can't be loaded (an expired link, storage off) is dropped.
export const LoginSchoolPanel = (props: LoginSchoolPanelProps) => {
  const { branding } = props

  const { t } = useTranslation()

  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const [wordmarkLogo, setWordmarkLogo] = useState<string | null>(null)

  const logoUrl = branding?.logo?.url
  const showLogo = Boolean(logoUrl) && failedLogo !== logoUrl
  const isWordmark = showLogo && wordmarkLogo === logoUrl
  const name = branding ? branding.displayName : "SchoolFlow360º"

  const renderIdentity = () => {
    if (branding === undefined) {
      return (
        <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
          <Skeleton height={spacing[64]} variant="rect" width="160px" />
          <Skeleton height={spacing[24]} width="60%" />
        </div>
      )
    }

    return (
      <>
        {branding && showLogo && (
          <LogoPlate>
            <SchoolLogo
              alt={isWordmark ? name : ""}
              onError={() => setFailedLogo(logoUrl ?? null)}
              onLoad={(event) => {
                const image = event.currentTarget
                if (image.naturalWidth >= image.naturalHeight * wordmarkRatio) setWordmarkLogo(logoUrl ?? null)
              }}
              src={logoUrl}
            />
          </LogoPlate>
        )}
        {!branding && <ProductIcon alt="" src={schoolFlowIcon} />}
        {!isWordmark && (
          <Text as="p" color="inverse" fontSize="3xl" bold>
            {name}
          </Text>
        )}
      </>
    )
  }

  return (
    <SchoolPanel aria-label={branding === undefined ? undefined : name}>
      <SchoolPanelBody>
        {renderIdentity()}
        <Text as="p" style={{ color: colors.neutral[200] }}>
          {branding ? t("login.schoolWelcome") : t("login.productWelcome")}
        </Text>
      </SchoolPanelBody>

      {/* The product signs the page discreetly; it is the host only when the school published nothing. */}
      {branding && (
        <PoweredBy>
          <img alt="" src={schoolFlowIcon} />
          {/* A brand term, not translated copy (as in the menu). */}
          <Text as="p" fontSize="sm" style={{ color: "inherit" }}>
            Powered by SchoolFlow360º
          </Text>
        </PoweredBy>
      )}
    </SchoolPanel>
  )
}
