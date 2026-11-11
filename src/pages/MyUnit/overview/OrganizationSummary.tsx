import { useTranslation } from "react-i18next"

import { Badge, Icon, Text } from "@/ds-components/atoms"
import type { Organization, OrganizationBranding } from "@/models"

import { InlineGroup, LogoBox, LogoImage, OrganizationSummaryLayout, OrganizationSummaryText } from "../MyUnit.styles"
import { useStatusLabels } from "../shared/useStatusLabels"

export type OrganizationSummaryProps = {
  branding: OrganizationBranding
  organization: Organization
}

// The organization in use, at the top of the overview's main card, so nobody takes it for another one
// (AC-F1-01): its logo,
// display name and institutional name, its status (worded as the organization's, not a unit's) and its
// operation model.
export const OrganizationSummary = (props: OrganizationSummaryProps) => {
  const { branding, organization } = props

  const { t } = useTranslation()
  const { operationModelLabel, organizationStatusLabel, statusTone } = useStatusLabels()

  return (
    <OrganizationSummaryLayout>
      <LogoBox>
        {branding.logoUrl ? (
          <LogoImage alt={t("myUnit.overview.logoAlt", { name: organization.displayName })} src={branding.logoUrl} />
        ) : (
          <Icon color="muted" name="building-outline" size={40} />
        )}
      </LogoBox>

      <OrganizationSummaryText>
        <Text color="secondary" fontSize="xs" semibold uppercase>
          {t("myUnit.overview.currentOrganization")}
        </Text>
        <Text as="h2" fontSize="2xl" bold>
          {organization.displayName}
        </Text>
        <Text color="secondary" fontSize="sm">
          {organization.institutionalName}
        </Text>
        <InlineGroup>
          <Badge tone={statusTone(organization.status)}>{organizationStatusLabel(organization.status)}</Badge>
          <Badge dot={false}>{operationModelLabel(organization.operationModel)}</Badge>
        </InlineGroup>
      </OrganizationSummaryText>
    </OrganizationSummaryLayout>
  )
}
