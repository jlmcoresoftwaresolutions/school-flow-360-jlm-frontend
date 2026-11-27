import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Text } from "@/ds-components/atoms"
import type { ActionMenuItem } from "@/ds-components/molecules"
import { ActionMenu, StateMessage } from "@/ds-components/molecules"
import { Table } from "@/ds-components/organisms"
import type { AcademicStage, LifecycleLockPolicy } from "@/models"
import { getErrorStatus } from "@/services/httpClient"
import { listLockPolicies } from "@/services/lifecyclePolicies"

import type { AcademicUnits } from "../shared/academic/useAcademicUnits"
import { PeopleListError } from "../shared/people/PeopleListError"
import { ListContent } from "../shared/userAccess/userAccess.styles"
import { LockPolicyDialog, type LockScope } from "./LockPolicyDialog"
import { UnitPicker } from "./UnitPicker"

export type LockPoliciesTabProps = {
  isAdmin: boolean
  stages: AcademicStage[]
  units: AcademicUnits
}

type Row = { key: number; policy: LifecycleLockPolicy | null; stage: AcademicStage }

type LoadResult = { error: "failed" | "forbidden"; key: string } | { key: string; policies: LifecycleLockPolicy[] }

type Dialog = { action: "publish" | "withdraw"; scope: LockScope } | null

// How long a lock may last, per unit and active stage (Lucas's answers of 27/11/2026: no generic lock in the
// regular stages of the pilot; EJA up to 30 days if the school approves). Without a published maximum, a
// lock there is never confirmed.
export const LockPoliciesTab = (props: LockPoliciesTabProps) => {
  const { isAdmin, stages, units } = props

  const { t } = useTranslation()

  const [chosenUnitId, setChosenUnitId] = useState<number | null>(null)
  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)

  const firstUnit = units.units.find((unit) => unit.active) ?? units.units[0]
  const unitId = chosenUnitId ?? firstUnit?.id ?? null
  const unitName = unitId === null ? "" : (units.nameOf(unitId) ?? "")
  const requestKey = `${unitId}#${reloadToken}`
  const current = result?.key === requestKey ? result : null
  const policies = current && "policies" in current ? current.policies : []
  const rows: Row[] = stages
    .filter((stage) => stage.status === "ACTIVE")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((stage) => ({ key: stage.id, policy: policies.find((policy) => policy.stageId === stage.id) ?? null, stage }))

  useEffect(() => {
    if (unitId === null) return

    let isStale = false

    const load = async () => {
      try {
        const read = await listLockPolicies(unitId, { showLoading: false })
        if (!isStale) setResult({ key: requestKey, policies: read })
      } catch (error) {
        if (!isStale) setResult({ error: getErrorStatus(error) === 403 ? "forbidden" : "failed", key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [requestKey, unitId])

  const reload = useCallback(() => setReloadToken((value) => value + 1), [])

  const scopeOf = (row: Row): LockScope => ({
    policy: row.policy,
    stageId: row.stage.id,
    stageName: row.stage.name,
    unitId: unitId as number,
    unitName,
  })

  const renderStatus = (row: Row) => {
    if (row.policy?.active) return <Badge tone="success">{t("lifecyclePolicies.statuses.published")}</Badge>
    if (row.policy) return <Badge tone="neutral">{t("lifecyclePolicies.statuses.withdrawn")}</Badge>
    return <Badge tone="warning">{t("lifecyclePolicies.statuses.none")}</Badge>
  }

  const renderLimit = (row: Row) =>
    row.policy?.active ? (
      <span style={{ display: "flex", flexDirection: "column" }}>
        <Text fontSize="sm">{t("lifecycle.profile.days", { count: row.policy.maxDays })}</Text>
        {row.policy.note && (
          <Text color="secondary" fontSize="xs">
            {row.policy.note}
          </Text>
        )}
      </span>
    ) : (
      <Text color="secondary" fontSize="sm">
        {t("lifecyclePolicies.lock.blocked")}
      </Text>
    )

  const renderActions = (row: Row) => {
    const items: ActionMenuItem[] = [
      {
        icon: "check-circle-outline",
        key: "publish",
        label: row.policy?.active ? t("lifecyclePolicies.publishAgain") : t("lifecyclePolicies.publish"),
        onClick: () => setDialog({ action: "publish", scope: scopeOf(row) }),
      },
    ]
    if (row.policy?.active) {
      items.push({
        icon: "lock-outline",
        key: "withdraw",
        label: t("lifecyclePolicies.withdraw"),
        onClick: () => setDialog({ action: "withdraw", scope: scopeOf(row) }),
        tone: "danger",
      })
    }
    return <ActionMenu items={items} triggerLabel={t("lifecyclePolicies.actionsFor", { name: row.stage.name })} />
  }

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("lifecyclePolicies.errorDescription")}
          errorTitle={t("lifecyclePolicies.errorTitle")}
          forbiddenDescription={t("lifecyclePolicies.forbiddenDescription")}
          forbiddenTitle={t("lifecyclePolicies.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }
    if (rows.length === 0) {
      return (
        <StateMessage
          description={t("documentRequirements.policies.noStagesDescription")}
          icon="school-outline"
          title={t("documentRequirements.policies.noStagesTitle")}
        />
      )
    }
    return (
      <Table
        dataKey="key"
        emptyMessage={t("documentRequirements.policies.noStagesTitle")}
        loading={!current}
        loadingMessage={t("lifecyclePolicies.loading")}
        value={rows}
      >
        <Table.Column
          body={(row: Row) => row.stage.name}
          field="stage"
          header={t("documentRequirements.policies.stage")}
        />
        <Table.Column body={renderLimit} field="policy" header={t("lifecyclePolicies.lock.maxDays")} />
        <Table.Column body={renderStatus} field="policy" header={t("documentRequirements.policies.state")} />
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
        {t("lifecyclePolicies.lock.description")}
      </Text>
      <UnitPicker onChange={setChosenUnitId} unitId={unitId} units={units} />
      {!isAdmin && (
        <Text color="secondary" fontSize="sm">
          {t("lifecyclePolicies.readOnly")}
        </Text>
      )}
      {renderContent()}

      {dialog && (
        <LockPolicyDialog
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
