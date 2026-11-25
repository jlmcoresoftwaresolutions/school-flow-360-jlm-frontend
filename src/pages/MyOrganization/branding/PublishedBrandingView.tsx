import { useTranslation } from "react-i18next"

import { DescriptionList } from "@/ds-components/molecules"
import type { OrganizationBranding } from "@/models"

import { BrandingLayout } from "../MyOrganization.styles"
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
    url ? t("myOrganization.branding.readOnlyPublished") : t("myOrganization.branding.readOnlyNotPublished")

  return (
    <TabCard>
      <BrandingLayout>
        <SectionCard
          description={t("myOrganization.branding.readOnlyDescription")}
          title={t("myOrganization.branding.readOnlyTitle")}
        >
          <DescriptionList
            columns={1}
            items={[
              { key: "primaryColor", label: t("myOrganization.branding.primaryColor"), value: branding.primaryColor },
              {
                key: "secondaryColor",
                label: t("myOrganization.branding.secondaryColor"),
                value: branding.secondaryColor,
              },
              { key: "logo", label: t("myOrganization.branding.logo"), value: published(branding.publishedLogoUrl) },
              {
                key: "favicon",
                label: t("myOrganization.branding.favicon"),
                value: published(branding.publishedFaviconUrl),
              },
            ]}
          />
        </SectionCard>

        <SectionCard
          description={t("myOrganization.branding.readOnlyPreviewDescription")}
          title={t("myOrganization.branding.previewTitle")}
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
