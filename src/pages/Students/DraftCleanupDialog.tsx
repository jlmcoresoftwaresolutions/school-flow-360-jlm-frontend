import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { ConfirmDialog } from "@/ds-components/organisms"
import { cleanUpDraftStudents } from "@/services/people"

import { useFailureMessage } from "../shared/people/useFailureMessage"

export type DraftCleanupDialogProps = {
  onClose: () => void
  // The cleanup ran: the list is read again.
  onDone: () => void
}

// Runs now the retention of abandoned student drafts (LGPD minimization, Admin only), which the backend
// also runs every night: a draft untouched past the retention period, without a link, an open invitation
// or a document, is deleted for good; any other draft stays. The period is the backend's policy: it is
// told only when nothing was deleted, from the answer's retentionDays.
export const DraftCleanupDialog = (props: DraftCleanupDialogProps) => {
  const { onClose, onDone } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [failure, setFailure] = useState("")
  const [isRunning, setIsRunning] = useState(false)

  const run = async () => {
    setIsRunning(true)
    setFailure("")
    try {
      const { removedDrafts, retentionDays } = await cleanUpDraftStudents()
      // Nothing deleted is an answer, not a failure: it says which drafts the retention removes.
      if (removedDrafts > 0) toast.success(t("peoplePrivacy.draftCleanup.done", { count: removedDrafts }))
      else toast.info(t("peoplePrivacy.draftCleanup.none", { days: retentionDays }))
      onDone()
    } catch (error) {
      setIsRunning(false)
      setFailure(toFailureMessage(t("peoplePrivacy.draftCleanup.failed"), error))
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t("peoplePrivacy.draftCleanup.confirm")}
      description={t("peoplePrivacy.draftCleanup.description")}
      loading={isRunning}
      onClose={onClose}
      onConfirm={() => void run()}
      title={t("peoplePrivacy.draftCleanup.title")}
      tone="danger"
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
