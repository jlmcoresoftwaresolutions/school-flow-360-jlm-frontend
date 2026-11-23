import { type ChangeEvent, useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { DateInput, FileUpload, Input, Select } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { CatalogItem } from "@/models"
import { getErrorStatus } from "@/services/httpClient"
import { createPersonDocument } from "@/services/people"
import { toIsoDate } from "@/utils/dates"

import { FormFields } from "../../userAccess/userAccess.styles"
import { FieldRow } from "../people.styles"
import { checkDocumentFile, documentFileAccept, documentLimits } from "./documentFile"
import { useDocumentFailure } from "./useDocumentFailure"
import { useDocumentUpload } from "./useDocumentUpload"

export type NewDocumentModalProps = {
  documentTypes: CatalogItem[]
  personId: number
  onClose: () => void
  // The document was registered (with or without its file): the list is read again.
  onChanged: () => void
}

type FieldErrors = { documentType?: string; expiresOn?: string; file?: string }

// Registers a personal document: the type from the catalog, the number (stored masked), the issue date
// and, for a type that has one, the expiry date. The file is optional here and goes right after the
// record is made; if it is refused or cancelled, the document stays registered without a file (Sem
// arquivo), to be attached later. Nothing is ever deleted: a document leaves the list by being archived.
export const NewDocumentModal = (props: NewDocumentModalProps) => {
  const { documentTypes, onChanged, onClose, personId } = props

  const { t } = useTranslation()
  const { cancel, isUploading, progress, upload } = useDocumentUpload()
  const toFailure = useDocumentFailure()

  const formId = useId()

  const [documentType, setDocumentType] = useState("")
  const [documentNumber, setDocumentNumber] = useState("")
  const [issuedOn, setIssuedOn] = useState<Date | null>(null)
  const [expiresOn, setExpiresOn] = useState<Date | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const options = documentTypes.map((type) => ({ label: type.label, value: type.code }))
  const hasExpiry = documentTypes.find((type) => type.code === documentType)?.hasExpiry ?? false
  const isBusy = isSaving || isUploading

  useUnsavedChanges(!isBusy && (documentType !== "" || documentNumber.trim() !== "" || file !== null))

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null
    setFile(chosen)
    const problem = chosen ? checkDocumentFile(chosen) : null
    setErrors((current) => ({ ...current, file: problem ? t(`personDocuments.file.${problem}`) : undefined }))
  }

  const validate = (): FieldErrors => {
    const found: FieldErrors = {}
    if (!documentType) found.documentType = t("personDocuments.form.typeRequired")
    if (hasExpiry && issuedOn && expiresOn && expiresOn < issuedOn) {
      found.expiresOn = t("personDocuments.form.datesInvalid")
    }
    const problem = file ? checkDocumentFile(file) : null
    if (problem) found.file = t(`personDocuments.file.${problem}`)
    return found
  }

  const save = async () => {
    const found = validate()
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0) return

    setIsSaving(true)
    let created
    try {
      created = await createPersonDocument(personId, {
        documentNumber: documentNumber.trim() || undefined,
        documentType,
        expiresOn: hasExpiry && expiresOn ? toIsoDate(expiresOn) : undefined,
        issuedOn: issuedOn ? toIsoDate(issuedOn) : undefined,
      })
    } catch (error) {
      setIsSaving(false)
      const outcome = toFailure(error)
      if (outcome.kind === "field") {
        setErrors({ [outcome.field]: outcome.message })
      } else if (outcome.kind === "stale") {
        toast.error(outcome.message)
        onChanged()
      } else {
        setFailure(getErrorStatus(error) === undefined ? t("personDocuments.form.noAnswer") : outcome.message)
      }
      return
    }

    if (!file) {
      toast.success(t("personDocuments.form.done"))
      onChanged()
      return
    }

    const result = await upload(personId, created, file)
    if ("document" in result) {
      toast.success(t("personDocuments.form.doneWithFile"))
    } else {
      // The record exists already: it stays without a file, and the reason is told.
      const reason = "cancelled" in result ? t("personDocuments.file.cancelled") : toFailure(result.error).message
      toast.error(t("personDocuments.form.doneWithoutFile", { reason }))
    }
    onChanged()
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
            <Button disabled={isSaving} onClick={onClose} variant="outlined">
              {t("common.cancel")}
            </Button>
          )}
          <Button disabled={isBusy} form={formId} type="submit">
            {t("personDocuments.form.submit")}
          </Button>
        </>
      }
      onClose={isUploading ? cancel : onClose}
      size="md"
      title={t("personDocuments.form.title")}
      open
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
        noValidate
      >
        <FormFields>
          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          <FieldRow>
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
            <Input
              helperText={t("personDocuments.form.numberHelper")}
              maxLength={documentLimits.number}
              onChange={(event) => setDocumentNumber(event.target.value)}
              placeholder={t("people.form.documentNumberPlaceholder")}
              title={t("people.form.documentNumberLabel")}
              value={documentNumber}
            />
          </FieldRow>

          <FieldRow>
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
                minDate={issuedOn ?? undefined}
                onChange={(date) => {
                  setExpiresOn(date)
                  setErrors((current) => ({ ...current, expiresOn: undefined }))
                }}
                placeholder={t("common.datePlaceholder")}
                title={t("personDocuments.expiresOn")}
                value={expiresOn}
              />
            )}
          </FieldRow>

          <FileUpload
            accept={documentFileAccept}
            disabled={isBusy}
            error={errors.file}
            helperText={t("personDocuments.form.fileHelper")}
            onChange={chooseFile}
            placeholder={t("personDocuments.file.placeholder")}
            title={t("personDocuments.file.label")}
          />

          {progress !== null && (
            <Text color="secondary" fontSize="sm" role="status">
              {t("personDocuments.file.progress", { progress })}
            </Text>
          )}
        </FormFields>
      </form>
    </Modal>
  )
}
