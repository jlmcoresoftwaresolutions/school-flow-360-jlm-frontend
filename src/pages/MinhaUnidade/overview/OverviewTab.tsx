import type { Organization, OrganizationBranding, OrganizationUpdate, SchoolUnit } from "@/models"

import { CardGrid, TabPanel } from "../MinhaUnidade.styles"
import { AddressSection } from "./AddressSection"
import { ContactSection } from "./ContactSection"
import { InstitutionalSection } from "./InstitutionalSection"
import { NotesSection } from "./NotesSection"
import { OrganizationSummaryCard } from "./OrganizationSummaryCard"
import { UnitsSummaryCard } from "./UnitsSummaryCard"

export type OverviewTabProps = {
  branding: OrganizationBranding
  organization: Organization
  units: SchoolUnit[]
  onCreateUnit: () => void
  onSaveOrganization: (update: Partial<OrganizationUpdate>) => Promise<boolean>
  onSeeAllUnits: () => void
}

// Minha Unidade's first tab (JLM-11): which organization is in use, its current data - each section
// read first and edited in place - and a summary of its units.
export const OverviewTab = (props: OverviewTabProps) => {
  const { branding, onCreateUnit, onSaveOrganization, onSeeAllUnits, organization, units } = props

  return (
    <TabPanel>
      <OrganizationSummaryCard branding={branding} organization={organization} />

      <InstitutionalSection branding={branding} onSave={onSaveOrganization} organization={organization} />

      <CardGrid>
        <ContactSection onSave={onSaveOrganization} organization={organization} />
        <UnitsSummaryCard onCreateUnit={onCreateUnit} onSeeAllUnits={onSeeAllUnits} units={units} />
      </CardGrid>

      <AddressSection onSave={onSaveOrganization} organization={organization} />

      <NotesSection onSave={onSaveOrganization} organization={organization} />
    </TabPanel>
  )
}
