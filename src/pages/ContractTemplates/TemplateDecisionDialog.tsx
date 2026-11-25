import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { Input } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { ContractTemplate } from "@/models"
import { approveContractTemplate, retireContractTemplate } from "@/services/contracts"
import { getErrorCode } from "@/services/httpClient"

import { useFailureMessage } from "../shared/people/useFailureMessage"
import { templateLimits } from "./contractTemplates.constants"

export type TemplateDecisionDialogProps = {
  decision: "approve" | "retire"
  // Decided, or the list has to be read again.
  onChanged: () => void
  onClose: () => void
  template: ContractTemplate
}

// Approves a draft (Admin only, with the reference of the legal counsel's approval: who approved, when,
// where it is filed) or retires the approved model. Only one model is approved at a time: approving
// retires the one before, and every contract generated from it becomes outdated. Without an approved
// model, no contract is generated and the contract leaves the confirmation's conditions.
export const TemplateDecisionDialog = (props: TemplateDecisionDialogProps) => {
  const { decision, onChanged, onClose, template } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [reference, setReference] = useState("")
  const [error, setError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isApprove = decision === "approve"

  const confirm = async () => {
    setFailure("")
    if (isApprove && !reference.trim()) {
      setError(t("contractTemplates.approve.referenceRequired"))
      return
    }
    setIsSaving(true)
    try {
      if (isApprove) {
        await approveContractTemplate(template.id, { legalApprovalRef: reference.trim(), version: template.version })
      } else {
        await retireContractTemplate(template.id, { version: template.version })
      }
      toast.success(isApprove ? t("contractTemplates.approve.done") : t("contractTemplates.retire.done"))
      onChanged()
    } catch (failed) {
      const code = getErrorCode(failed)
      if (code === "LEGAL_APPROVAL_REQUIRED") {
        setError(t("contractTemplates.approve.referenceRequired"))
      } else if (
        code === "VERSION_CONFLICT" ||
        code === "CONTRACT_TEMPLATE_NOT_DRAFT" ||
        code === "CONTRACT_TEMPLATE_NOT_APPROVED"
      ) {
        toast.error(t("contractTemplates.changedMeanwhile"))
        onChanged()
      } else {
        setFailure(toFailureMessage(t("contractTemplates.form.failed"), failed))
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={isApprove ? t("contractTemplates.approve.action") : t("contractTemplates.retire.action")}
      description={isApprove ? t("contractTemplates.approve.description") : t("contractTemplates.retire.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={
        isApprove
          ? t("contractTemplates.approve.title", { version: template.versionNumber })
          : t("contractTemplates.retire.title", { version: template.versionNumber })
      }
      tone={isApprove ? undefined : "danger"}
      open
    >
      {isApprove && (
        <Input
          error={error}
          helperText={t("contractTemplates.approve.referenceHelper")}
          maxLength={templateLimits.legalApprovalRef}
          onChange={(event) => {
            setReference(event.target.value)
            setError("")
          }}
          placeholder={t("contractTemplates.approve.referencePlaceholder")}
          title={t("contractTemplates.approve.reference")}
          value={reference}
          required
        />
      )}
      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
