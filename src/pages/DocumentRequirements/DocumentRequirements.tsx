import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Card, Icon, Text } from "@/ds-components/atoms"
import type { ActionMenuItem, SelectOption } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, Select, StateMessage, Tabs } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import { useSignedInUser } from "@/hooks"
import type { DocumentRequirement } from "@/models"
import { listAcademicStages } from "@/services/academicCatalog"
import { listDocumentRequirements } from "@/services/enrollmentDocuments"
import { getErrorStatus } from "@/services/httpClient"
import { hasAnyRole } from "@/utils/access"
import { normalizeForSearch } from "@/utils/strings"

import { useAcademicDirectory } from "../shared/academic/useAcademicDirectory"
import { useAcademicUnits } from "../shared/academic/useAcademicUnits"
import { PeopleListError } from "../shared/people/PeopleListError"
import { useDocumentTypes } from "../shared/people/useDocumentTypes"
import { ListContent } from "../shared/userAccess/userAccess.styles"
import { RequirementFormModal } from "./RequirementFormModal"
import { RequirementStatusDialog } from "./RequirementStatusDialog"
import { UnitPoliciesTab } from "./UnitPoliciesTab"

type Dialog = { kind: "edit" | "status"; requirement: DocumentRequirement } | { kind: "new" } | null

type LoadResult = { error: "failed" | "forbidden"; key: number } | { items: DocumentRequirement[]; key: number }

type StatusFilter = "" | "ACTIVE" | "INACTIVE"

// The school's catalog of enrollment documents (decided by Lucas on 24/11/2026, backend slice 3B): what a
// preparation asks for, by whom (the student or each signatory), where (a unit and a stage, or all) and
// for which kind of enrollment. Nothing is universal: a requirement is born withdrawn and is asked for
// only once the Admin publishes it; the initial catalog comes withdrawn too. Only the Admin writes; the
// Secretaria reads. Nothing is deleted: a requirement is withdrawn. A second tab holds each unit's document
// policy (EPIC 7), which says whether the catalog applies there or the unit has no blocking requirement.
export const DocumentRequirements = () => {
  const { t } = useTranslation()
  const signedIn = useSignedInUser()
  const units = useAcademicUnits()
  const stages = useAcademicDirectory(listAcademicStages)
  const documentTypes = useDocumentTypes()

  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("")
  const [dialog, setDialog] = useState<Dialog>(null)
  const [tab, setTab] = useState("requirements")

  const current = result?.key === reloadToken ? result : null
  const isAdmin = hasAnyRole(signedIn, ["ADMIN"])
  const requirements = current && "items" in current ? current.items : null
  const term = normalizeForSearch(search.trim())
  const shown = (requirements ?? []).filter(
    (item) =>
      (!status || (status === "ACTIVE") === item.active) &&
      (!term || normalizeForSearch(`${item.label} ${item.code}`).includes(term)),
  )
  const hasFilters = term !== "" || status !== ""
  const statusOptions: SelectOption[] = [
    { label: t("documentRequirements.allStatuses"), value: "" },
    { label: t("documentRequirements.statuses.ACTIVE"), value: "ACTIVE" },
    { label: t("documentRequirements.statuses.INACTIVE"), value: "INACTIVE" },
  ]
  const unitOptions: SelectOption[] = units.units.map((unit) => ({ label: unit.name, value: String(unit.id) }))
  const stageOptions: SelectOption[] = stages.items.map((stage) => ({ label: stage.name, value: String(stage.id) }))

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const items = await listDocumentRequirements({ showLoading: false })
        if (!isStale) setResult({ items, key: reloadToken })
      } catch (error) {
        if (!isStale) setResult({ error: getErrorStatus(error) === 403 ? "forbidden" : "failed", key: reloadToken })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [reloadToken])

  const reload = useCallback(() => setReloadToken((value) => value + 1), [])

  const afterChange = () => {
    setDialog(null)
    reload()
  }

  const typeLabel = (code: string) => documentTypes.find((type) => type.code === code)?.label ?? code

  const scopeOf = (item: DocumentRequirement) =>
    [
      item.unitId ? (units.nameOf(item.unitId) ?? t("documentRequirements.unitNumber", { id: item.unitId })) : null,
      item.stageId
        ? (stages.items.find((stage) => stage.id === item.stageId)?.name ??
          t("documentRequirements.stageNumber", { id: item.stageId }))
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || t("documentRequirements.everywhere")

  const rulesOf = (item: DocumentRequirement) =>
    [
      item.mandatory ? t("documentRequirements.mandatory") : t("documentRequirements.optional"),
      item.exemptable ? t("documentRequirements.exemptable") : t("documentRequirements.notExemptable"),
      item.validityDays ? t("documentRequirements.validityDays", { count: item.validityDays }) : null,
      item.useDocumentExpiry ? t("documentRequirements.documentExpiry") : null,
    ]
      .filter(Boolean)
      .join(" · ")

  const renderActions = (item: DocumentRequirement) => {
    if (!isAdmin) return null
    const items: ActionMenuItem[] = [
      {
        icon: "pen-outline",
        key: "edit",
        label: t("documentRequirements.edit"),
        onClick: () => setDialog({ kind: "edit", requirement: item }),
      },
      item.active
        ? {
            icon: "lock-outline",
            key: "withdraw",
            label: t("documentRequirements.withdraw"),
            onClick: () => setDialog({ kind: "status", requirement: item }),
            tone: "danger",
          }
        : {
            icon: "check-circle-outline",
            key: "publish",
            label: t("documentRequirements.publish"),
            onClick: () => setDialog({ kind: "status", requirement: item }),
          },
    ]

    return <ActionMenu items={items} triggerLabel={t("documentRequirements.actionsFor", { name: item.label })} />
  }

  const renderList = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("documentRequirements.errorDescription")}
          errorTitle={t("documentRequirements.errorTitle")}
          forbiddenDescription={t("documentRequirements.forbiddenDescription")}
          forbiddenTitle={t("documentRequirements.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    if (requirements && requirements.length === 0) {
      return (
        <StateMessage
          action={
            isAdmin ? (
              <Button onClick={() => setDialog({ kind: "new" })}>{t("documentRequirements.new")}</Button>
            ) : undefined
          }
          description={t("documentRequirements.emptyDescription")}
          icon="file-outline"
          title={t("documentRequirements.emptyTitle")}
        />
      )
    }

    return (
      <Table
        dataKey="id"
        emptyMessage={t("documentRequirements.noResults")}
        loading={!current}
        loadingMessage={t("documentRequirements.loading")}
        value={shown}
      >
        <Table.Column
          body={(row: DocumentRequirement) => (
            <span style={{ display: "flex", flexDirection: "column" }}>
              <Text fontSize="sm" semibold>
                {row.label}
              </Text>
              <Text color="secondary" fontSize="xs">
                {row.code}
              </Text>
            </span>
          )}
          field="label"
          header={t("documentRequirements.requirement")}
        />
        <Table.Column
          body={(row: DocumentRequirement) => (
            <span style={{ display: "flex", flexDirection: "column" }}>
              <Text fontSize="sm">{t(`documentRequirements.parties.${row.party}`)}</Text>
              <Text color="secondary" fontSize="xs">
                {row.acceptedTypes.map(typeLabel).join(", ")}
              </Text>
            </span>
          )}
          field="party"
          header={t("documentRequirements.whose")}
        />
        <Table.Column
          body={(row: DocumentRequirement) => (
            <span style={{ display: "flex", flexDirection: "column" }}>
              <Text fontSize="sm">{scopeOf(row)}</Text>
              <Text color="secondary" fontSize="xs">
                {t(`documentRequirements.kinds.${row.enrollmentKind}`)}
              </Text>
            </span>
          )}
          field="unitId"
          header={t("documentRequirements.where")}
        />
        <Table.Column
          body={(row: DocumentRequirement) => (
            <Text color="secondary" fontSize="sm">
              {rulesOf(row)}
            </Text>
          )}
          field="mandatory"
          header={t("documentRequirements.rules")}
        />
        <Table.Column
          body={(row: DocumentRequirement) => (
            <Badge tone={row.active ? "success" : "neutral"}>
              {t(`documentRequirements.statuses.${row.active ? "ACTIVE" : "INACTIVE"}`)}
            </Badge>
          )}
          field="active"
          header={t("documentRequirements.status")}
        />
        {isAdmin && (
          <Table.Column
            align="right"
            body={renderActions}
            field="id"
            header={t("documentRequirements.actions")}
            width="1%"
          />
        )}
      </Table>
    )
  }

  return (
    <>
      <PageHeader
        description={t("documentRequirements.description")}
        icon="file-outline"
        title={t("shell.nav.documentRequirements")}
      />

      <Tabs
        items={[
          {
            content: (
              <Card elevated style={{ padding: spacing[32] }}>
                <ListContent>
                  <FilterBar
                    actions={
                      isAdmin ? (
                        <Button
                          onClick={() => setDialog({ kind: "new" })}
                          size="small"
                          startIcon={<Icon color="inherit" name="plus" size={16} />}
                        >
                          {t("documentRequirements.new")}
                        </Button>
                      ) : undefined
                    }
                    clearLabel={t("userAccess.clearFilters")}
                    collapseLabel={t("common.collapseFilters")}
                    expandLabel={t("common.expandFilters")}
                    hasActiveFilters={hasFilters}
                    label={t("documentRequirements.filtersLabel")}
                    onClear={() => {
                      setSearch("")
                      setStatus("")
                    }}
                    onSearchChange={setSearch}
                    searchLabel={t("documentRequirements.searchLabel")}
                    searchPlaceholder={t("documentRequirements.searchPlaceholder")}
                    searchValue={search}
                    title={t("common.filters")}
                  >
                    <Select
                      noOptionsMessage={t("common.noOptions")}
                      onChange={(option) => setStatus((option?.value as StatusFilter | undefined) ?? "")}
                      options={statusOptions}
                      placeholder={t("documentRequirements.allStatuses")}
                      size="small"
                      title={t("documentRequirements.status")}
                      value={statusOptions.find((option) => option.value === status) ?? null}
                    />
                  </FilterBar>

                  {!isAdmin && (
                    <Text color="secondary" fontSize="sm">
                      {t("documentRequirements.readOnly")}
                    </Text>
                  )}

                  {renderList()}
                </ListContent>
              </Card>
            ),
            icon: "file-outline",
            key: "requirements",
            label: t("documentRequirements.tabs.requirements"),
          },
          {
            content: (
              <Card elevated style={{ padding: spacing[32] }}>
                <UnitPoliciesTab catalogKey={reloadToken} isAdmin={isAdmin} stages={stages.items} units={units} />
              </Card>
            ),
            icon: "building-outline",
            key: "policies",
            label: t("documentRequirements.tabs.policies"),
          },
        ]}
        label={t("documentRequirements.tabs.label")}
        onChange={setTab}
        value={tab}
        attached
      />

      {dialog?.kind === "new" && (
        <RequirementFormModal
          onClose={() => setDialog(null)}
          onSaved={afterChange}
          stageOptions={stageOptions}
          unitOptions={unitOptions}
        />
      )}
      {dialog?.kind === "edit" && (
        <RequirementFormModal
          onClose={() => setDialog(null)}
          onSaved={afterChange}
          requirement={dialog.requirement}
          stageOptions={stageOptions}
          unitOptions={unitOptions}
        />
      )}
      {dialog?.kind === "status" && (
        <RequirementStatusDialog
          onChanged={afterChange}
          onClose={() => setDialog(null)}
          requirement={dialog.requirement}
        />
      )}
    </>
  )
}
