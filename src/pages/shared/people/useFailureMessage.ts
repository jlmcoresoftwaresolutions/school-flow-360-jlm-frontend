import { useTranslation } from "react-i18next"

import { getErrorCode, getErrorCorrelationId } from "@/services/httpClient"

// The message of a people action that failed without a refusal of its own: an anonymized person, who can
// no longer be changed (409 PERSON_ANONYMIZED, from any action), says so; anything else keeps the given
// message plus the backend's reference of the call (its correlation id), for support to find it.
export const useFailureMessage = () => {
  const { t } = useTranslation()

  return (message: string, error: unknown): string => {
    if (getErrorCode(error) === "PERSON_ANONYMIZED") return t("people.anonymizedLocked")

    const reference = getErrorCorrelationId(error)
    return reference ? t("people.failureWithReference", { message, reference }) : message
  }
}
