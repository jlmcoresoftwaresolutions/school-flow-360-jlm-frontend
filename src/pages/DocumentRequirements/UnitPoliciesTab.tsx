import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, type BadgeProps, Text } from "@/ds-components/atoms"
import type { ActionMenuItem, SelectOption } from "@/ds-components/molecules"
import { ActionMenu, Select, StateMessage } from "@/ds-components/molecules"
import { Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import type { AcademicStage, DocumentPolicy, DocumentPolicyKind, DocumentPolicyStateCode } from "@/models"
import { getDocumentPolicyState, listDocumentPolicies } from "@/services/documentPolicies"
import { getErrorStatus } from "@/services/httpClient"

import type { AcademicUnits } from "../shared/academic/useAcademicUnits"
import { PeopleListError } from "../shared/people/PeopleListError"
import { ListContent } from "../shared/userAccess/userAccess.styles"
import { policyKinds } from "./documentRequirements.constants"
import { PolicyDialog, type PolicyScope } from "./PolicyDialog"

export type UnitPoliciesTabProps = {
  // Changes whenever the catalog of requirements changes, since a policy's state depends on it.
  catalogKey: number
  isAdmin: boolean
  stages: AcademicStage[]
  units: AcademicUnits
}

type BadgeTone = NonNullable<BadgeProps["tone"]>

type Row = {
  kind: DocumentPolicyKind
  key: string
  policy: DocumentPolicy | null
  stageId: number
  state: DocumentPolicyStateCode
}

type LoadResult = { error: "failed" | "forbidden"; key: string } | { key: string; rows: Row[] }

type Dialog = { action: "publish" | "withdraw"; scope: PolicyScope } | null

const stateTones: Record<DocumentPolicyStateCode, BadgeTone> = {
  INCONSISTENT: "danger",
  NO_BLOCKING: "success",
  PENDING: "warning",
  USE_CATALOG: "success",
}

// The document policy of each unit (EPIC 7, Lucas's answer 1 of 26/11/2026): per active stage and kind of
// enrollment, what the unit declared (it uses the catalog of requirements, or it has no blocking
// requirement), and the state the backend reads today from that declaration and the catalog. Nothing
// published is a pending policy, never "nothing is asked": it stops the confirmation of a transfer and of
// a re-enrollment (the new enrollment doesn't change). One unit at a time; only the Admin publishes and
// withdraws, the Secretaria reads its own units.
export const UnitPoliciesTab = (props: UnitPoliciesTabProps) => {
  const { catalogKey, isAdmin, stages, units } = props

  const { t } = useTranslation()

  const [chosenUnitId, setChosenUnitId] = useState<number | null>(null)
  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)

  const firstUnit = units.units.find((unit) => unit.active) ?? units.units[0]
  const unitId = chosenUnitId ?? firstUnit?.id ?? null
  const unitName = unitId === null ? "" : (units.nameOf(unitId) ?? "")
  const activeStages = stages.filter((stage) => stage.status === "ACTIVE").sort((a, b) => a.sortOrder - b.sortOrder)
  const stagesKey = activeStages.map((stage) => stage.id).join(",")
  const requestKey = `${unitId}#${stagesKey}#${catalogKey}#${reloadToken}`
  const current = result?.key === requestKey ? result : null
  const unitOptions: SelectOption[] = units.units.map((unit) => ({
    label: unit.active ? unit.name : t("documentRequirements.policies.inactiveUnit", { name: unit.name }),
    value: String(unit.id),
  }))

  useEffect(() => {
    if (unitId === null || !stagesKey) return

    let isStale = false

    const load = async () => {
      try {
        const stageIds = stagesKey.split(",").map(Number)
        const scopes = stageIds.flatMap((stageId) => policyKinds.map((kind) => ({ kind, stageId })))
        const [policies, states] = await Promise.all([
          listDocumentPolicies(unitId, { showLoading: false }),
          Promise.all(
            scopes.map((scope) => getDocumentPolicyState(unitId, scope.stageId, scope.kind, { showLoading: false })),
          ),
        ])
        const rows = scopes.map((scope, index) => ({
          kind: scope.kind,
          key: `${scope.stageId}#${scope.kind}`,
          policy:
            policies.find((policy) => policy.stageId === scope.stageId && policy.enrollmentKind === scope.kind) ?? null,
          stageId: scope.stageId,
          state: states[index].state,
        }))
        if (!isStale) setResult({ key: requestKey, rows })
      } catch (error) {
        if (!isStale) setResult({ error: getErrorStatus(error) === 403 ? "forbidden" : "failed", key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [requestKey, stagesKey, unitId])

  const reload = useCallback(() => setReloadToken((value) => value + 1), [])

  const stageName = (stageId: number) => activeStages.find((stage) => stage.id === stageId)?.name ?? ""

  const scopeOf = (row: Row): PolicyScope => ({
    kind: row.kind,
    policy: row.policy,
    stageId: row.stageId,
    stageName: stageName(row.stageId),
    unitId: unitId as number,
    unitName,
  })

  const renderDeclaration = (row: Row) => {
    if (!row.policy) {
      return (
        <Text color="secondary" fontSize="sm">
          {t("documentRequirements.policies.nothingPublished")}
        </Text>
      )
    }
    if (!row.policy.active) {
      return (
        <Text color="secondary" fontSize="sm">
          {t("documentRequirements.policies.withdrawnLabel")}
        </Text>
      )
    }
    return (
      <span style={{ display: "flex", flexDirection: "column" }}>
        <Text fontSize="sm">{t(`documentRequirements.policies.modes.${row.policy.mode}`)}</Text>
        {row.policy.note && (
          <Text color="secondary" fontSize="xs">
            {row.policy.note}
          </Text>
        )}
      </span>
    )
  }

  const renderActions = (row: Row) => {
    const items: ActionMenuItem[] = [
      {
        icon: "check-circle-outline",
        key: "publish",
        label: row.policy?.active
          ? t("documentRequirements.policies.publishAgain")
          : t("documentRequirements.policies.publish"),
        onClick: () => setDialog({ action: "publish", scope: scopeOf(row) }),
      },
    ]
    if (row.policy?.active) {
      items.push({
        icon: "lock-outline",
        key: "withdraw",
        label: t("documentRequirements.policies.withdraw"),
        onClick: () => setDialog({ action: "withdraw", scope: scopeOf(row) }),
        tone: "danger",
      })
    }

    return (
      <ActionMenu
        items={items}
        triggerLabel={t("documentRequirements.policies.actionsFor", {
          kind: t(`documentRequirements.kinds.${row.kind}`),
          stage: stageName(row.stageId),
        })}
      />
    )
  }

  const renderContent = () => {
    if (unitId === null) {
      return (
        <StateMessage
          description={t("documentRequirements.policies.noUnitsDescription")}
          icon="building-outline"
          title={t("documentRequirements.policies.noUnitsTitle")}
        />
      )
    }
    if (activeStages.length === 0) {
      return (
        <StateMessage
          description={t("documentRequirements.policies.noStagesDescription")}
          icon="school-outline"
          title={t("documentRequirements.policies.noStagesTitle")}
        />
      )
    }
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("documentRequirements.policies.errorDescription")}
          errorTitle={t("documentRequirements.policies.errorTitle")}
          forbiddenDescription={t("documentRequirements.forbiddenDescription")}
          forbiddenTitle={t("documentRequirements.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    return (
      <Table
        dataKey="key"
        emptyMessage={t("documentRequirements.policies.noStagesTitle")}
        loading={!current}
        loadingMessage={t("documentRequirements.policies.loading")}
        value={current && "rows" in current ? current.rows : []}
      >
        <Table.Column
          body={(row: Row) => stageName(row.stageId)}
          field="stageId"
          header={t("documentRequirements.policies.stage")}
        />
        <Table.Column
          body={(row: Row) => t(`documentRequirements.kinds.${row.kind}`)}
          field="kind"
          header={t("documentRequirements.policies.kind")}
        />
        <Table.Column
          body={(row: Row) => (
            <Badge tone={stateTones[row.state] ?? "neutral"}>
              {t(`documentRequirements.policies.states.${row.state}`)}
            </Badge>
          )}
          field="state"
          header={t("documentRequirements.policies.state")}
        />
        <Table.Column body={renderDeclaration} field="policy" header={t("documentRequirements.policies.declaration")} />
        {isAdmin && (
          <Table.Column
            align="right"
            body={renderActions}
            field="key"
            header={t("documentRequirements.actions")}
            width="1%"
          />
        )}
      </Table>
    )
  }

  return (
    <ListContent>
      <Text color="secondary" fontSize="sm">
        {t("documentRequirements.policies.description")}
      </Text>

      {unitOptions.length > 0 && (
        <div style={{ maxWidth: spacing[256] }}>
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => setChosenUnitId(option ? Number(option.value) : null)}
            options={unitOptions}
            placeholder={t("documentRequirements.policies.unitPlaceholder")}
            size="small"
            title={t("documentRequirements.policies.unit")}
            value={unitOptions.find((option) => option.value === String(unitId)) ?? null}
          />
        </div>
      )}

      {!isAdmin && (
        <Text color="secondary" fontSize="sm">
          {t("documentRequirements.policies.readOnly")}
        </Text>
      )}

      {renderContent()}

      {dialog && (
        <PolicyDialog
          action={dialog.action}
          onChanged={() => {
            setDialog(null)
            reload()
          }}
          onClose={() => setDialog(null)}
          scope={dialog.scope}
        />
      )}
    </ListContent>
  )
}
