import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { Button, Card, Icon, type IconName, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { PageHeader, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import type { AcademicOverview as AcademicOverviewData, AcademicOverviewShortcut } from "@/models"
import { paths } from "@/routes/paths"
import { getAcademicOverview } from "@/services/academicClassDetail"
import { listAcademicPeriods } from "@/services/academicPeriods"
import { getErrorStatus } from "@/services/httpClient"

import { useAcademicDirectory } from "../shared/academic/useAcademicDirectory"
import { useAcademicUnits } from "../shared/academic/useAcademicUnits"
import { OverviewContent, Shortcuts, StatBlock, StatsGrid, StatValue } from "./AcademicOverview.styles"

type OverviewResult =
  | { contextKey: string; error: "failed" | "gone" }
  | { contextKey: string; overview: AcademicOverviewData }

const shortcutPaths: Record<AcademicOverviewShortcut, string> = {
  CREATE_CLASS: paths.classes,
  CREATE_PERIOD: paths.periods,
  LINK_TEACHER: paths.classes,
  REVIEW_CAPACITY: paths.classes,
}

const shortcutOrder: AcademicOverviewShortcut[] = ["CREATE_PERIOD", "CREATE_CLASS", "LINK_TEACHER", "REVIEW_CAPACITY"]

const shortcutIcons: Record<AcademicOverviewShortcut, IconName> = {
  CREATE_CLASS: "class-outline",
  CREATE_PERIOD: "calendar-outline",
  LINK_TEACHER: "user-add-outline",
  REVIEW_CAPACITY: "users-outline",
}

// The academic overview (P04-S01) of the person's scope, narrowed by unit and period: how many classes in
// each status (each counted once, even for someone with two roles), the capacity of the active ones, the
// occupation and the seats from the enrollment - "unavailable" while it doesn't answer, never zero - and
// the active classes without a teacher. The answer of an earlier unit or period is never shown under a
// new one (`contextKey`). The shortcuts are only what the person may do; with no structure yet, the page
// says so and points to the first step.
export const AcademicOverview = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const units = useAcademicUnits()
  const periods = useAcademicDirectory(listAcademicPeriods)

  const [unitId, setUnitId] = useState("")
  const [periodId, setPeriodId] = useState("")
  const [result, setResult] = useState<OverviewResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const contextKey = `u${unitId || 0}:p${periodId || 0}`
  const hasFilters = unitId !== "" || periodId !== ""

  useEffect(() => {
    let isStale = false
    const asked = `u${unitId || 0}:p${periodId || 0}`

    const load = async () => {
      try {
        const overview = await getAcademicOverview(
          { periodId: periodId ? Number(periodId) : undefined, unitId: unitId ? Number(unitId) : undefined },
          { showLoading: false },
        )
        if (!isStale) setResult({ contextKey: overview.contextKey, overview })
      } catch (error) {
        if (!isStale) setResult({ contextKey: asked, error: getErrorStatus(error) === 404 ? "gone" : "failed" })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [periodId, reloadToken, unitId])

  // An answer of another unit or period is never shown under this one.
  const current = result?.contextKey === contextKey ? result : null

  const unitOptions: SelectOption[] = [
    { label: t("userAccess.allUnits"), value: "" },
    ...units.units.map((unit) => ({ label: unit.name, value: String(unit.id) })),
  ]
  const periodOptions: SelectOption[] = [
    { label: t("offers.allPeriods"), value: "" },
    ...periods.items.map((period) => ({ label: period.name, value: String(period.id) })),
  ]

  const renderShortcuts = (overview: AcademicOverviewData) => {
    const shortcuts = shortcutOrder.filter((shortcut) => overview.shortcuts.includes(shortcut))
    if (shortcuts.length === 0) return null

    return (
      <Shortcuts aria-label={t("academicOverview.shortcutsLabel")} role="group">
        {shortcuts.map((shortcut) => (
          <Button
            key={shortcut}
            onClick={() => navigate(shortcutPaths[shortcut])}
            size="small"
            startIcon={<Icon color="inherit" name={shortcutIcons[shortcut]} size={16} />}
            variant="outlined"
          >
            {t(`academicOverview.shortcuts.${shortcut}`)}
          </Button>
        ))}
      </Shortcuts>
    )
  }

  // The shortcuts are the page's actions, in the filter bar's bottom row as on the other lists, and stay
  // visible while the filters are hidden; only the ones the person may use, once the overview is read.
  const shortcuts = current && !("error" in current) ? renderShortcuts(current.overview) : null

  const renderContent = () => {
    if (!current) {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("academicOverview.loading")}
        </Text>
      )
    }

    if ("error" in current) {
      return (
        <StateMessage
          action={<Button onClick={() => setReloadToken((value) => value + 1)}>{t("common.tryAgain")}</Button>}
          description={
            current.error === "gone" ? t("academicOverview.goneDescription") : t("academicOverview.errorDescription")
          }
          title={t("academicOverview.errorTitle")}
          variant="error"
        />
      )
    }

    const { overview } = current

    if (overview.state === "EMPTY") {
      return (
        <StateMessage
          description={
            overview.shortcuts.includes("CREATE_PERIOD")
              ? t("academicOverview.emptyDescription")
              : t("academicOverview.emptyReadOnly")
          }
          icon="dashboard-outline"
          title={t("academicOverview.emptyTitle")}
        />
      )
    }

    const isAvailable = overview.occupation.status === "AVAILABLE"
    const unavailable = t("academicOverview.unavailable")
    const stats = [
      { key: "classes", label: t("academicOverview.classes"), value: String(overview.classes) },
      { key: "inPreparation", label: t("academicOverview.inPreparation"), value: String(overview.inPreparation) },
      { key: "active", label: t("academicOverview.active"), value: String(overview.active) },
      { key: "inactive", label: t("academicOverview.inactive"), value: String(overview.inactive) },
      { key: "capacity", label: t("academicOverview.capacity"), value: String(overview.capacity) },
      {
        key: "occupation",
        label: t("academicOverview.occupation"),
        value: isAvailable ? String(overview.occupation.value ?? 0) : unavailable,
      },
      {
        key: "seats",
        label: t("academicOverview.seats"),
        value: isAvailable && overview.seats !== null ? String(overview.seats) : unavailable,
      },
      {
        key: "withoutTeacher",
        label: t("academicOverview.withoutTeacher"),
        value: String(overview.classesWithoutTeacher),
      },
    ]

    return (
      <OverviewContent>
        <StatsGrid aria-label={t("academicOverview.statsLabel")} role="list">
          {stats.map((stat) => (
            <StatBlock key={stat.key} role="listitem">
              <StatValue>{stat.value}</StatValue>
              <Text color="secondary" fontSize="sm">
                {stat.label}
              </Text>
            </StatBlock>
          ))}
        </StatsGrid>
        {!isAvailable && (
          <Text color="secondary" fontSize="sm">
            {t("academicOverview.unavailableHelp")}
          </Text>
        )}
      </OverviewContent>
    )
  }

  return (
    <>
      <PageHeader
        description={t("academic.descriptions.academicOverview")}
        icon="dashboard-outline"
        title={t("shell.nav.academicOverview")}
      />

      <Card elevated style={{ display: "flex", flexDirection: "column", gap: spacing[24], padding: spacing[32] }}>
        <FilterBar
          actions={shortcuts ?? undefined}
          clearLabel={t("userAccess.clearFilters")}
          collapseLabel={t("common.collapseFilters")}
          expandLabel={t("common.expandFilters")}
          hasActiveFilters={hasFilters}
          label={t("academicOverview.filtersLabel")}
          onClear={() => {
            setUnitId("")
            setPeriodId("")
          }}
          title={t("common.filters")}
        >
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => setUnitId(option?.value ?? "")}
            options={unitOptions}
            placeholder={t("userAccess.allUnits")}
            size="small"
            title={t("academicOverview.unit")}
            value={unitOptions.find((option) => option.value === unitId) ?? null}
          />
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => setPeriodId(option?.value ?? "")}
            options={periodOptions}
            placeholder={t("offers.allPeriods")}
            size="small"
            title={t("academicOverview.period")}
            value={periodOptions.find((option) => option.value === periodId) ?? null}
          />
        </FilterBar>

        {renderContent()}
      </Card>
    </>
  )
}
