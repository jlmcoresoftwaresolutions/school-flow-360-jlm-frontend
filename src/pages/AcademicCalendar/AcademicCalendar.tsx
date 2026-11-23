import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Card } from "@/ds-components/atoms"
import type { SelectOption, TabsItem } from "@/ds-components/molecules"
import { PageHeader, Select, StateMessage, Tabs } from "@/ds-components/molecules"
import { FilterBar } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import type { AcademicPeriod, ApiItemsPage } from "@/models"
import { listAcademicPeriods } from "@/services/academicPeriods"

import { useAcademicDirectory } from "../shared/academic/useAcademicDirectory"
import { useAcademicUnits } from "../shared/academic/useAcademicUnits"
import { CalendarItems } from "./CalendarItems"
import { CalendarPublication } from "./CalendarPublication"
import { PublishedCalendar } from "./PublishedCalendar"

const cardStyle = { padding: spacing[32] }

// The people who only read the published calendar never list the periods (the Aluno and the Responsável
// can't): nothing is asked.
const skipPeriods = async (): Promise<ApiItemsPage<AcademicPeriod>> => ({
  items: [],
  page: 0,
  size: 0,
  totalElements: 0,
  totalPages: 0,
})

// The basic academic calendar (P04-S10/S11). The management (Admin, Secretaria, Coordenação) picks a unit
// it manages and a period that includes it, and works in three attached tabs: the preparation (school
// days, holidays and events; saving never publishes), the publication (the preview, publishing a closed
// snapshot and withdrawing it - only the Admin and the unit's Coordenação) and what is published. Everyone
// else - the Professor, the Aluno and the Responsável - only reads the published calendar of their own
// context; "nothing published" is an answer, not a failure.
export const AcademicCalendar = () => {
  const { t } = useTranslation()
  const units = useAcademicUnits()
  const periods = useAcademicDirectory(units.canManage ? listAcademicPeriods : skipPeriods)

  const [unitId, setUnitId] = useState("")
  const [periodId, setPeriodId] = useState("")
  const [tab, setTab] = useState("items")
  const [refreshKey, setRefreshKey] = useState(0)

  const header = (
    <PageHeader
      description={t("academic.descriptions.academicCalendar")}
      icon="event-note-outline"
      title={t("shell.nav.academicCalendar")}
    />
  )

  if (!units.canManage) {
    return (
      <>
        {header}
        <Card elevated style={cardStyle}>
          <PublishedCalendar refreshKey={0} units={units} />
        </Card>
      </>
    )
  }

  const period = periods.items.find((item) => String(item.id) === periodId)
  const unitName = units.nameOf(Number(unitId)) ?? ""
  const unitOptions: SelectOption[] = units.manageableUnits.map((unit) => ({
    label: unit.name,
    value: String(unit.id),
  }))
  const periodOptions: SelectOption[] = periods.items
    .filter((item) => item.unitIds.includes(Number(unitId)))
    .map((item) => ({ label: item.name, value: String(item.id) }))
  const hasContext = Boolean(unitId && period)
  const changed = () => setRefreshKey((value) => value + 1)

  const tabs: TabsItem[] =
    hasContext && period
      ? [
          {
            content: (
              <Card elevated style={cardStyle}>
                <CalendarItems
                  canPrepare={period.status !== "CLOSED"}
                  onChanged={changed}
                  period={period}
                  refreshKey={refreshKey}
                  unitId={Number(unitId)}
                  units={units}
                />
              </Card>
            ),
            icon: "pen-outline",
            key: "items",
            label: t("academicCalendar.tabs.items"),
          },
          {
            content: (
              <Card elevated style={cardStyle}>
                <CalendarPublication
                  onChanged={changed}
                  periodId={period.id}
                  refreshKey={refreshKey}
                  unitId={Number(unitId)}
                  unitName={unitName}
                />
              </Card>
            ),
            icon: "check-circle-outline",
            key: "publication",
            label: t("academicCalendar.tabs.publication"),
          },
          {
            content: (
              <Card elevated style={cardStyle}>
                <PublishedCalendar periodId={period.id} refreshKey={refreshKey} unitId={Number(unitId)} units={units} />
              </Card>
            ),
            icon: "event-note-outline",
            key: "published",
            label: t("academicCalendar.tabs.published"),
          },
        ]
      : []

  return (
    <>
      {header}

      <Card elevated style={{ marginBottom: spacing[24], padding: spacing[32] }}>
        <FilterBar
          clearLabel={t("userAccess.clearFilters")}
          collapseLabel={t("common.collapseFilters")}
          expandLabel={t("common.expandFilters")}
          hasActiveFilters={unitId !== "" || periodId !== ""}
          label={t("academicCalendar.contextLabel")}
          onClear={() => {
            setUnitId("")
            setPeriodId("")
          }}
          title={t("academicCalendar.context")}
        >
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => {
              setUnitId(option?.value ?? "")
              setPeriodId("")
            }}
            options={unitOptions}
            placeholder={t("academicCalendar.unitPlaceholder")}
            size="small"
            title={t("academicCalendar.unit")}
            value={unitOptions.find((option) => option.value === unitId) ?? null}
          />
          <Select
            isDisabled={!unitId}
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => setPeriodId(option?.value ?? "")}
            options={periodOptions}
            placeholder={t("academicCalendar.periodPlaceholder")}
            size="small"
            title={t("academicCalendar.period")}
            value={periodOptions.find((option) => option.value === periodId) ?? null}
          />
        </FilterBar>
      </Card>

      {hasContext ? (
        <Tabs
          items={tabs}
          label={t("academicCalendar.tabsLabel")}
          onChange={setTab}
          value={tabs.some((item) => item.key === tab) ? tab : "items"}
          attached
        />
      ) : (
        <Card elevated style={cardStyle}>
          <StateMessage
            description={t("academicCalendar.chooseContextDescription")}
            icon="event-note-outline"
            title={t("academicCalendar.chooseContextTitle")}
          />
        </Card>
      )}
    </>
  )
}
