import { useTranslation } from "react-i18next"

import { getErrorCode, getErrorStatus } from "@/services/httpClient"

// How a refused change to a user reads, by the backend's stable code (never by its message). "gone":
// the user is out of reach now (404: missing or out of scope, the backend doesn't say which).
// "conflict": someone else changed the user since it was read (VERSION_CONFLICT) - read it again.
// "units": a unit was inactivated or removed meanwhile - read the units again.
export type UserActionFailure = {
  kind: "conflict" | "gone" | "other" | "units"
  message: string
}

export const useUserActionErrors = () => {
  const { t } = useTranslation()

  return (error: unknown): UserActionFailure => {
    const status = getErrorStatus(error)

    switch (getErrorCode(error)) {
      case "VERSION_CONFLICT":
        return { kind: "conflict", message: t("users.errors.conflict") }
      case "LAST_ADMIN":
        return { kind: "other", message: t("users.errors.lastAdmin") }
      case "SCOPE_DENIED":
        return { kind: "other", message: t("users.errors.scopeDenied") }
      case "ROLE_NOT_GRANTABLE":
        return { kind: "other", message: t("userAccess.form.roleNotGrantable") }
      case "UNIT_INACTIVE":
      case "UNIT_NOT_FOUND":
        return { kind: "units", message: t("userAccess.form.unitUnavailable") }
      case "NO_ACTIVE_ASSIGNMENT":
        return { kind: "other", message: t("users.errors.noActiveAssignment") }
      case "ASSIGNMENT_NOT_FOUND":
        return { kind: "conflict", message: t("users.errors.conflict") }
      case "USER_NOT_FOUND":
        return { kind: "gone", message: t("users.details.unavailable") }
      default:
        if (status === 404) return { kind: "gone", message: t("users.details.unavailable") }
        if (status === undefined) return { kind: "other", message: t("users.errors.noAnswer") }

        return { kind: "other", message: t("users.errors.failed") }
    }
  }
}
