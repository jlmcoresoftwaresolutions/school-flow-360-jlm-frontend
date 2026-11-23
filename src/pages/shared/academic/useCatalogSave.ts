import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"

import { useFailureMessage } from "../people/useFailureMessage"

export type CatalogSaveOptions<T> = {
  // The field a repeated name or code goes to, and its message.
  duplicate: { field: string; message: string }
  // The item is new (no answer then means "check the list before trying again").
  isNew: boolean
  successMessage: string
  onSaved: () => void
  // Reads the item again after a version conflict.
  readAgain?: () => Promise<T>
}

// How an academic catalog form saves (a stage, a grade, a subject, an offer, a room): the success
// message, a repeated name or code on its field, a version conflict read again (the form keeps its
// draft and shows the current version), an item gone or a create without an answer read from the list
// again (the academic area has no idempotency), and any other failure with its support reference.
export const useCatalogSave = <T>(options: CatalogSaveOptions<T>) => {
  const { duplicate, isNew, onSaved, readAgain, successMessage } = options

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [conflict, setConflict] = useState<T | null>(null)
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null)
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const save = async (run: () => Promise<unknown>) => {
    setIsSaving(true)
    setFailure("")
    setFieldError(null)
    try {
      await run()
      toast.success(successMessage)
      onSaved()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "ACADEMIC_DUPLICATE_CODE") {
        setFieldError(duplicate)
      } else if (code === "VERSION_CONFLICT" && readAgain) {
        try {
          setConflict(await readAgain())
        } catch {
          setFailure(t("academic.form.conflictUnread"))
        }
      } else if (code === "ACADEMIC_NOT_FOUND" || code === "VERSION_CONFLICT") {
        toast.error(t("academic.catalogStatus.changedMeanwhile"))
        onSaved()
      } else if (code === "ACADEMIC_FIELD_INCOMPATIBLE" || code === "ACADEMIC_NOT_ELIGIBLE") {
        setFailure(t("academic.form.incompatible"))
      } else if (getErrorStatus(error) === 403) {
        setFailure(t("academic.form.forbidden"))
      } else if (getErrorStatus(error) === undefined && isNew) {
        toast.error(t("academic.form.noAnswer"))
        onSaved()
      } else {
        setFailure(toFailureMessage(t("academic.form.failed"), error))
      }
    }
  }

  return {
    clearConflict: () => setConflict(null),
    clearFieldError: () => setFieldError(null),
    conflict,
    failure,
    fieldError,
    isSaving,
    save,
  }
}
