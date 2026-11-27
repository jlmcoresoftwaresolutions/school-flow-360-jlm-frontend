import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Icon, Text } from "@/ds-components/atoms"
import type { ActionMenuItem, SelectOption } from "@/ds-components/molecules"
import { ActionMenu, StateMessage } from "@/ds-components/molecules"
import { Table } from "@/ds-components/organisms"
import type { AcademicGrade, AcademicOffer, AcademicPeriod, LifecycleNoEffectRule } from "@/models"
import { listAcademicOffers } from "@/services/academicCatalog"
import { getErrorStatus } from "@/services/httpClient"
import { listNoEffectRules } from "@/services/lifecyclePolicies"

import { academicMaxPageSize } from "../shared/academic/academicLimits"
import type { AcademicUnits } from "../shared/academic/useAcademicUnits"
import { useLifecycleLabels } from "../shared/enrollments/useLifecycleLabels"
import { PeopleListError } from "../shared/people/PeopleListError"
import { ListContent } from "../shared/userAccess/userAccess.styles"
import { NoEffectRuleDialog } from "./NoEffectRuleDialog"
import { UnitPicker } from "./UnitPicker"

export type NoEffectRulesTabProps = {
  grades: AcademicGrade[]
  isAdmin: boolean
  periods: AcademicPeriod[]
  units: AcademicUnits
}

type LoadResult =
  | { error: "failed" | "forbidden"; key: string }
  | { key: string; offers: AcademicOffer[]; rules: LifecycleNoEffectRule[] }

type Dialog = { action: "publish" | "withdraw"; rule: LifecycleNoEffectRule | null } | null

// The "no financial effect" rules of a unit (Fatia H): until the financial module exists, an event is
// confirmed only where the school published, with the reference and the evidence, that its type changes
// no obligation, payment or instrument, for the offer of the destination class or for the whole unit.
// Without one, the event stays blocked (FINANCIAL_POLICY_PENDING), never "pending manual handling".
export const NoEffectRulesTab = (props: NoEffectRulesTabProps) => {
  const { grades, isAdmin, periods, units } = props

  const { t } = useTranslation()
  const { typeLabel } = useLifecycleLabels()

  const [chosenUnitId, setChosenUnitId] = useState<number | null>(null)
  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)

  const firstUnit = units.units.find((unit) => unit.active) ?? units.units[0]
  const unitId = chosenUnitId ?? firstUnit?.id ?? null
  const unitName = unitId === null ? "" : (units.nameOf(unitId) ?? "")
  const requestKey = `${unitId}#${reloadToken}`
  const current = result?.key === requestKey ? result : null
  const loaded = current && "rules" in current ? current : null
  const offerLabel = (offer: AcademicOffer) =>
    [
      grades.find((grade) => grade.id === offer.gradeId)?.name ??
        t("lifecyclePolicies.noEffect.offerNumber", { id: offer.id }),
      periods.find((period) => period.id === offer.periodId)?.name,
    ]
      .filter(Boolean)
      .join(" · ")
  const offerOptions: SelectOption[] = (loaded?.offers ?? []).map((offer) => ({
    label: offerLabel(offer),
    value: String(offer.id),
  }))

  useEffect(() => {
    if (unitId === null) return

    let isStale = false

    const load = async () => {
      try {
        const [rules, offers] = await Promise.all([
          listNoEffectRules(unitId, { showLoading: false }),
          listAcademicOffers({ size: academicMaxPageSize, unitId }, { showLoading: false }),
        ])
        if (!isStale) setResult({ key: requestKey, offers: offers.items, rules })
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

  const scopeOf = (rule: LifecycleNoEffectRule) => {
    if (rule.offerId === null) return t("lifecyclePolicies.noEffect.wholeUnit")
    const offer = loaded?.offers.find((item) => item.id === rule.offerId)
    return offer ? offerLabel(offer) : t("lifecyclePolicies.noEffect.offerNumber", { id: rule.offerId })
  }

  const renderActions = (rule: LifecycleNoEffectRule) => {
    const items: ActionMenuItem[] = [
      {
        icon: "check-circle-outline",
        key: "publish",
        label: rule.active ? t("lifecyclePolicies.publishAgain") : t("lifecyclePolicies.publish"),
        onClick: () => setDialog({ action: "publish", rule }),
      },
    ]
    if (rule.active) {
      items.push({
        icon: "lock-outline",
        key: "withdraw",
        label: t("lifecyclePolicies.withdraw"),
        onClick: () => setDialog({ action: "withdraw", rule }),
        tone: "danger",
      })
    }
    return (
      <ActionMenu
        items={items}
        triggerLabel={t("lifecyclePolicies.actionsFor", { name: `${typeLabel(rule.eventType)} · ${scopeOf(rule)}` })}
      />
    )
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
    if (loaded && loaded.rules.length === 0) {
      return (
        <StateMessage
          description={t("lifecyclePolicies.noEffect.emptyDescription")}
          icon="money-outline"
          title={t("lifecyclePolicies.noEffect.emptyTitle")}
        />
      )
    }
    return (
      <Table
        dataKey="id"
        emptyMessage={t("lifecyclePolicies.noEffect.emptyTitle")}
        loading={!current}
        loadingMessage={t("lifecyclePolicies.loading")}
        value={loaded?.rules ?? []}
      >
        <Table.Column
          body={(rule: LifecycleNoEffectRule) => typeLabel(rule.eventType)}
          field="eventType"
          header={t("lifecyclePolicies.noEffect.eventType")}
        />
        <Table.Column body={scopeOf} field="offerId" header={t("lifecyclePolicies.noEffect.scope")} />
        <Table.Column
          body={(rule: LifecycleNoEffectRule) => (
            <span style={{ display: "flex", flexDirection: "column" }}>
              <Text fontSize="sm">{rule.ruleRef}</Text>
              <Text color="secondary" fontSize="xs">
                {rule.evidence}
              </Text>
            </span>
          )}
          field="ruleRef"
          header={t("lifecyclePolicies.noEffect.ruleRef")}
        />
        <Table.Column
          body={(rule: LifecycleNoEffectRule) => (
            <Badge tone={rule.active ? "success" : "neutral"}>
              {rule.active ? t("lifecyclePolicies.statuses.published") : t("lifecyclePolicies.statuses.withdrawn")}
            </Badge>
          )}
          field="active"
          header={t("documentRequirements.policies.state")}
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
    <ListContent>
      <Text color="secondary" fontSize="sm">
        {t("lifecyclePolicies.noEffect.description")}
      </Text>
      <span style={{ alignItems: "flex-end", display: "flex", flexWrap: "wrap", justifyContent: "space-between" }}>
        <UnitPicker onChange={setChosenUnitId} unitId={unitId} units={units} />
        {isAdmin && unitId !== null && loaded && (
          <Button
            onClick={() => setDialog({ action: "publish", rule: null })}
            size="small"
            startIcon={<Icon color="inherit" name="plus" size={16} />}
          >
            {t("lifecyclePolicies.noEffect.new")}
          </Button>
        )}
      </span>
      {!isAdmin && (
        <Text color="secondary" fontSize="sm">
          {t("lifecyclePolicies.readOnly")}
        </Text>
      )}
      {renderContent()}

      {dialog && unitId !== null && (
        <NoEffectRuleDialog
          action={dialog.action}
          offerOptions={offerOptions}
          onChanged={() => {
            setDialog(null)
            reload()
          }}
          onClose={() => setDialog(null)}
          rule={dialog.rule}
          unitId={unitId}
          unitName={unitName}
        />
      )}
    </ListContent>
  )
}
