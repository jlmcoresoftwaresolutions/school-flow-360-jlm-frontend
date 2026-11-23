import { type ChangeEvent, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { FileUpload } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { PersonDocument } from "@/models"
import { getErrorStatus } from "@/services/httpClient"
import { listPersonDocuments } from "@/services/people"

import { FormFields } from "../../userAccess/userAccess.styles"
import { checkDocumentFile, documentFileAccept } from "./documentFile"
import { useDocumentFailure } from "./useDocumentFailure"
import { useDocumentUpload } from "./useDocumentUpload"

export type DocumentFileModalProps = {
  document: PersonDocument
  personId: number
  onClose: () => void
  // The file was stored, or the list has to be read again (archived or out of reach meanwhile).
  onChanged: () => void
}

// Attaches the file of a document, or replaces the one it has (the previous file is removed only after
// the new one is stored). The file is checked before it goes (PDF, JPEG or PNG, up to 10 MB); while it
// goes, the progress shows and the upload can be cancelled, which stores nothing. A refused file leaves
// the document as it was, and the same file can be sent again.
export const DocumentFileModal = (props: DocumentFileModalProps) => {
  const { document, onChanged, onClose, personId } = props

  const { t } = useTranslation()
  const { cancel, isUploading, progress, upload } = useDocumentUpload()
  const toFailure = useDocumentFailure()

  const [file, setFile] = useState<File | null>(null)
  const [current, setCurrent] = useState(document)
  const [fileError, setFileError] = useState("")
  const [failure, setFailure] = useState("")

  const isReplacing = document.hasFile
  const label = [document.documentTypeLabel, document.maskedNumber].filter(Boolean).join(" · ")

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null
    setFile(chosen)
    setFailure("")
    const problem = chosen ? checkDocumentFile(chosen) : null
    setFileError(problem ? t(`personDocuments.file.${problem}`) : "")
  }

  // The document changed meanwhile (another file, another version): read it again so sending again
  // goes over the current version knowingly.
  const readAgain = async () => {
    try {
      const found = (await listPersonDocuments(personId, { showLoading: false })).find(
        (item) => item.id === document.id,
      )
      if (!found || found.status === "ARCHIVED") {
        onChanged()
        return
      }
      setCurrent(found)
    } catch {
      // Reading it again failed too: the message already says what happened.
    }
  }

  const send = async () => {
    setFailure("")
    if (!file) {
      setFileError(t("personDocuments.file.required"))
      return
    }
    const problem = checkDocumentFile(file)
    if (problem) {
      setFileError(t(`personDocuments.file.${problem}`))
      return
    }

    const result = await upload(personId, current, file)
    if ("document" in result) {
      toast.success(isReplacing ? t("personDocuments.file.replaced") : t("personDocuments.file.attached"))
      onChanged()
      return
    }
    if ("cancelled" in result) {
      setFailure(t("personDocuments.file.cancelled"))
      return
    }

    const outcome = toFailure(result.error)
    if (outcome.kind === "file") {
      setFileError(outcome.message)
    } else if (outcome.kind === "conflict") {
      setFailure(outcome.message)
      await readAgain()
    } else if (outcome.kind === "stale") {
      toast.error(outcome.message)
      onChanged()
    } else {
      setFailure(getErrorStatus(result.error) === undefined ? t("personDocuments.file.noAnswer") : outcome.message)
    }
  }

  return (
    <Modal
      closeLabel={t("common.close")}
      closeOnBackdropClick={false}
      footer={
        <>
          {isUploading ? (
            <Button onClick={cancel} variant="outlined">
              {t("personDocuments.file.cancelUpload")}
            </Button>
          ) : (
            <Button onClick={onClose} variant="outlined">
              {t("common.cancel")}
            </Button>
          )}
          <Button disabled={isUploading || Boolean(fileError)} onClick={() => void send()}>
            {isReplacing ? t("personDocuments.file.replace") : t("personDocuments.file.attach")}
          </Button>
        </>
      }
      onClose={isUploading ? cancel : onClose}
      size="md"
      title={isReplacing ? t("personDocuments.file.replaceTitle") : t("personDocuments.file.attachTitle")}
      open
    >
      <FormFields>
        <Text fontSize="sm" semibold>
          {label}
        </Text>
        {isReplacing && (
          <Text color="secondary" fontSize="sm">
            {t("personDocuments.file.replaceDescription", { name: document.fileName ?? "" })}
          </Text>
        )}

        <FileUpload
          accept={documentFileAccept}
          disabled={isUploading}
          error={fileError}
          helperText={t("personDocuments.file.helper")}
          onChange={chooseFile}
          placeholder={t("personDocuments.file.placeholder")}
          title={t("personDocuments.file.label")}
          required
        />

        {progress !== null && (
          <Text color="secondary" fontSize="sm" role="status">
            {t("personDocuments.file.progress", { progress })}
          </Text>
        )}

        {failure && (
          <Text color="danger" fontSize="sm" role="alert">
            {failure}
          </Text>
        )}
      </FormFields>
    </Modal>
  )
}
