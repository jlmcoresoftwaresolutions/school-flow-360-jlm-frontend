import { useTranslation } from "react-i18next"

import { Icon, Text } from "@/ds-components/atoms"

import {
  PreviewAccent,
  PreviewBody,
  PreviewBrowserBar,
  PreviewBrowserTab,
  PreviewButton,
  PreviewFavicon,
  PreviewFrame,
  PreviewHeader,
  PreviewLogo,
} from "../MyUnit.styles"

export type BrandingPreviewProps = {
  displayName: string
  primaryColor: string
  secondaryColor: string
  faviconUrl?: string
  logoUrl?: string
}

// An illustration of the identity being edited: a browser tab with the favicon and display name, a
// header in the primary color with the logo, and the secondary color as an accent. It only reflects
// the draft - nothing changes for anyone until it is saved.
export const BrandingPreview = (props: BrandingPreviewProps) => {
  const { displayName, faviconUrl, logoUrl, primaryColor, secondaryColor } = props

  const { t } = useTranslation()

  const name = displayName.trim() || t("myUnit.branding.previewNamePlaceholder")

  return (
    <PreviewFrame aria-label={t("myUnit.branding.previewTitle")} role="img">
      <PreviewBrowserBar>
        <PreviewBrowserTab>
          {faviconUrl ? (
            <PreviewFavicon alt="" src={faviconUrl} />
          ) : (
            <Icon color="muted" name="file-outline" size={16} />
          )}
          <Text as="span" fontSize="xs">
            {name}
          </Text>
        </PreviewBrowserTab>
      </PreviewBrowserBar>

      <PreviewHeader $background={primaryColor}>
        {logoUrl && <PreviewLogo alt="" src={logoUrl} />}
        <Text as="span" color="inverse" fontSize="md" bold>
          {name}
        </Text>
      </PreviewHeader>

      <PreviewBody>
        <PreviewAccent $color={secondaryColor} />
        <Text fontSize="sm">{t("myUnit.branding.previewSample")}</Text>
        <PreviewButton $color={primaryColor}>{t("myUnit.branding.previewButton")}</PreviewButton>
      </PreviewBody>
    </PreviewFrame>
  )
}
