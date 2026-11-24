import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import type { ActionMenuItem } from "@/ds-components/molecules"
import { useSignedInUser } from "@/hooks"
import type { PersonStatus } from "@/models"
import { hasAnyRole } from "@/utils/access"

import { useFailureMessage } from "../useFailureMessage"
import { AnonymizeDialog } from "./AnonymizeDialog"
import { downloadPersonExport } from "./personExport"

export type PersonPrivacyTarget = {
  anonymized: boolean
  name: string
  personId: number
  status: PersonStatus
}

// The LGPD actions of a student's or a guardian's profile, only for the Admin (the backend refuses them to
// anyone else): export everything kept about the person (right of access, audited) and, once the person
// is inactive and not anonymized yet, anonymize it. Returns the items for the profile's action menu and the dialog to render.
// `target` is null while the profile loads.
export const usePersonPrivacy = (target: PersonPrivacyTarget | null, onChanged: () => void) => {
  const { t } = useTranslation()
  const signedIn = useSignedInUser()
  const toFailureMessage = useFailureMessage()

  const [isAnonymizing, setIsAnonymizing] = useState(false)

  const isAdmin = hasAnyRole(signedIn, ["ADMIN"])

  const exportData = async (personId: number) => {
    try {
      await downloadPersonExport(personId)
      toast.success(t("peoplePrivacy.export.done"))
    } catch (error) {
      toast.error(toFailureMessage(t("peoplePrivacy.export.failed"), error))
    }
  }

  const items: ActionMenuItem[] = []
  if (target && isAdmin) {
    items.push({
      icon: "download-outline",
      key: "export",
      label: t("peoplePrivacy.export.action"),
      onClick: () => void exportData(target.personId),
    })
    if (target.status === "INACTIVE" && !target.anonymized) {
      items.push({
        icon: "shield-outline",
        key: "anonymize",
        label: t("peoplePrivacy.anonymize.action"),
        onClick: () => setIsAnonymizing(true),
        tone: "danger",
      })
    }
  }

  const dialog =
    target && isAnonymizing ? (
      <AnonymizeDialog
        name={target.name}
        onClose={() => setIsAnonymizing(false)}
        onDone={() => {
          setIsAnonymizing(false)
          onChanged()
        }}
        personId={target.personId}
      />
    ) : null

  return { dialog, items }
}
