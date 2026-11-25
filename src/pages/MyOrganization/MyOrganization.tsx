import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Button, Card, Skeleton } from "@/ds-components/atoms"
import { PageHeader, StateMessage, Tabs } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import { refreshSchoolBranding, useSignedInUser } from "@/hooks"
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
  getOrganizationOverview,
  getPublishedOrganizationBranding,
  listSchoolUnits,
  updateBranding,
  updateOrganization,
} from "@/services/organization"
import { hasAnyRole } from "@/utils/access"
import { defaultCountry, isCountry } from "@/utils/countries"

import { BrandingTab } from "./branding/BrandingTab"
import { PublishedBrandingView } from "./branding/PublishedBrandingView"
import type { MyOrganizationTab } from "./MyOrganization.constants"
import { SubCard } from "./MyOrganization.styles"
import { OverviewTab } from "./overview/OverviewTab"
import { MyOrganizationAccessContext } from "./shared/myOrganizationAccess"
import { OrganizationCountryContext } from "./shared/organizationCountry"
import type { SaveResult } from "./shared/saveResult"
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

// Minha Organização: the organization the user works in (JLM-11), in three tabs - its overview, its
// visual identity and its units, all from the backend through services/organization. Every tab stays
// mounted and only the others are hidden, so an edit in progress survives switching tabs. Each tab is
// one main card (TabCard), attached to the tabs above it, with its sections inside as sub-cards
// (SectionCard). An Admin manages it all; a Secretaria only reads (matrix ORG-M01 to M04): the
// organization's summary (no address nor notes), its own units and the published identity, with no
// edit control anywhere (MyOrganizationAccessContext).
export const MyOrganization = () => {
  const { t } = useTranslation()
  const user = useSignedInUser()

  const [data, setData] = useState<PageData | null>(null)
  // Why there is no data: the tenant has no organization registered yet (the backend's 404), or the
  // load failed. They read differently, so a missing registration is never taken for an outage.
  const [failure, setFailure] = useState<"error" | "notRegistered" | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [tab, setTab] = useState<MyOrganizationTab>("overview")
  const [isCreatingUnit, setIsCreatingUnit] = useState(false)

  const canManage = hasAnyRole(user, ["ADMIN"])

  // The fetch is defined inline inside the effect, rather than as an outer useCallback referenced
  // here, so react-hooks/set-state-in-effect doesn't flag it. handleRetry bumps reloadToken instead of
  // calling this fetch directly, re-running the effect; `ignore` drops an answer that arrives after the
  // effect was cleaned up (a retry, or StrictMode's double run).
  useEffect(() => {
    let ignore = false

    const load = async () => {
      // A reader can't see the editable organization nor the identity's draft: it reads the summary and
      // the published identity instead. The units list already comes limited to the reader's own.
      const [organization, branding, units] = await Promise.allSettled([
        canManage ? getCurrentOrganization({ showLoading: false }) : getOrganizationOverview({ showLoading: false }),
        canManage ? getBranding({ showLoading: false }) : getPublishedOrganizationBranding({ showLoading: false }),
        listSchoolUnits({ showLoading: false }),
      ])

      if (ignore) return

      if (organization.status === "rejected" && getErrorStatus(organization.reason) === 404) {
        setFailure("notRegistered")
        return
      }

      if (organization.status === "rejected" || branding.status === "rejected" || units.status === "rejected") {
        setFailure("error")
        return
      }

      setData({ branding: branding.value, organization: organization.value, units: units.value })
    }

    void load()

    return () => {
      ignore = true
    }
  }, [canManage, reloadToken])

  const handleRetry = () => {
    setFailure(null)
    setData(null)
    setReloadToken((current) => current + 1)
  }

  const applyOrganization = (organization: Organization) =>
    setData((current) => (current ? { ...current, organization } : current))

  // A 409 means someone else changed the organization since it was read: nothing was saved, the
  // organization is read again (its sections show it as it is now, and the next save goes with the new
  // version), and the section that asked keeps the user's draft beside a notice (SaveResult "conflict").
  const handleSaveOrganization = async (update: OrganizationUpdate): Promise<SaveResult> => {
    try {
      applyOrganization(await updateOrganization(update))
      toast.success(t("myOrganization.overview.saved"))
      return "saved"
    } catch (error) {
      if (getErrorStatus(error) !== 409) {
        toast.error(t("myOrganization.saveError"))
        return "failed"
      }
    }

    try {
      applyOrganization(await getCurrentOrganization())
      return "conflict"
    } catch {
      toast.error(t("myOrganization.saveError"))
      return "failed"
    }
  }

  const applyBranding = (branding: OrganizationBranding) =>
    setData((current) => (current ? { ...current, branding } : current))

  // Saving the identity is up to four calls (draft, logo, favicon, publication), so a failure can come
  // from any of them: an image the backend refuses, file storage turned off, or - 409 - someone else
  // changed the identity first, when it is read again and the tab keeps the user's draft beside a
  // notice (SaveResult "conflict").
  const handleSaveBranding = async (update: OrganizationBrandingUpdate): Promise<SaveResult> => {
    try {
      applyBranding(await updateBranding(update))
      toast.success(t("myOrganization.branding.saved"))
      // The shell (menu, tab) shows the identity just published at once.
      void refreshSchoolBranding()
      return "saved"
    } catch (error) {
      const status = getErrorStatus(error)

      if (status !== 409) {
        if (status === 503) toast.error(t("myOrganization.branding.storageUnavailable"))
        else if (status === 413 || status === 415 || status === 422)
          toast.error(t("myOrganization.branding.imageRefused"))
        else toast.error(t("myOrganization.saveError"))
        return "failed"
      }
    }

    try {
      applyBranding(await getBranding())
      return "conflict"
    } catch {
      toast.error(t("myOrganization.saveError"))
      return "failed"
    }
  }

  const handleUnitsChange = (change: (units: SchoolUnit[]) => SchoolUnit[]) =>
    setData((current) => (current ? { ...current, units: change(current.units) } : current))

  // From the overview's empty units summary: straight to the units tab, with the form open.
  const handleCreateFromOverview = () => {
    setTab("units")
    setIsCreatingUnit(true)
  }

  const renderContent = () => {
    if (failure === "notRegistered") {
      return (
        <Card elevated style={{ padding: spacing[32] }}>
          <StateMessage
            action={<Button onClick={handleRetry}>{t("common.tryAgain")}</Button>}
            description={t("myOrganization.notRegisteredDescription")}
            icon="building-outline"
            title={t("myOrganization.notRegistered")}
            variant="empty"
          />
        </Card>
      )
    }

    if (failure === "error") {
      return (
        <Card elevated style={{ padding: spacing[32] }}>
          <StateMessage
            action={<Button onClick={handleRetry}>{t("common.tryAgain")}</Button>}
            description={t("myOrganization.loadErrorDescription")}
            title={t("myOrganization.loadError")}
            variant="error"
          />
        </Card>
      )
    }

    if (!data) return <LoadingState />

    return (
      <MyOrganizationAccessContext value={canManage ? "manage" : "read"}>
        <OrganizationCountryContext
          value={isCountry(data.organization.address.country) ? data.organization.address.country : defaultCountry}
        >
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
            {canManage ? (
              <BrandingTab
                branding={data.branding}
                displayName={data.organization.displayName}
                onSave={handleSaveBranding}
              />
            ) : (
              <PublishedBrandingView branding={data.branding} displayName={data.organization.displayName} />
            )}
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
      </MyOrganizationAccessContext>
    )
  }

  return (
    <>
      <PageHeader
        description={t("myOrganization.subtitle")}
        icon="building-outline"
        title={t("myOrganization.title")}
      />

      <Tabs
        items={[
          { icon: "info-outline", key: "overview", label: t("myOrganization.tabs.overview") },
          { icon: "palette-outline", key: "branding", label: t("myOrganization.tabs.branding") },
          { icon: "location-outline", key: "units", label: t("myOrganization.tabs.units") },
        ]}
        label={t("myOrganization.sectionsLabel")}
        onChange={(key) => setTab(key as MyOrganizationTab)}
        value={tab}
        attached
      />

      {renderContent()}
    </>
  )
}
