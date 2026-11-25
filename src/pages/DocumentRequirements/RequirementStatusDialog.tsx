import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { DocumentRequirement } from "@/models"
import { setDocumentRequirementActive } from "@/services/enrollmentDocuments"
import { getErrorCode } from "@/services/httpClient"

import { useFailureMessage } from "../shared/people/useFailureMessage"

export type RequirementStatusDialogProps = {
  // Published or withdrawn, or the catalog has to be read again.
  onChanged: () => void
  onClose: () => void
  requirement: DocumentRequirement
}

// Publishes a requirement (from then on, the preparations it applies to ask for it) or withdraws it (it is
// no longer asked; nothing is deleted). A new obligation never reaches an enrollment already confirmed.
export const RequirementStatusDialog = (props: RequirementStatusDialogProps) => {
  const { onChanged, onClose, requirement } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const publish = !requirement.active

  const confirm = async () => {
    setFailure("")
    setIsSaving(true)
    try {
      await setDocumentRequirementActive(requirement.id, publish, requirement.version)
      toast.success(publish ? t("documentRequirements.published") : t("documentRequirements.withdrawn"))
      onChanged()
    } catch (error) {
      if (getErrorCode(error) === "VERSION_CONFLICT") {
        toast.error(t("documentRequirements.changedMeanwhile"))
        onChanged()
      } else {
        setFailure(toFailureMessage(t("documentRequirements.form.failed"), error))
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={publish ? t("documentRequirements.publish") : t("documentRequirements.withdraw")}
      description={
        publish ? t("documentRequirements.publishDescription") : t("documentRequirements.withdrawDescription")
      }
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={
        publish
          ? t("documentRequirements.publishTitle", { name: requirement.label })
          : t("documentRequirements.withdrawTitle", { name: requirement.label })
      }
      tone={publish ? undefined : "danger"}
      open
    >
      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
