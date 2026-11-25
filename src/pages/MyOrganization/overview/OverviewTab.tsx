import { useTranslation } from "react-i18next"

import { Text } from "@/ds-components/atoms"
import type { Organization, OrganizationBranding, OrganizationUpdate, SchoolUnit } from "@/models"

import { CardGrid } from "../MyOrganization.styles"
import { useCanManageMyOrganization } from "../shared/myOrganizationAccess"
import type { SaveResult } from "../shared/saveResult"
import { TabCard } from "../shared/TabCard"
import { AddressSection } from "./AddressSection"
import { ContactSection } from "./ContactSection"
import { InstitutionalSection } from "./InstitutionalSection"
import { NotesSection } from "./NotesSection"
import { OrganizationSummary } from "./OrganizationSummary"
import { UnitsSummaryCard } from "./UnitsSummaryCard"

export type OverviewTabProps = {
  branding: OrganizationBranding
  organization: Organization
  units: SchoolUnit[]
  onCreateUnit: () => void
  onSaveOrganization: (update: OrganizationUpdate) => Promise<SaveResult>
  onSeeAllUnits: () => void
}

// Minha Organização's first tab (JLM-11), one main card: which organization is in use at its top, then its
// current data in sub-cards - each read first and edited in place - and a summary of its units. A
// reader (a Secretaria) gets the same view without editing, and without the address and the internal
// notes, which its summary doesn't bring.
export const OverviewTab = (props: OverviewTabProps) => {
  const { branding, onCreateUnit, onSaveOrganization, onSeeAllUnits, organization, units } = props

  const { t } = useTranslation()
  const canManage = useCanManageMyOrganization()

  return (
    <TabCard>
      <OrganizationSummary branding={branding} organization={organization} />

      {!canManage && (
        <Text color="secondary" fontSize="sm">
          {t("myOrganization.readOnlyNotice")}
        </Text>
      )}

      <InstitutionalSection onSave={onSaveOrganization} organization={organization} />

      <CardGrid>
        <ContactSection onSave={onSaveOrganization} organization={organization} />
        <UnitsSummaryCard onCreateUnit={onCreateUnit} onSeeAllUnits={onSeeAllUnits} units={units} />
      </CardGrid>

      {canManage && <AddressSection onSave={onSaveOrganization} organization={organization} />}

      {canManage && <NotesSection onSave={onSaveOrganization} organization={organization} />}
    </TabCard>
  )
}
