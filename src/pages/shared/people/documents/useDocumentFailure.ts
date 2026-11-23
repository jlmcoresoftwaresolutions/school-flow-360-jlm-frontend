import { useTranslation } from "react-i18next"

import { getErrorCode, getErrorStatus } from "@/services/httpClient"

// Where a refusal of a document goes: the file, a field of the new document, the whole form, or one of
// the outcomes the dialog handles itself (the document changed meanwhile, or it is archived or out of
// reach now and the list is read again).
export type DocumentFailure =
  | { field: "documentType" | "expiresOn"; kind: "field"; message: string }
  | { kind: "conflict" | "file" | "form" | "stale"; message: string }

// The refusals of the personal documents (P03 contract, slice 4), read by the stable code.
export const useDocumentFailure = () => {
  const { t } = useTranslation()

  return (error: unknown): DocumentFailure => {
    switch (getErrorCode(error)) {
      case "FILE_TOO_LARGE":
        return { kind: "file", message: t("personDocuments.file.size") }
      case "FILE_TYPE_NOT_ALLOWED":
        return { kind: "file", message: t("personDocuments.file.type") }
      case "FILE_REQUIRED":
        return { kind: "file", message: t("personDocuments.file.required") }
      case "STORAGE_DISABLED":
        return { kind: "form", message: t("personDocuments.storageDisabled") }
      case "DOCUMENT_TYPE_INVALID":
        return { field: "documentType", kind: "field", message: t("personDocuments.form.typeInvalid") }
      case "EXPIRY_NOT_APPLICABLE":
        return { field: "expiresOn", kind: "field", message: t("personDocuments.form.expiryNotApplicable") }
      case "DATES_INVALID":
        return { field: "expiresOn", kind: "field", message: t("personDocuments.form.datesInvalid") }
      case "VERSION_CONFLICT":
        return { kind: "conflict", message: t("personDocuments.conflict") }
      case "DOCUMENT_ARCHIVED":
        return { kind: "stale", message: t("personDocuments.archivedMeanwhile") }
      case "FILE_NOT_FOUND":
        return { kind: "stale", message: t("personDocuments.fileGone") }
      default:
        if (getErrorStatus(error) === 404) return { kind: "stale", message: t("personDocuments.gone") }
        return { kind: "form", message: t("personDocuments.failed") }
    }
  }
}
