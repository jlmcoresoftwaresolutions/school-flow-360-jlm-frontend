import { useTranslation } from "react-i18next"

import { DescriptionList } from "@/ds-components/molecules"
import type { OrganizationBranding } from "@/models"

import { BrandingLayout } from "../MyUnit.styles"
import { SectionCard } from "../shared/SectionCard"
import { TabCard } from "../shared/TabCard"
import { BrandingPreview } from "./BrandingPreview"

export type PublishedBrandingViewProps = {
  branding: OrganizationBranding
  displayName: string
}

// The visual identity for a reader (a Secretaria, matrix ORG-M04): the published one, which everybody
// sees, with its colors and whether a logo and favicon were published - nothing to change here, since
// the identity is defined by the Administration. Nothing published yet shows the app's own look.
export const PublishedBrandingView = (props: PublishedBrandingViewProps) => {
  const { branding, displayName } = props

  const { t } = useTranslation()

  const published = (url?: string) =>
    url ? t("myUnit.branding.readOnlyPublished") : t("myUnit.branding.readOnlyNotPublished")

  return (
    <TabCard>
      <BrandingLayout>
        <SectionCard description={t("myUnit.branding.readOnlyDescription")} title={t("myUnit.branding.readOnlyTitle")}>
          <DescriptionList
            columns={1}
            items={[
              { key: "primaryColor", label: t("myUnit.branding.primaryColor"), value: branding.primaryColor },
              { key: "secondaryColor", label: t("myUnit.branding.secondaryColor"), value: branding.secondaryColor },
              { key: "logo", label: t("myUnit.branding.logo"), value: published(branding.publishedLogoUrl) },
              { key: "favicon", label: t("myUnit.branding.favicon"), value: published(branding.publishedFaviconUrl) },
            ]}
          />
        </SectionCard>

        <SectionCard
          description={t("myUnit.branding.readOnlyPreviewDescription")}
          title={t("myUnit.branding.previewTitle")}
        >
          <BrandingPreview
            displayName={displayName}
            faviconUrl={branding.publishedFaviconUrl}
            logoUrl={branding.publishedLogoUrl}
            primaryColor={branding.primaryColor}
            secondaryColor={branding.secondaryColor}
          />
        </SectionCard>
      </BrandingLayout>
    </TabCard>
  )
}
