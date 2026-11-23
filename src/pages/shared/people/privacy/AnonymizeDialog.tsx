import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import { Checkbox, Input } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { anonymizePerson } from "@/services/people"

import { useFailureMessage } from "../useFailureMessage"

export type AnonymizeDialogProps = {
  name: string
  personId: number
  onClose: () => void
  // Anonymized (or gone meanwhile): the profile is read again.
  onDone: () => void
}

const requestRefLimits = { max: 60, min: 3 }

// Anonymizes an inactive student or guardian (LGPD, Admin only), for the data subject's request: the
// name becomes "Pessoa anonimizada" and the e-mail, phone, document, address and files are erased, the
// access and the sessions end; the links and the history stay, no longer identifying anyone. It can't be
// undone, so it takes the protocol of the request (3 to 60 characters, recorded) and an explicit
// confirmation. Done once, it is done: a second time changes nothing.
export const AnonymizeDialog = (props: AnonymizeDialogProps) => {
  const { name, onClose, onDone, personId } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [requestRef, setRequestRef] = useState("")
  const [understood, setUnderstood] = useState(false)
  const [refError, setRefError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const refMessage = t("peoplePrivacy.anonymize.requestRefInvalid", requestRefLimits)

  useUnsavedChanges(requestRef.trim() !== "" && !isSaving)

  const confirm = async () => {
    const ref = requestRef.trim()
    if (ref.length < requestRefLimits.min || ref.length > requestRefLimits.max) {
      setRefError(refMessage)
      return
    }

    setIsSaving(true)
    setFailure("")
    try {
      await anonymizePerson(personId, { requestRef: ref })
      toast.success(t("peoplePrivacy.anonymize.done"))
      onDone()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "REQUEST_REF_REQUIRED") {
        setRefError(refMessage)
      } else if (code === "MUST_BE_INACTIVE") {
        setFailure(t("peoplePrivacy.anonymize.mustBeInactive"))
      } else if (code === "ADMIN_CANNOT_BE_ANONYMIZED") {
        setFailure(t("peoplePrivacy.anonymize.adminAccount"))
      } else if (getErrorStatus(error) === 404) {
        toast.error(t("peoplePrivacy.gone"))
        onDone()
      } else {
        setFailure(toFailureMessage(t("peoplePrivacy.anonymize.failed"), error))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmDisabled={!understood}
      confirmLabel={t("peoplePrivacy.anonymize.confirm")}
      description={t("peoplePrivacy.anonymize.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("peoplePrivacy.anonymize.title", { name })}
      tone="danger"
      open
    >
      <Input
        error={refError}
        helperText={t("peoplePrivacy.anonymize.requestRefHelper", requestRefLimits)}
        maxLength={requestRefLimits.max}
        onChange={(event) => {
          setRequestRef(event.target.value)
          setRefError("")
        }}
        placeholder={t("peoplePrivacy.anonymize.requestRefPlaceholder")}
        title={t("peoplePrivacy.anonymize.requestRef")}
        value={requestRef}
        required
      />

      <Checkbox
        checked={understood}
        label={t("peoplePrivacy.anonymize.understood")}
        onChange={(_event, checked) => setUnderstood(checked)}
      />

      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
