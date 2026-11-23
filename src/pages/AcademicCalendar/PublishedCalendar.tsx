import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Text } from "@/ds-components/atoms"
import { StateMessage } from "@/ds-components/molecules"
import { Table } from "@/ds-components/organisms"
import type { AcademicCalendarPublished, AcademicPublishedItem } from "@/models"
import { getPublishedAcademicCalendar } from "@/services/academicCalendar"

import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import type { AcademicUnits } from "../shared/academic/useAcademicUnits"
import { PersonSections } from "../shared/people/people.styles"
import { PersonBlock } from "../shared/people/PersonBlock"
import { PersonCell } from "../shared/userAccess/userAccess.styles"

export type PublishedCalendarProps = {
  // Changes whenever the calendar changed, to read it again.
  refreshKey: number
  units: Pick<AcademicUnits, "nameOf">
  // The context to read; none reads every published calendar the person may see (their own units, or
  // their students' reference units for a student or a guardian).
  periodId?: number
  unitId?: number
}

type PublishedResult = { error: true; key: string } | { key: string; published: AcademicCalendarPublished }

// The published calendar, as it was published: each unit's current version with its items in date order
// and the school days it gives. "Nothing published" is an answer of its own, told apart from a failure.
export const PublishedCalendar = (props: PublishedCalendarProps) => {
  const { periodId, refreshKey, unitId, units } = props

  const { t } = useTranslation()
  const { calendarCategoryLabel, calendarCategoryTone, dateRange, formatMoment } = useAcademicLabels()

  const [result, setResult] = useState<PublishedResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const requestKey = `${periodId ?? 0}:${unitId ?? 0}#${refreshKey}#${reloadToken}`

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const published = await getPublishedAcademicCalendar({ periodId, unitId }, { showLoading: false })
        if (!isStale) setResult({ key: requestKey, published })
      } catch {
        if (!isStale) setResult({ error: true, key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [periodId, requestKey, unitId])

  const current = result?.key === requestKey ? result : null

  if (!current) {
    return (
      <Text color="secondary" fontSize="sm" role="status">
        {t("academicCalendar.loadingPublished")}
      </Text>
    )
  }

  if ("error" in current) {
    return (
      <StateMessage
        action={<Button onClick={() => setReloadToken((value) => value + 1)}>{t("common.tryAgain")}</Button>}
        description={t("academicCalendar.publishedErrorDescription")}
        title={t("academicCalendar.publishedErrorTitle")}
        variant="error"
      />
    )
  }

  if (current.published.state === "NOT_PUBLISHED") {
    return (
      <StateMessage
        description={t("academicCalendar.notPublishedDescription")}
        icon="event-note-outline"
        title={t("academicCalendar.notPublishedTitle")}
      />
    )
  }

  return (
    <PersonSections>
      {current.published.versions.map((version) => {
        const unitName = units.nameOf(version.unitId) ?? t("academic.unitNumber", { id: version.unitId })
        const items = [...version.items].sort((first, second) => first.startDate.localeCompare(second.startDate))

        return (
          <PersonBlock key={version.id} title={unitName}>
            <Text color="secondary" fontSize="sm">
              {t("academicCalendar.publishedSummary", {
                count: version.schoolDays,
                date: formatMoment(version.publishedAt),
                number: version.versionNo,
              })}
            </Text>
            <Table dataKey="id" emptyMessage={t("academicCalendar.emptyItemsTitle")} value={items}>
              <Table.Column
                body={(row: AcademicPublishedItem) => (
                  <Text fontSize="sm">{dateRange(row.startDate, row.endDate)}</Text>
                )}
                field="startDate"
                header={t("academicCalendar.dates")}
              />
              <Table.Column
                body={(row: AcademicPublishedItem) => (
                  <Badge tone={calendarCategoryTone(row.category)}>{calendarCategoryLabel(row.category)}</Badge>
                )}
                field="category"
                header={t("academicCalendar.category")}
              />
              <Table.Column
                body={(row: AcademicPublishedItem) => (
                  <PersonCell>
                    <Text fontSize="sm" semibold>
                      {row.title}
                    </Text>
                    {row.description && (
                      <Text color="secondary" fontSize="sm">
                        {row.description}
                      </Text>
                    )}
                  </PersonCell>
                )}
                field="title"
                header={t("academicCalendar.itemTitle")}
              />
            </Table>
          </PersonBlock>
        )
      })}
    </PersonSections>
  )
}
