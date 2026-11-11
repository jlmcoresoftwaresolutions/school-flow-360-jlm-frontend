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
} from "@/models"
import { getErrorStatus } from "@/services/httpClient"
import {
  getBranding,
  getCurrentOrganization,
  listSchoolUnits,
  updateBranding,
  updateOrganization,
} from "@/services/organization"
import { defaultCountry, isCountry } from "@/utils/countries"

import { BrandingTab } from "./branding/BrandingTab"
import type { MyUnitTab } from "./MyUnit.constants"
import { SubCard } from "./MyUnit.styles"
import { OverviewTab } from "./overview/OverviewTab"
import { OrganizationCountryContext } from "./shared/organizationCountry"
import { TabCard } from "./shared/TabCard"
import { UnitsTab } from "./units/UnitsTab"

type PageData = {
  branding: OrganizationBranding
  organization: Organization
  units: SchoolUnit[]
}

// The same shape as a tab: one main card with its sub-cards, each a few placeholder lines.
const LoadingState = () => (
  <div aria-hidden="true">
    <TabCard>
      {[0, 1, 2].map((index) => (
        <SubCard key={index} style={{ display: "flex", flexDirection: "column", gap: spacing[12] }}>
          <Skeleton height={spacing[24]} width="40%" />
          <Skeleton height={spacing[16]} width="90%" />
          <Skeleton height={spacing[16]} width="70%" />
        </SubCard>
      ))}
    </TabCard>
  </div>
)

// Minha Unidade: the organization the user works in (JLM-11), in three tabs - its overview, its
// visual identity and its units. The data comes from services/organization, which is being wired to
// the backend a call at a time (the rest is mocked). Every tab stays mounted and only the others are hidden, so
// an edit in progress survives switching tabs. Each tab is one main card (TabCard), attached to the tabs
// above it, with its sections inside as sub-cards (SectionCard).
export const MyUnit = () => {
  const { t } = useTranslation()

  const [data, setData] = useState<PageData | null>(null)
  const [hasError, setHasError] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [tab, setTab] = useState<MyUnitTab>("overview")
  const [isCreatingUnit, setIsCreatingUnit] = useState(false)
  // Bumped to remount the overview, dropping its drafts, when a save found the organization changed.
  const [overviewKey, setOverviewKey] = useState(0)
  // The same for the visual identity tab.
  const [brandingKey, setBrandingKey] = useState(0)

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

  const applyOrganization = (organization: Organization) =>
    setData((current) => (current ? { ...current, organization } : current))

  // A 409 means someone else changed the organization since it was read: the save is dropped, the
  // current data is read again and the overview goes back to reading, for the user to redo the change.
  const handleSaveOrganization = async (update: OrganizationUpdate) => {
    try {
      applyOrganization(await updateOrganization(update))
      toast.success(t("myUnit.overview.saved"))
      return true
    } catch (error) {
      if (getErrorStatus(error) !== 409) {
        toast.error(t("myUnit.saveError"))
        return false
      }
    }

    try {
      applyOrganization(await getCurrentOrganization())
      setOverviewKey((current) => current + 1)
      toast.error(t("myUnit.overview.conflict"))
    } catch {
      toast.error(t("myUnit.saveError"))
    }

    return false
  }

  const applyBranding = (branding: OrganizationBranding) =>
    setData((current) => (current ? { ...current, branding } : current))

  // Saving the identity is up to four calls (draft, logo, favicon, publication), so a failure can come
  // from any of them: an image the backend refuses, file storage turned off, or - 409 - someone else
  // changed the identity first, when it is read again and the tab goes back to it.
  const handleSaveBranding = async (update: OrganizationBrandingUpdate) => {
    try {
      applyBranding(await updateBranding(update))
      toast.success(t("myUnit.branding.saved"))
      return true
    } catch (error) {
      const status = getErrorStatus(error)

      if (status !== 409) {
        if (status === 503) toast.error(t("myUnit.branding.storageUnavailable"))
        else if (status === 413 || status === 415 || status === 422) toast.error(t("myUnit.branding.imageRefused"))
        else toast.error(t("myUnit.saveError"))
        return false
      }
    }

    try {
      applyBranding(await getBranding())
      setBrandingKey((current) => current + 1)
      toast.error(t("myUnit.branding.conflict"))
    } catch {
      toast.error(t("myUnit.saveError"))
    }

    return false
  }

  const handleUnitsChange = (change: (units: SchoolUnit[]) => SchoolUnit[]) =>
    setData((current) => (current ? { ...current, units: change(current.units) } : current))

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
            description={t("myUnit.loadErrorDescription")}
            title={t("myUnit.loadError")}
            variant="error"
          />
        </Card>
      )
    }

    if (!data) return <LoadingState />

    return (
      <OrganizationCountryContext
        value={isCountry(data.organization.address.country) ? data.organization.address.country : defaultCountry}
      >
        <div hidden={tab !== "overview"}>
          <OverviewTab
            branding={data.branding}
            key={overviewKey}
            onCreateUnit={handleCreateFromOverview}
            onSaveOrganization={handleSaveOrganization}
            onSeeAllUnits={() => setTab("units")}
            organization={data.organization}
            units={data.units}
          />
        </div>
        <div hidden={tab !== "branding"}>
          <BrandingTab
            branding={data.branding}
            key={brandingKey}
            displayName={data.organization.displayName}
            onSave={handleSaveBranding}
          />
        </div>
        <div hidden={tab !== "units"}>
          <UnitsTab
            isCreating={isCreatingUnit}
            onCreatingChange={setIsCreatingUnit}
            onUnitsChange={handleUnitsChange}
            units={data.units}
          />
        </div>
      </OrganizationCountryContext>
    )
  }

  return (
    <>
      <PageHeader description={t("myUnit.subtitle")} icon="building-outline" title={t("myUnit.title")} />

      <Tabs
        items={[
          { icon: "info-outline", key: "overview", label: t("myUnit.tabs.overview") },
          { icon: "palette-outline", key: "branding", label: t("myUnit.tabs.branding") },
          { icon: "location-outline", key: "units", label: t("myUnit.tabs.units") },
        ]}
        label={t("myUnit.sectionsLabel")}
        onChange={(key) => setTab(key as MyUnitTab)}
        value={tab}
        attached
      />

      {renderContent()}
    </>
  )
}
