import { type ChangeEvent, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { DateInput, FileUpload, Select } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { EnrollmentDocumentItem } from "@/models"
import { uploadEnrollmentDocument } from "@/services/enrollmentDocuments"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { toIsoDate } from "@/utils/dates"

import { checkDocumentFile, documentFileAccept } from "../../shared/people/documents/documentFile"
import { useDocumentFailure } from "../../shared/people/documents/useDocumentFailure"
import { useDocumentTypes } from "../../shared/people/useDocumentTypes"
import { FormFields } from "../../shared/userAccess/userAccess.styles"

export type UploadEnrollmentDocumentModalProps = {
  enrollmentId: number
  item: EnrollmentDocumentItem
  // The file was stored and attached, or the checklist has to be read again.
  onChanged: () => void
  onClose: () => void
}

// Sends the document of a checklist line: the type (one the requirement accepts), the dates and the file,
// which goes to the person's documents in People and is attached to the line for the school to check. The
// file is checked before it goes (PDF, JPEG or PNG, up to 10 MB); while it goes, the progress shows and the
// upload can be cancelled, which stores nothing.
export const UploadEnrollmentDocumentModal = (props: UploadEnrollmentDocumentModalProps) => {
  const { enrollmentId, item, onChanged, onClose } = props

  const controllerRef = useRef<AbortController | null>(null)

  const { t } = useTranslation()
  const documentTypes = useDocumentTypes()
  const toFailure = useDocumentFailure()

  const [documentType, setDocumentType] = useState(item.acceptedTypes.length === 1 ? item.acceptedTypes[0] : "")
  const [issuedOn, setIssuedOn] = useState<Date | null>(null)
  const [expiresOn, setExpiresOn] = useState<Date | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<{ documentType?: string; expiresOn?: string; file?: string }>({})
  const [failure, setFailure] = useState("")
  const [progress, setProgress] = useState<number | null>(null)

  const isUploading = progress !== null
  const options = documentTypes
    .filter((type) => item.acceptedTypes.length === 0 || item.acceptedTypes.includes(type.code))
    .map((type) => ({ label: type.label, value: type.code }))
  const hasExpiry = documentTypes.find((type) => type.code === documentType)?.hasExpiry ?? false
  const target = item.personName ? `${item.label} · ${item.personName}` : item.label

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null
    setFile(chosen)
    setFailure("")
    const problem = chosen ? checkDocumentFile(chosen) : null
    setErrors((current) => ({ ...current, file: problem ? t(`personDocuments.file.${problem}`) : undefined }))
  }

  const send = async () => {
    setFailure("")
    const found: typeof errors = {}
    if (!documentType) found.documentType = t("personDocuments.form.typeRequired")
    if (!file) found.file = t("personDocuments.file.required")
    const problem = file ? checkDocumentFile(file) : null
    if (problem) found.file = t(`personDocuments.file.${problem}`)
    if (hasExpiry && issuedOn && expiresOn && expiresOn < issuedOn) {
      found.expiresOn = t("personDocuments.form.datesInvalid")
    }
    setErrors(found)
    if (Object.keys(found).length > 0 || !file) return

    const controller = new AbortController()
    controllerRef.current = controller
    setProgress(0)
    try {
      await uploadEnrollmentDocument(
        enrollmentId,
        item.requirementId,
        {
          documentType,
          expiresOn: hasExpiry && expiresOn ? toIsoDate(expiresOn) : undefined,
          issuedOn: issuedOn ? toIsoDate(issuedOn) : undefined,
          personId: item.personId ?? undefined,
        },
        file,
        {
          onUploadProgress: (event) => {
            if (event.total) setProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)))
          },
          showLoading: false,
          signal: controller.signal,
        },
      )
      toast.success(t("enrollments.documents.uploaded"))
      onChanged()
    } catch (error) {
      if (controller.signal.aborted) {
        setFailure(t("personDocuments.file.cancelled"))
        return
      }
      if (getErrorCode(error) === "ENROLLMENT_DOCUMENT_INVALID") {
        setErrors({ documentType: t("enrollments.documents.typeNotAccepted") })
        return
      }
      const outcome = toFailure(error)
      if (outcome.kind === "file") setErrors({ file: outcome.message })
      else if (outcome.kind === "field") setErrors({ [outcome.field]: outcome.message })
      else if (outcome.kind === "stale") {
        toast.error(outcome.message)
        onChanged()
      } else {
        setFailure(getErrorStatus(error) === undefined ? t("personDocuments.file.noAnswer") : outcome.message)
      }
    } finally {
      controllerRef.current = null
      setProgress(null)
    }
  }

  const cancel = () => controllerRef.current?.abort()

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
          <Button disabled={isUploading} onClick={() => void send()}>
            {t("enrollments.documents.send")}
          </Button>
        </>
      }
      onClose={isUploading ? cancel : onClose}
      size="md"
      title={t("enrollments.documents.uploadTitle")}
      open
    >
      <FormFields>
        <Text fontSize="sm" semibold>
          {target}
        </Text>
        <Select
          error={errors.documentType}
          noOptionsMessage={t("common.noOptions")}
          onChange={(option) => {
            setDocumentType(option?.value ?? "")
            setErrors((current) => ({ ...current, documentType: undefined, expiresOn: undefined }))
          }}
          options={options}
          placeholder={t("people.form.documentTypePlaceholder")}
          title={t("people.form.documentTypeLabel")}
          value={options.find((option) => option.value === documentType) ?? null}
          required
        />
        <DateInput
          clearLabel={t("people.form.clearDate")}
          maxDate={new Date()}
          onChange={setIssuedOn}
          placeholder={t("common.datePlaceholder")}
          title={t("personDocuments.issuedOn")}
          value={issuedOn}
        />
        {hasExpiry && (
          <DateInput
            clearLabel={t("people.form.clearDate")}
            error={errors.expiresOn}
            onChange={setExpiresOn}
            placeholder={t("common.datePlaceholder")}
            title={t("personDocuments.expiresOn")}
            value={expiresOn}
          />
        )}
        <FileUpload
          accept={documentFileAccept}
          error={errors.file}
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
          <Text as="p" color="danger" fontSize="sm" role="alert">
            {failure}
          </Text>
        )}
      </FormFields>
    </Modal>
  )
}
