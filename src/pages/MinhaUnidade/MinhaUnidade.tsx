import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Button, Card, Skeleton } from "@/ds-components/atoms"
import { PageHeader, StateMessage, Tabs } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import type {
  Organization,
  OrganizationBranding,
  OrganizationBrandingUpdate,
  OrganizationUpdate,
  SchoolUnit,
  SchoolUnitInput,
} from "@/models"
import {
  createSchoolUnit,
  getBranding,
  getCurrentOrganization,
  inactivateSchoolUnit,
  listSchoolUnits,
  updateBranding,
  updateOrganization,
  updateSchoolUnit,
} from "@/services/organization"

import { BrandingTab } from "./branding/BrandingTab"
import type { MinhaUnidadeTab } from "./MinhaUnidade.constants"
import { TabPanel } from "./MinhaUnidade.styles"
import { OverviewTab } from "./overview/OverviewTab"
import { UnitsTab } from "./units/UnitsTab"

type PageData = {
  branding: OrganizationBranding
  organization: Organization
  units: SchoolUnit[]
}

const toOrganizationUpdate = (organization: Organization): OrganizationUpdate => ({
  address: organization.address,
  contactEmail: organization.contactEmail,
  contactPhone: organization.contactPhone,
  institutionalName: organization.institutionalName,
  internalNotes: organization.internalNotes,
  operationModel: organization.operationModel,
})

const LoadingState = () => (
  <TabPanel aria-hidden="true">
    {[0, 1, 2].map((index) => (
      <Card
        key={index}
        elevated
        style={{ display: "flex", flexDirection: "column", gap: spacing[12], padding: spacing[32] }}
      >
        <Skeleton height={spacing[24]} width="40%" />
        <Skeleton height={spacing[16]} width="90%" />
        <Skeleton height={spacing[16]} width="70%" />
      </Card>
    ))}
  </TabPanel>
)

// Minha Unidade: the organization the user works in (JLM-11), in three tabs - its overview, its
// visual identity and its units. The data comes from services/organization, mocked until the API
// offers the signed-in user's organization. Every tab stays mounted and only the others are hidden, so
// an edit in progress survives switching tabs; the tabs are attached to the card right below them.
export const MinhaUnidade = () => {
  const { t } = useTranslation()

  const [data, setData] = useState<PageData | null>(null)
  const [hasError, setHasError] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [tab, setTab] = useState<MinhaUnidadeTab>("overview")
  const [isCreatingUnit, setIsCreatingUnit] = useState(false)

  // The fetch is defined inline inside the effect, rather than as an outer useCallback referenced
  // here, so react-hooks/set-state-in-effect doesn't flag it. handleRetry bumps reloadToken instead of
  // calling this fetch directly, re-running the effect; `ignore` drops an answer that arrives after the
  // effect was cleaned up (a retry, or StrictMode's double run).
  useEffect(() => {
    let ignore = false

    const load = async () => {
      try {
        const [organization, branding, units] = await Promise.all([
          getCurrentOrganization({ showLoading: false }),
          getBranding({ showLoading: false }),
          listSchoolUnits({ showLoading: false }),
        ])

        if (!ignore) setData({ branding, organization, units })
      } catch {
        if (!ignore) setHasError(true)
      }
    }

    void load()

    return () => {
      ignore = true
    }
  }, [reloadToken])

  const handleRetry = () => {
    setHasError(false)
    setData(null)
    setReloadToken((current) => current + 1)
  }

  // Every save reports whether it worked, so the form that asked closes only on success and keeps the
  // draft otherwise.
  const runSave = async <T,>(save: () => Promise<T>, apply: (result: T) => void, successMessage: string) => {
    try {
      apply(await save())
      toast.success(successMessage)
      return true
    } catch {
      toast.error(t("minhaUnidade.saveError"))
      return false
    }
  }

  const replaceUnit = (unit: SchoolUnit) =>
    setData((current) =>
      current ? { ...current, units: current.units.map((item) => (item.id === unit.id ? unit : item)) } : current,
    )

  const handleSaveOrganization = (update: Partial<OrganizationUpdate>) =>
    runSave(
      () => updateOrganization({ ...toOrganizationUpdate(data!.organization), ...update }),
      (organization) => setData((current) => (current ? { ...current, organization } : current)),
      t("minhaUnidade.overview.saved"),
    )

  const handleSaveBranding = (update: OrganizationBrandingUpdate) =>
    runSave(
      () => updateBranding(update),
      (branding) => setData((current) => (current ? { ...current, branding } : current)),
      t("minhaUnidade.branding.saved"),
    )

  const handleCreateUnit = (input: SchoolUnitInput) =>
    runSave(
      () => createSchoolUnit(input),
      (unit) => setData((current) => (current ? { ...current, units: [...current.units, unit] } : current)),
      t("minhaUnidade.units.created"),
    )

  const handleUpdateUnit = (unit: SchoolUnit, input: SchoolUnitInput) =>
    runSave(() => updateSchoolUnit(unit.id, input), replaceUnit, t("minhaUnidade.units.updated"))

  const handleInactivateUnit = (unit: SchoolUnit, reason: string) =>
    runSave(() => inactivateSchoolUnit(unit.id, { reason }), replaceUnit, t("minhaUnidade.units.inactivated"))

  // From the overview's empty units summary: straight to the units tab, with the form open.
  const handleCreateFromOverview = () => {
    setTab("units")
    setIsCreatingUnit(true)
  }

  const renderContent = () => {
    if (hasError) {
      return (
        <Card elevated style={{ padding: spacing[32] }}>
          <StateMessage
            action={<Button onClick={handleRetry}>{t("common.tryAgain")}</Button>}
            description={t("minhaUnidade.loadErrorDescription")}
            title={t("minhaUnidade.loadError")}
            variant="error"
          />
        </Card>
      )
    }

    if (!data) return <LoadingState />

    return (
      <>
        <div hidden={tab !== "overview"}>
          <OverviewTab
            branding={data.branding}
            onCreateUnit={handleCreateFromOverview}
            onSaveOrganization={handleSaveOrganization}
            onSeeAllUnits={() => setTab("units")}
            organization={data.organization}
            units={data.units}
          />
        </div>
        <div hidden={tab !== "branding"}>
          <BrandingTab branding={data.branding} onSave={handleSaveBranding} />
        </div>
        <div hidden={tab !== "units"}>
          <UnitsTab
            isCreating={isCreatingUnit}
            onCreate={handleCreateUnit}
            onCreatingChange={setIsCreatingUnit}
            onInactivate={handleInactivateUnit}
            onUpdate={handleUpdateUnit}
            units={data.units}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader description={t("minhaUnidade.subtitle")} icon="building-outline" title={t("minhaUnidade.title")} />

      <Tabs
        items={[
          { icon: "info-outline", key: "overview", label: t("minhaUnidade.tabs.overview") },
          { icon: "palette-outline", key: "branding", label: t("minhaUnidade.tabs.branding") },
          { icon: "location-outline", key: "units", label: t("minhaUnidade.tabs.units") },
        ]}
        label={t("minhaUnidade.sectionsLabel")}
        onChange={(key) => setTab(key as MinhaUnidadeTab)}
        value={tab}
        attached
      />

      {renderContent()}
    </>
  )
}
