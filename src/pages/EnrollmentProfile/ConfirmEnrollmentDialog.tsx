import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { DescriptionList } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { Enrollment } from "@/models"
import { confirmEnrollment } from "@/services/enrollments"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { formatDate } from "@/utils/dates"

import { useFailureMessage } from "../shared/people/useFailureMessage"

export type ConfirmEnrollmentDialogProps = {
  enrollment: Enrollment
  // The enrollment changed (confirmed, or found not ready): read it again.
  onChanged: () => void
  onClose: () => void
  onGone: () => void
}

// Confirms the enrollment (decided by Lucas on 24/11/2026): the server checks everything again and, if it
// is all there, the enrollment becomes active, gets its number (AAAA-NNNNNN, made only now) and takes the
// class's seat at once. Confirming is not a payment nor a charge. One `intent` per opening of the dialog: a
// confirmation sent again (no answer, a second click) gives the same result instead of a second one.
export const ConfirmEnrollmentDialog = (props: ConfirmEnrollmentDialogProps) => {
  const { enrollment, onChanged, onClose, onGone } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [intent] = useState(() => crypto.randomUUID())
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const { classContext } = enrollment
  const financial = enrollment.parties.filter((party) => party.financial).map((party) => party.guardianName)
  const signatories = enrollment.parties.filter((party) => party.signatory).map((party) => party.guardianName)
  // An adult student with no guardian is the own financial party and signatory.
  const studentOwnParty = t("enrollments.confirm.studentOwnParty", { name: enrollment.student.name })

  const confirm = async () => {
    setFailure("")
    setIsSaving(true)
    try {
      const confirmed = await confirmEnrollment(enrollment.id, { intent, version: enrollment.version })
      toast.success(t("enrollments.confirm.done", { number: confirmed.enrollmentNumber ?? "" }))
      onChanged()
    } catch (error) {
      const code = getErrorCode(error)
      if (getErrorStatus(error) === 404) {
        onGone()
      } else if (code === "ENROLLMENT_NOT_READY" || code === "VERSION_CONFLICT") {
        // Something changed since the page was read (a seat taken, a document expired...): the enrollment is
        // read again and shows what is missing now.
        toast.error(t("enrollments.confirm.notReady"))
        onChanged()
      } else if (code === "ENROLLMENT_ALREADY_CONFIRMED" || code === "ENROLLMENT_NOT_IN_PREPARATION") {
        toast.error(t("enrollments.confirm.alreadyConfirmed"))
        onChanged()
      } else if (getErrorStatus(error) === undefined) {
        // No answer: sending it again with the same intent never confirms twice.
        setFailure(t("enrollments.confirm.noAnswer"))
      } else {
        setFailure(toFailureMessage(t("enrollments.confirm.failed"), error))
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t("enrollments.confirm.confirm")}
      description={t("enrollments.confirm.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("enrollments.confirm.title", { name: enrollment.student.name })}
      open
    >
      <DescriptionList
        emptyValue={t("common.notInformed")}
        items={[
          {
            key: "class",
            label: t("enrollments.class.class"),
            value: classContext ? `${classContext.code} · ${classContext.name}` : "",
          },
          {
            key: "startDate",
            label: t("enrollments.startDate.title"),
            value: enrollment.startDate ? formatDate(enrollment.startDate) : "",
          },
          {
            key: "financial",
            label: t("enrollments.roles.financial"),
            value: financial.length > 0 ? financial.join(", ") : studentOwnParty,
          },
          {
            key: "signatory",
            label: t("enrollments.roles.signatory"),
            value: signatories.length > 0 ? signatories.join(", ") : studentOwnParty,
          },
        ]}
      />
      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
