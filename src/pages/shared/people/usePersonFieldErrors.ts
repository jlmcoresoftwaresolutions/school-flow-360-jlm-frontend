import { useTranslation } from "react-i18next"

import { getErrorCode } from "@/services/httpClient"

import type { PersonFormValues } from "./personForm"

export type PersonFieldError = {
  field: keyof PersonFormValues
  message: string
}

// Where a refusal of a person's save goes, by the backend's stable code: the field it is about (the
// name, the birth date, the e-mail, the document), or null when it is about something else.
export const usePersonFieldErrors = () => {
  const { t } = useTranslation()

  return (error: unknown): PersonFieldError | null => {
    switch (getErrorCode(error)) {
      case "NAME_REQUIRED":
        return { field: "fullName", message: t("people.form.fullNameRequired") }
      case "BIRTH_DATE_FUTURE":
        return { field: "birthDate", message: t("people.form.birthDateFuture") }
      case "EMAIL_INVALID":
        return { field: "contactEmail", message: t("people.form.emailInvalid") }
      case "DOCUMENT_TYPE_INVALID":
        return { field: "documentType", message: t("people.form.documentTypeInvalid") }
      case "DOCUMENT_INCOMPLETE":
      case "DOCUMENT_INVALID":
        return { field: "documentNumber", message: t("people.form.documentInvalid") }
      case "DOCUMENT_IN_USE":
        return { field: "documentNumber", message: t("people.form.documentInUse") }
      default:
        return null
    }
  }
}
