import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { DescriptionList, Input, Select, Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { LifecycleEventType, LifecycleNoEffectRule } from "@/models"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { publishNoEffectRule, withdrawNoEffectRule } from "@/services/lifecyclePolicies"

import { lifecycleEventTypes, useLifecycleLabels } from "../shared/enrollments/useLifecycleLabels"
import { useFailureMessage } from "../shared/people/useFailureMessage"
import { noEffectLimits } from "./lifecyclePolicies.constants"

export type NoEffectRuleDialogProps = {
  // "publish" registers a new rule or publishes one again; "withdraw" takes an active one back.
  action: "publish" | "withdraw"
  // A label for each offer of the unit, by id.
  offerOptions: SelectOption[]
  onChanged: () => void
  onClose: () => void
  // The rule changed or withdrawn; none to register a new one.
  rule: LifecycleNoEffectRule | null
  unitId: number
  unitName: string
}

type Errors = { evidence?: string; eventType?: string; ruleRef?: string }

const wholeUnit = ""

// Publishes the institutional rule that an event type changes no obligation, payment or instrument (Lucas's
// answers of 26 and 27/11/2026): for one offer of the unit (a rule of another offer never releases a
// billable one) or for the whole unit (homologation, a unit with no billable offer), with the reference
// a person can check and the evidence. It is what lets an event of that type be confirmed until the
// financial module exists. Withdrawing blocks those events again. The event type and the scope of a
// published rule never change: another one is a new rule.
export const NoEffectRuleDialog = (props: NoEffectRuleDialogProps) => {
  const { action, offerOptions, onChanged, onClose, rule, unitId, unitName } = props

  const { t } = useTranslation()
  const { typeLabel } = useLifecycleLabels()
  const toFailureMessage = useFailureMessage()

  const [eventType, setEventType] = useState<LifecycleEventType | "">(rule?.eventType ?? "")
  const [offerId, setOfferId] = useState(rule?.offerId ? String(rule.offerId) : wholeUnit)
  const [ruleRef, setRuleRef] = useState(rule?.active ? rule.ruleRef : "")
  const [evidence, setEvidence] = useState(rule?.active ? rule.evidence : "")
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isPublish = action === "publish"
  const isNew = rule === null
  const typeOptions: SelectOption[] = lifecycleEventTypes.map((value) => ({ label: typeLabel(value), value }))
  const scopeOptions: SelectOption[] = [
    { label: t("lifecyclePolicies.noEffect.wholeUnit"), value: wholeUnit },
    ...offerOptions,
  ]
  const scopeLabel = scopeOptions.find((option) => option.value === offerId)?.label ?? ""

  useUnsavedChanges(
    isPublish &&
      !isSaving &&
      (ruleRef !== (rule?.active ? rule.ruleRef : "") || evidence !== (rule?.active ? rule.evidence : "")),
  )

  const confirm = async () => {
    const found: Errors = {}
    if (isPublish) {
      if (!eventType) found.eventType = t("lifecyclePolicies.noEffect.eventTypeRequired")
      if (!ruleRef.trim()) found.ruleRef = t("lifecyclePolicies.noEffect.ruleRefRequired")
      if (!evidence.trim()) found.evidence = t("lifecyclePolicies.noEffect.evidenceRequired")
    }
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0) return

    setIsSaving(true)
    try {
      if (isPublish && eventType) {
        await publishNoEffectRule({
          eventType,
          evidence: evidence.trim(),
          ...(offerId ? { offerId: Number(offerId) } : {}),
          ruleRef: ruleRef.trim(),
          unitId,
          ...(rule ? { version: rule.version } : {}),
        })
        toast.success(t("lifecyclePolicies.published"))
      } else if (rule) {
        await withdrawNoEffectRule(rule.id, rule.version)
        toast.success(t("lifecyclePolicies.withdrawn"))
      }
      onChanged()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "VERSION_CONFLICT" || code === "NO_EFFECT_RULE_NOT_FOUND") {
        toast.error(t("lifecyclePolicies.changedMeanwhile"))
        onChanged()
      } else if (code === "VERSION_REQUIRED") {
        // A rule of this type and scope already exists: it is published again from its own row.
        setFailure(t("lifecyclePolicies.noEffect.exists"))
      } else if (getErrorStatus(error) === 400) {
        setFailure(t("lifecyclePolicies.noEffect.invalid"))
      } else {
        setFailure(toFailureMessage(t("lifecyclePolicies.failed"), error))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={isPublish ? t("lifecyclePolicies.publish") : t("lifecyclePolicies.withdraw")}
      description={
        isPublish
          ? t("lifecyclePolicies.noEffect.publishDescription")
          : t("lifecyclePolicies.noEffect.withdrawDescription")
      }
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={isPublish ? t("lifecyclePolicies.noEffect.publishTitle") : t("lifecyclePolicies.noEffect.withdrawTitle")}
      tone={isPublish ? undefined : "danger"}
      open
    >
      <DescriptionList
        emptyValue={t("common.notInformed")}
        items={[
          { key: "unit", label: t("documentRequirements.policies.unit"), value: unitName },
          ...(isNew
            ? []
            : [
                {
                  key: "type",
                  label: t("lifecyclePolicies.noEffect.eventType"),
                  value: eventType ? typeLabel(eventType) : "",
                },
                { key: "scope", label: t("lifecyclePolicies.noEffect.scope"), value: scopeLabel },
              ]),
        ]}
      />

      {isPublish && isNew && (
        <>
          <Select
            error={errors.eventType}
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => {
              setEventType((option?.value as LifecycleEventType | undefined) ?? "")
              setErrors((current) => ({ ...current, eventType: undefined }))
            }}
            options={typeOptions}
            placeholder={t("lifecyclePolicies.noEffect.eventTypePlaceholder")}
            title={t("lifecyclePolicies.noEffect.eventType")}
            value={typeOptions.find((option) => option.value === eventType) ?? null}
            required
          />
          <Select
            helperText={t("lifecyclePolicies.noEffect.scopeHelper")}
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => setOfferId(option?.value ?? wholeUnit)}
            options={scopeOptions}
            placeholder={t("lifecyclePolicies.noEffect.scopePlaceholder")}
            title={t("lifecyclePolicies.noEffect.scope")}
            value={scopeOptions.find((option) => option.value === offerId) ?? null}
          />
        </>
      )}

      {isPublish && (
        <>
          <Input
            error={errors.ruleRef}
            helperText={t("lifecyclePolicies.noEffect.ruleRefHelper")}
            maxLength={noEffectLimits.ruleRef}
            onChange={(event) => {
              setRuleRef(event.target.value)
              setErrors((current) => ({ ...current, ruleRef: undefined }))
            }}
            placeholder={t("lifecyclePolicies.noEffect.ruleRefPlaceholder")}
            title={t("lifecyclePolicies.noEffect.ruleRef")}
            value={ruleRef}
            required
          />
          <Textarea
            error={errors.evidence}
            helperText={t("lifecyclePolicies.noEffect.evidenceHelper")}
            maxLength={noEffectLimits.evidence}
            onChange={(event) => {
              setEvidence(event.target.value)
              setErrors((current) => ({ ...current, evidence: undefined }))
            }}
            placeholder={t("lifecyclePolicies.noEffect.evidencePlaceholder")}
            title={t("lifecyclePolicies.noEffect.evidence")}
            value={evidence}
            required
          />
        </>
      )}

      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
