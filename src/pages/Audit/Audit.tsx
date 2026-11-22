import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Card, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { DateInput, PageHeader, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import type {
  AccessAuditEvent,
  AccessAuditEventPage,
  AccessAuditResult,
  AccessAuditSearchParams,
  UserView,
} from "@/models"
import { listAccessAuditEvents } from "@/services/audit"
import { getErrorStatus } from "@/services/httpClient"
import { listUsers } from "@/services/users"

import { getPersonName } from "../shared/userAccess/personName"
import { ListContent, PersonCell } from "../shared/userAccess/userAccess.styles"
import { useUnitDirectory } from "../shared/userAccess/useUnitDirectory"
import {
  auditEventTypes,
  daysBetween,
  findAuditEventType,
  maxAuditPeriodDays,
  readChangedFields,
  toApiDay,
} from "./auditEvents"

const pageSize = 20

type ListResult = { data: AccessAuditEventPage; key: string } | { error: "failed" | "forbidden"; key: string }

const daysAgo = (days: number) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date
}

// The access audit (JLM-197), for the Admin only: what was done in the institution, by whom, on what,
// in which unit, with which result and when - newest first, read from the backend page by page. It
// filters by period (the last 30 days by default, up to 366), author, unit, kind of event and result
// (done or refused). Read only: nothing is changed here, and no sensitive value is ever shown (a
// change names the fields it touched, never their values). Loading, an institution without events in
// the period, filters without results, a failure and a refusal each read differently.
export const Audit = () => {
  const { i18n, t } = useTranslation()
  const unitDirectory = useUnitDirectory()

  const [from, setFrom] = useState<Date | null>(() => daysAgo(30))
  const [to, setTo] = useState<Date | null>(() => daysAgo(0))
  const [actorUserId, setActorUserId] = useState("")
  const [unitId, setUnitId] = useState("")
  const [eventKey, setEventKey] = useState("")
  const [resultFilter, setResultFilter] = useState<"" | AccessAuditResult>("")
  const [page, setPage] = useState(1)
  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState<ListResult | null>(null)
  const [people, setPeople] = useState<UserView[]>([])

  // The authors to filter by, and the names of the users an event is about.
  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const found = await listUsers({ direction: "asc", size: 100, sortBy: "fullName" }, { showLoading: false })
        if (!isStale) setPeople(found.items)
      } catch {
        // Without the list the author filter is only the "all" option; the events still name the author.
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [])

  const periodError = useMemo(() => {
    if (!from || !to) return t("audit.periodRequired")
    if (from > to) return t("audit.periodOrder")
    if (daysBetween(from, to) > maxAuditPeriodDays) return t("audit.periodTooLong", { max: maxAuditPeriodDays })

    return ""
  }, [from, t, to])

  const params = useMemo<AccessAuditSearchParams | null>(() => {
    if (periodError || !from || !to) return null
    const eventType = auditEventTypes.find((type) => type.key === eventKey)

    return {
      action: eventType?.action,
      actorUserId: actorUserId ? Number(actorUserId) : undefined,
      entityType: eventType?.entityType,
      from: toApiDay(from),
      page: page - 1,
      result: resultFilter || undefined,
      schoolUnitId: unitId ? Number(unitId) : undefined,
      size: pageSize,
      to: toApiDay(to),
    }
  }, [actorUserId, eventKey, from, page, periodError, resultFilter, to, unitId])
  const requestKey = `${JSON.stringify(params)}#${reloadToken}`

  useEffect(() => {
    if (!params) return

    let isStale = false

    const load = async () => {
      try {
        const data = await listAccessAuditEvents(params, { showLoading: false })
        if (!isStale) setResult({ data, key: requestKey })
      } catch (error) {
        if (!isStale) setResult({ error: getErrorStatus(error) === 403 ? "forbidden" : "failed", key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [params, requestKey])

  const reload = useCallback(() => setReloadToken((current) => current + 1), [])

  const current = result?.key === requestKey ? result : null
  const data = current && "data" in current ? current.data : null
  const isDefaultPeriod =
    from !== null && to !== null && toApiDay(from) === toApiDay(daysAgo(30)) && toApiDay(to) === toApiDay(daysAgo(0))
  const hasFilters = !isDefaultPeriod || actorUserId !== "" || unitId !== "" || eventKey !== "" || resultFilter !== ""

  const changeFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const clearFilters = () => {
    setFrom(daysAgo(30))
    setTo(daysAgo(0))
    setActorUserId("")
    setUnitId("")
    setEventKey("")
    setResultFilter("")
    setPage(1)
  }

  const actorOptions: SelectOption[] = [
    { label: t("audit.allAuthors"), value: "" },
    ...people.map((person) => ({ label: getPersonName(person), value: String(person.id) })),
  ]
  const unitOptions: SelectOption[] = [
    { label: t("userAccess.allUnits"), value: "" },
    ...unitDirectory.units.map((unit) => ({ label: unit.name, value: String(unit.id) })),
  ]
  const eventOptions: SelectOption[] = [
    { label: t("audit.allEvents"), value: "" },
    ...auditEventTypes.map((type) => ({ label: t(`audit.events.${type.key}`), value: type.key })),
  ]
  const resultOptions: SelectOption[] = [
    { label: t("userAccess.allStatuses"), value: "" },
    { label: t("audit.results.SUCCESS"), value: "SUCCESS" },
    { label: t("audit.results.DENIED"), value: "DENIED" },
  ]

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "medium" }).format(new Date(value))

  const eventLabel = (event: AccessAuditEvent) => {
    const type = findAuditEventType(event.action, event.entityType)

    return type ? t(`audit.events.${type.key}`) : `${event.action} · ${event.entityType ?? ""}`
  }

  // What the event is about, by name when it is known here; never more than its kind and id otherwise.
  const targetLabel = (event: AccessAuditEvent) => {
    if (event.entityType === "ENDPOINT") return event.entityId ?? ""
    if (event.entityType === "ORGANIZATION") return t("audit.entities.ORGANIZATION")
    if (event.entityType === "SCREEN_PREFERENCE") return t("audit.entities.SCREEN_PREFERENCE")
    // A session's id means nothing to a person, so the target is just "a session".
    if (event.entityType === "SESSION") return t("audit.entities.SESSION")
    if (event.entityType === "USER") {
      const person = people.find((item) => String(item.id) === event.entityId)
      return person ? getPersonName(person) : t("audit.entities.USER", { id: event.entityId })
    }
    if (event.entityType === "SCHOOL_UNIT") {
      const unit = unitDirectory.units.find((item) => String(item.id) === event.entityId)
      return unit ? unit.name : t("audit.entities.SCHOOL_UNIT", { id: event.entityId })
    }
    if (event.entityType === "INVITATION") return t("audit.entities.INVITATION", { id: event.entityId })

    return `${event.entityType ?? ""} ${event.entityId ?? ""}`.trim()
  }

  const unitLabel = (event: AccessAuditEvent) => {
    if (event.schoolUnitId === null) return ""
    return unitDirectory.units.find((unit) => unit.id === event.schoolUnitId)?.name ?? `#${event.schoolUnitId}`
  }

  const fieldsLabel = (event: AccessAuditEvent) => {
    const fields = readChangedFields(event.details)
    if (fields.length === 0) return ""

    const names = fields.map((field) =>
      field === "fullName" || field === "phone" ? t(`audit.fields.${field}`) : field,
    )
    return t("audit.changedFields", { fields: names.join(", ") })
  }

  const renderContent = () => {
    if (current && "error" in current) {
      if (current.error === "forbidden") {
        return (
          <StateMessage
            description={t("audit.forbiddenDescription")}
            icon="lock-outline"
            title={t("audit.forbiddenTitle")}
          />
        )
      }

      return (
        <StateMessage
          action={<Button onClick={reload}>{t("common.tryAgain")}</Button>}
          description={t("audit.errorDescription")}
          title={t("audit.errorTitle")}
          variant="error"
        />
      )
    }

    return (
      <ListContent>
        <FilterBar
          clearLabel={t("userAccess.clearFilters")}
          collapseLabel={t("common.collapseFilters")}
          expandLabel={t("common.expandFilters")}
          hasActiveFilters={hasFilters}
          label={t("audit.filtersLabel")}
          onClear={clearFilters}
          title={t("common.filters")}
        >
          <DateInput
            maxDate={new Date()}
            onChange={changeFilter(setFrom)}
            placeholder={t("common.datePlaceholder")}
            size="small"
            title={t("audit.from")}
            value={from}
          />
          <DateInput
            maxDate={new Date()}
            onChange={changeFilter(setTo)}
            placeholder={t("common.datePlaceholder")}
            size="small"
            title={t("audit.to")}
            value={to}
          />
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setActorUserId)(option?.value ?? "")}
            options={actorOptions}
            placeholder={t("audit.allAuthors")}
            size="small"
            title={t("audit.author")}
            value={actorOptions.find((option) => option.value === actorUserId) ?? null}
          />
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setUnitId)(option?.value ?? "")}
            options={unitOptions}
            placeholder={t("userAccess.allUnits")}
            size="small"
            title={t("userAccess.unit")}
            value={unitOptions.find((option) => option.value === unitId) ?? null}
          />
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setEventKey)(option?.value ?? "")}
            options={eventOptions}
            placeholder={t("audit.allEvents")}
            size="small"
            title={t("audit.eventType")}
            value={eventOptions.find((option) => option.value === eventKey) ?? null}
          />
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setResultFilter)((option?.value as AccessAuditResult | undefined) ?? "")}
            options={resultOptions}
            placeholder={t("userAccess.allStatuses")}
            size="small"
            title={t("audit.result")}
            value={resultOptions.find((option) => option.value === resultFilter) ?? null}
          />
        </FilterBar>

        {periodError && (
          <Text color="danger" fontSize="sm" role="alert">
            {periodError}
          </Text>
        )}

        <Table
          dataKey="id"
          emptyMessage={hasFilters ? t("audit.noResults") : t("audit.empty")}
          loading={Boolean(params) && !current}
          loadingMessage={t("audit.loading")}
          value={params ? (data?.items ?? []) : []}
        >
          <Table.Column
            body={(event: AccessAuditEvent) => formatDate(event.occurredAt)}
            field="occurredAt"
            header={t("audit.when")}
          />
          <Table.Column
            body={(event: AccessAuditEvent) => (
              <PersonCell>
                <Text fontSize="sm" semibold>
                  {event.actorName || event.actorEmail || t("audit.unknownAuthor")}
                </Text>
                {event.actorName && event.actorEmail && (
                  <Text color="secondary" fontSize="sm">
                    {event.actorEmail}
                  </Text>
                )}
              </PersonCell>
            )}
            field="actorUserId"
            header={t("audit.author")}
          />
          <Table.Column
            body={(event: AccessAuditEvent) => (
              <PersonCell>
                <Text fontSize="sm">{eventLabel(event)}</Text>
                {fieldsLabel(event) && (
                  <Text color="secondary" fontSize="sm">
                    {fieldsLabel(event)}
                  </Text>
                )}
              </PersonCell>
            )}
            field="action"
            header={t("audit.event")}
          />
          <Table.Column
            body={(event: AccessAuditEvent) => (
              <Text fontSize="sm" style={{ overflowWrap: "anywhere" }}>
                {targetLabel(event)}
              </Text>
            )}
            field="entityId"
            header={t("audit.target")}
          />
          <Table.Column body={unitLabel} field="schoolUnitId" header={t("userAccess.unit")} />
          <Table.Column
            body={(event: AccessAuditEvent) => (
              <Badge tone={event.result === "DENIED" ? "danger" : "success"}>
                {t(`audit.results.${event.result}`)}
              </Badge>
            )}
            field="result"
            header={t("audit.result")}
          />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("audit.filtersLabel")}
            nextLabel={t("common.nextPage")}
            onChange={setPage}
            page={page}
            pageLabel={(number) => t("common.pageLabel", { page: number })}
            previousLabel={t("common.previousPage")}
            style={{ alignSelf: "flex-end" }}
            totalPages={data.totalPages}
          />
        )}
      </ListContent>
    )
  }

  return (
    <>
      <PageHeader description={t("audit.description")} icon="fact-check-outline" title={t("shell.nav.audit")} />

      <Card elevated style={{ padding: spacing[32] }}>
        {renderContent()}
      </Card>
    </>
  )
}
