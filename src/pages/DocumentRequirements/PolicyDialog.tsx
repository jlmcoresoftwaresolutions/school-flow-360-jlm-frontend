import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { DescriptionList, Select, Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { DocumentPolicy, DocumentPolicyKind, DocumentPolicyMode } from "@/models"
import { publishDocumentPolicy, withdrawDocumentPolicy } from "@/services/documentPolicies"
import { getErrorCode } from "@/services/httpClient"

import { useFailureMessage } from "../shared/people/useFailureMessage"
import { policyModes, policyNoteMax } from "./documentRequirements.constants"

// One scope of a unit's document policy: the unit, a stage and a kind of enrollment.
export type PolicyScope = {
  kind: DocumentPolicyKind
  policy: DocumentPolicy | null
  stageId: number
  stageName: string
  unitId: number
  unitName: string
}

export type PolicyDialogProps = {
  // "publish" publishes (or publishes again) the scope; "withdraw" takes the active policy back.
  action: "publish" | "withdraw"
  // Published, withdrawn, or changed by someone else meanwhile: read the scope again.
  onChanged: () => void
  onClose: () => void
  scope: PolicyScope
}

// Publishes the document policy of a scope (the Admin declares that the unit uses the catalog, or that it
// has no blocking requirement there, with an optional note) or withdraws it (the scope is pending again;
// the row is kept). The declaration must agree with the catalog, which the backend checks: "no blocking
// requirement" while a mandatory one is published, or "uses the catalog" while nothing is, are refused on
// the field. One changed by someone else meanwhile is read again.
export const PolicyDialog = (props: PolicyDialogProps) => {
  const { action, onChanged, onClose, scope } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [mode, setMode] = useState<DocumentPolicyMode | "">(scope.policy?.active ? scope.policy.mode : "")
  const [note, setNote] = useState(scope.policy?.active ? (scope.policy.note ?? "") : "")
  const [modeError, setModeError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isPublish = action === "publish"
  const original = scope.policy?.active
    ? { mode: scope.policy.mode, note: scope.policy.note ?? "" }
    : { mode: "", note: "" }
  const modeOptions: SelectOption[] = policyModes.map((value) => ({
    label: t(`documentRequirements.policies.modes.${value}`),
    value,
  }))

  useUnsavedChanges(isPublish && !isSaving && (mode !== original.mode || note.trim() !== original.note))

  const handleFailure = (error: unknown) => {
    const code = getErrorCode(error)
    if (code === "DOCUMENT_POLICY_INVALID" && mode) {
      setModeError(t(`documentRequirements.policies.invalid.${mode}`))
    } else if (
      code === "VERSION_CONFLICT" ||
      code === "DOCUMENT_POLICY_DUPLICATE" ||
      code === "DOCUMENT_POLICY_NOT_FOUND"
    ) {
      toast.error(t("documentRequirements.policies.changedMeanwhile"))
      onChanged()
    } else {
      setFailure(toFailureMessage(t("documentRequirements.policies.failed"), error))
    }
  }

  const confirm = async () => {
    if (isPublish && !mode) {
      setModeError(t("documentRequirements.policies.modeRequired"))
      return
    }

    setModeError("")
    setFailure("")
    setIsSaving(true)
    try {
      if (isPublish && mode) {
        const trimmed = note.trim()
        await publishDocumentPolicy({
          enrollmentKind: scope.kind,
          mode,
          ...(trimmed ? { note: trimmed } : {}),
          stageId: scope.stageId,
          unitId: scope.unitId,
          ...(scope.policy ? { version: scope.policy.version } : {}),
        })
        toast.success(t("documentRequirements.policies.published"))
      } else if (scope.policy) {
        await withdrawDocumentPolicy(scope.policy.id, scope.policy.version)
        toast.success(t("documentRequirements.policies.withdrawn"))
      }
      onChanged()
    } catch (error) {
      setIsSaving(false)
      handleFailure(error)
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={
        isPublish ? t("documentRequirements.policies.publish") : t("documentRequirements.policies.withdraw")
      }
      description={
        isPublish
          ? t("documentRequirements.policies.publishDescription")
          : t("documentRequirements.policies.withdrawDescription")
      }
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={
        isPublish ? t("documentRequirements.policies.publishTitle") : t("documentRequirements.policies.withdrawTitle")
      }
      tone={isPublish ? undefined : "danger"}
      open
    >
      <DescriptionList
        emptyValue={t("common.notInformed")}
        items={[
          { key: "unit", label: t("documentRequirements.policies.unit"), value: scope.unitName },
          { key: "stage", label: t("documentRequirements.policies.stage"), value: scope.stageName },
          {
            key: "kind",
            label: t("documentRequirements.policies.kind"),
            value: t(`documentRequirements.kinds.${scope.kind}`),
          },
        ]}
      />

      {isPublish && (
        <>
          <Select
            error={modeError}
            helperText={mode ? t(`documentRequirements.policies.modeHelpers.${mode}`) : undefined}
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => {
              setMode((option?.value as DocumentPolicyMode | undefined) ?? "")
              setModeError("")
            }}
            options={modeOptions}
            placeholder={t("documentRequirements.policies.modePlaceholder")}
            title={t("documentRequirements.policies.mode")}
            value={modeOptions.find((option) => option.value === mode) ?? null}
            required
          />
          <Textarea
            helperText={t("documentRequirements.policies.noteHelper")}
            maxLength={policyNoteMax}
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
