import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { PersonDocument } from "@/models"
import { archivePersonDocument } from "@/services/people"

import { useDocumentFailure } from "./useDocumentFailure"

export type ArchiveDocumentDialogProps = {
  document: PersonDocument
  personId: number
  onClose: () => void
  // Archived, or the list has to be read again (changed or out of reach meanwhile).
  onChanged: () => void
}

// Archives a document, confirmed first: it stops counting as current, but it is never deleted - the
// record and its file stay, and the file can still be downloaded.
export const ArchiveDocumentDialog = (props: ArchiveDocumentDialogProps) => {
  const { document, onChanged, onClose, personId } = props

  const { t } = useTranslation()
  const toFailure = useDocumentFailure()

  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const archive = async () => {
    setIsSaving(true)
    setFailure("")
    try {
      await archivePersonDocument(personId, document.id, document.version)
      toast.success(t("personDocuments.archive.done", { type: document.documentTypeLabel }))
      onChanged()
    } catch (error) {
      setIsSaving(false)
      const outcome = toFailure(error)
      if (outcome.kind === "conflict" || outcome.kind === "stale") {
        toast.error(outcome.message)
        onChanged()
      } else {
        setFailure(outcome.message)
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t("personDocuments.archive.confirm")}
      description={t("personDocuments.archive.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void archive()}
      title={t("personDocuments.archive.title", { type: document.documentTypeLabel })}
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
