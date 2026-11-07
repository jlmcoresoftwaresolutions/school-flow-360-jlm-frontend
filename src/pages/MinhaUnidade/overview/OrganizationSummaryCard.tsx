import { useTranslation } from "react-i18next"

import { Badge, Card, Icon, Text } from "@/ds-components/atoms"
import { spacing } from "@/foundation"
import type { Organization, OrganizationBranding } from "@/models"

import { InlineGroup, LogoBox, LogoImage, OrganizationSummary, OrganizationSummaryText } from "../MinhaUnidade.styles"
import { useStatusLabels } from "../shared/useStatusLabels"

export type OrganizationSummaryCardProps = {
  branding: OrganizationBranding
  organization: Organization
}

// The organization in use, at the very top, so nobody takes it for another one (AC-F1-01): its logo,
// display name and institutional name, its status (worded as the organization's, not a unit's) and its
// operation model.
export const OrganizationSummaryCard = (props: OrganizationSummaryCardProps) => {
  const { branding, organization } = props

  const { t } = useTranslation()
  const { operationModelLabel, organizationStatusLabel, statusTone } = useStatusLabels()

  return (
    <Card elevated style={{ padding: spacing[32] }}>
      <OrganizationSummary>
        <LogoBox>
          {branding.logoUrl ? (
            <LogoImage
              alt={t("minhaUnidade.overview.logoAlt", { name: branding.displayName })}
              src={branding.logoUrl}
            />
          ) : (
            <Icon color="muted" name="building-outline" size={40} />
          )}
        </LogoBox>

        <OrganizationSummaryText>
          <Text color="secondary" fontSize="xs" semibold uppercase>
            {t("minhaUnidade.overview.currentOrganization")}
          </Text>
          <Text as="h2" fontSize="2xl" bold>
            {branding.displayName}
          </Text>
          <Text color="secondary" fontSize="sm">
            {organization.institutionalName}
          </Text>
          <InlineGroup>
            <Badge tone={statusTone(organization.status)}>{organizationStatusLabel(organization.status)}</Badge>
            <Badge dot={false}>{operationModelLabel(organization.operationModel)}</Badge>
          </InlineGroup>
        </OrganizationSummaryText>
      </OrganizationSummary>
    </Card>
  )
}
