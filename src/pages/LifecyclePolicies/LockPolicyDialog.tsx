import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import { DescriptionList, Input, Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { LifecycleLockPolicy } from "@/models"
import { getErrorCode } from "@/services/httpClient"
import { publishLockPolicy, withdrawLockPolicy } from "@/services/lifecyclePolicies"
import { stripNonDigits } from "@/utils/formats"

import { useFailureMessage } from "../shared/people/useFailureMessage"
import { lockLimits } from "./lifecyclePolicies.constants"

export type LockScope = {
  policy: LifecycleLockPolicy | null
  stageId: number
  stageName: string
  unitId: number
  unitName: string
}

export type LockPolicyDialogProps = {
  // "publish" publishes (or publishes again) the maximum; "withdraw" takes the active one back.
  action: "publish" | "withdraw"
  onChanged: () => void
  onClose: () => void
  scope: LockScope
}

// Publishes how many calendar days a lock may last in a unit and stage (1 to 366, with an optional note),
// or withdraws it: without one, a lock there stays blocked (LOCK_POLICY_UNDEFINED), and above it the event
// shows LOCK_DAYS_ABOVE_POLICY. One changed by someone else meanwhile is read again.
export const LockPolicyDialog = (props: LockPolicyDialogProps) => {
  const { action, onChanged, onClose, scope } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const active = scope.policy?.active ? scope.policy : null
  const [maxDays, setMaxDays] = useState(active ? String(active.maxDays) : "")
  const [note, setNote] = useState(active?.note ?? "")
  const [error, setError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isPublish = action === "publish"

  useUnsavedChanges(
    isPublish && !isSaving && (maxDays !== (active ? String(active.maxDays) : "") || note !== (active?.note ?? "")),
  )

  const confirm = async () => {
    const days = Number(maxDays)
    if (isPublish && (!Number.isInteger(days) || days < lockLimits.minDays || days > lockLimits.maxDays)) {
      setError(t("lifecyclePolicies.lock.maxDaysInvalid", { max: lockLimits.maxDays, min: lockLimits.minDays }))
      return
    }

    setError("")
    setFailure("")
    setIsSaving(true)
    try {
      if (isPublish) {
        const trimmed = note.trim()
        await publishLockPolicy({
          maxDays: days,
          ...(trimmed ? { note: trimmed } : {}),
          stageId: scope.stageId,
          unitId: scope.unitId,
          ...(scope.policy ? { version: scope.policy.version } : {}),
        })
        toast.success(t("lifecyclePolicies.published"))
      } else if (scope.policy) {
        await withdrawLockPolicy(scope.policy.id, scope.policy.version)
        toast.success(t("lifecyclePolicies.withdrawn"))
      }
      onChanged()
    } catch (failed) {
      setIsSaving(false)
      const code = getErrorCode(failed)
      if (code === "VERSION_CONFLICT" || code === "VERSION_REQUIRED" || code === "LOCK_POLICY_NOT_FOUND") {
        toast.error(t("lifecyclePolicies.changedMeanwhile"))
        onChanged()
      } else {
        setFailure(toFailureMessage(t("lifecyclePolicies.failed"), failed))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={isPublish ? t("lifecyclePolicies.publish") : t("lifecyclePolicies.withdraw")}
      description={
        isPublish ? t("lifecyclePolicies.lock.publishDescription") : t("lifecyclePolicies.lock.withdrawDescription")
      }
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={isPublish ? t("lifecyclePolicies.lock.publishTitle") : t("lifecyclePolicies.lock.withdrawTitle")}
      tone={isPublish ? undefined : "danger"}
      open
    >
      <DescriptionList
        emptyValue={t("common.notInformed")}
        items={[
          { key: "unit", label: t("documentRequirements.policies.unit"), value: scope.unitName },
          { key: "stage", label: t("documentRequirements.policies.stage"), value: scope.stageName },
        ]}
      />

      {isPublish && (
        <>
          <Input
            error={error}
            helperText={t("lifecyclePolicies.lock.maxDaysHelper", { max: lockLimits.maxDays })}
            inputMode="numeric"
            maxLength={3}
            onChange={(event) => {
              setMaxDays(stripNonDigits(event.target.value))
              setError("")
            }}
            placeholder={t("lifecyclePolicies.lock.maxDaysPlaceholder")}
            title={t("lifecyclePolicies.lock.maxDays")}
            value={maxDays}
            required
          />
          <Textarea
            helperText={t("documentRequirements.policies.noteHelper")}
            maxLength={lockLimits.note}
            onChange={(change) => setNote(change.target.value)}
            placeholder={t("documentRequirements.policies.notePlaceholder")}
            title={t("documentRequirements.policies.note")}
            value={note}
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
