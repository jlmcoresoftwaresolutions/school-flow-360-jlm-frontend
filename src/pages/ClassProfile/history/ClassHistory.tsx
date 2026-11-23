import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { DateInput, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import type { AcademicClassEvent, AcademicClassHistoryParams, AcademicClassStatus, ApiItemsPage } from "@/models"
import { listAcademicClassHistory } from "@/services/academicClassDetail"
import { getErrorCode } from "@/services/httpClient"
import { toIsoDate } from "@/utils/dates"

import { useAcademicLabels } from "../../shared/academic/useAcademicLabels"
import { ListContent, PersonCell } from "../../shared/userAccess/userAccess.styles"
import { isClassEventAction, isClassEventField, readLinkInterval } from "./classEvents"

export type ClassHistoryProps = {
  classId: number
  // Changes whenever the class changed, to read the history again.
  refreshKey: number
}

type EventType = NonNullable<AcademicClassHistoryParams["type"]>

type HistoryResult =
  | { error: "failed" | "range"; key: string }
  | { key: string; page: ApiItemsPage<AcademicClassEvent> }

const pageSize = 20

const eventTypes: EventType[] = ["CONFIG", "STATUS", "CAPACITY", "TEACHER_LINK"]

const classStatuses: AcademicClassStatus[] = ["ACTIVE", "INACTIVE", "PREPARATION"]

// The History tab of a class (the unit's management only): what happened to it, newest first - its
// configuration, status, capacity and teacher links -, filtered by type and period. Each event shows who
// did it ("System" without an author), the names of the fields it changed, the before and after where the
// backend keeps them (the status, the limit, a link's dates) and the reason. It is not the security audit.
export const ClassHistory = (props: ClassHistoryProps) => {
  const { classId, refreshKey } = props

  const { t } = useTranslation()
  const { classStatusLabel, dateRange, formatMoment } = useAcademicLabels()

  const [type, setType] = useState<"" | EventType>("")
  const [from, setFrom] = useState<Date | null>(null)
  const [to, setTo] = useState<Date | null>(null)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<HistoryResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const fromIso = from ? toIsoDate(from) : ""
  const toIso = to ? toIsoDate(to) : ""
  const isInverted = fromIso !== "" && toIso !== "" && toIso < fromIso
  const hasFilters = type !== "" || fromIso !== "" || toIso !== ""
  const requestKey = `${classId}#${refreshKey}#${reloadToken}#${type}#${fromIso}#${toIso}#${page}`

  useEffect(() => {
    if (isInverted) return

    let isStale = false

    const load = async () => {
      try {
        const loaded = await listAcademicClassHistory(
          classId,
          {
            direction: "desc",
            from: fromIso || undefined,
            page: page - 1,
            size: pageSize,
            to: toIso || undefined,
            type: type || undefined,
          },
          { showLoading: false },
        )
        if (!isStale) setResult({ key: requestKey, page: loaded })
      } catch (error) {
        if (!isStale) {
          setResult({ error: getErrorCode(error) === "ACADEMIC_INVALID_RANGE" ? "range" : "failed", key: requestKey })
        }
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [classId, fromIso, isInverted, page, requestKey, toIso, type])

  const current = result?.key === requestKey ? result : null
  const typeOptions: SelectOption[] = [
    { label: t("classHistory.allTypes"), value: "" },
    ...eventTypes.map((value) => ({ label: t(`classHistory.types.${value}`), value })),
  ]

  const eventLabel = (action: string) => (isClassEventAction(action) ? t(`classHistory.events.${action}`) : action)
  const fieldLabel = (field: string) => (isClassEventField(field) ? t(`classHistory.fields.${field}`) : field)

  // A value the backend keeps as it is: a status by its label, a link's dates as a range.
  const valueLabel = (value: string) => {
    if ((classStatuses as string[]).includes(value)) return classStatusLabel(value as AcademicClassStatus)
    const interval = readLinkInterval(value)
    if (interval) {
      const range = dateRange(interval.start, interval.end)
      return interval.joint ? `${range} · ${t("classHistory.joint")}` : range
    }
    return value
  }

  const renderEvent = (event: AcademicClassEvent) => {
    const fields = event.changedFields.filter(Boolean)
    const change = [event.before, event.after].some(Boolean)
      ? `${event.before ? valueLabel(event.before) : "—"} → ${event.after ? valueLabel(event.after) : "—"}`
      : ""

    return (
      <PersonCell>
        <Text fontSize="sm" semibold>
          {eventLabel(event.action)}
        </Text>
        {fields.length > 0 && (
          <Text color="secondary" fontSize="sm">
            {t("classHistory.changedFields", { fields: fields.map(fieldLabel).join(", ") })}
          </Text>
        )}
        {change && (
          <Text color="secondary" fontSize="sm">
            {change}
          </Text>
        )}
        {event.reason && (
          <Text color="secondary" fontSize="sm">
            {t("classHistory.reason", { reason: event.reason })}
          </Text>
        )}
      </PersonCell>
    )
  }

  const renderList = () => {
    if (isInverted || (current && "error" in current && current.error === "range")) {
      return (
        <Text color="danger" fontSize="sm" role="alert">
          {t("classHistory.invertedRange")}
        </Text>
      )
    }

    if (current && "error" in current) {
      return (
        <StateMessage
          action={<Button onClick={() => setReloadToken((value) => value + 1)}>{t("common.tryAgain")}</Button>}
          description={t("classHistory.errorDescription")}
          title={t("classHistory.errorTitle")}
          variant="error"
        />
      )
    }

    const data = current?.page

    return (
      <>
        <Table
          dataKey="id"
          emptyMessage={hasFilters ? t("classHistory.noResults") : t("classHistory.empty")}
          loading={!current}
          loadingMessage={t("classHistory.loading")}
          value={data?.items ?? []}
        >
          <Table.Column
            body={(event: AcademicClassEvent) => <Text fontSize="sm">{formatMoment(event.occurredAt)}</Text>}
            field="occurredAt"
            header={t("classHistory.when")}
          />
          <Table.Column body={renderEvent} field="action" header={t("classHistory.event")} />
          <Table.Column
            body={(event: AcademicClassEvent) => (
              <Text fontSize="sm">{event.actorName ?? t("classHistory.system")}</Text>
            )}
            field="actorName"
            header={t("classHistory.actor")}
          />
        </Table>
        {data && data.totalPages > 1 && (
          <Pagination
            label={t("classHistory.paginationLabel")}
            nextLabel={t("common.nextPage")}
            onChange={setPage}
            page={page}
            pageLabel={(number) => t("common.pageLabel", { page: number })}
            previousLabel={t("common.previousPage")}
            style={{ alignSelf: "flex-end" }}
            totalPages={data.totalPages}
          />
        )}
      </>
    )
  }

  return (
    <ListContent>
      <Text color="secondary" fontSize="sm">
        {t("classHistory.description")}
      </Text>
      <FilterBar
        clearLabel={t("userAccess.clearFilters")}
        collapseLabel={t("common.collapseFilters")}
        expandLabel={t("common.expandFilters")}
        hasActiveFilters={hasFilters}
        label={t("classHistory.filtersLabel")}
        onClear={() => {
          setType("")
          setFrom(null)
          setTo(null)
          setPage(1)
        }}
        title={t("common.filters")}
      >
        <Select
          noOptionsMessage={t("common.noOptions")}
          onChange={(option) => {
            setType((option?.value as EventType | undefined) ?? "")
            setPage(1)
          }}
          options={typeOptions}
          placeholder={t("classHistory.allTypes")}
          size="small"
          title={t("classHistory.type")}
          value={typeOptions.find((option) => option.value === type) ?? null}
        />
        <DateInput
          clearLabel={t("people.form.clearDate")}
          onChange={(value) => {
            setFrom(value)
            setPage(1)
          }}
          placeholder={t("common.datePlaceholder")}
          size="small"
          title={t("classHistory.from")}
          value={from}
        />
        <DateInput
          clearLabel={t("people.form.clearDate")}
          onChange={(value) => {
            setTo(value)
            setPage(1)
          }}
          placeholder={t("common.datePlaceholder")}
          size="small"
          title={t("classHistory.to")}
          value={to}
        />
      </FilterBar>
      {renderList()}
    </ListContent>
  )
}
