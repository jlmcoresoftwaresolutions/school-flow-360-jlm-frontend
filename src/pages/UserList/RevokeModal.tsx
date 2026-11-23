import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Checkbox } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import { useSignedInUser } from "@/hooks"
import type { Assignment, UserView } from "@/models"
import { getUser, revokeUserAssignments } from "@/services/users"

import { describeAccessChange } from "../shared/userAccess/accessChange"
import { AccessChangeSummary } from "../shared/userAccess/AccessChangeSummary"
import { getPersonName } from "../shared/userAccess/personName"
import { sortAccess, useAccessLabels } from "../shared/userAccess/useAccessLabels"
import { AccessItem, AccessItems, FormFields } from "../shared/userAccess/userAccess.styles"
import type { UnitDirectory } from "../shared/userAccess/useUnitDirectory"
import { useUserActionErrors } from "../shared/userAccess/useUserActionErrors"

export type RevokeModalProps = {
  unitDirectory: UnitDirectory
  user: UserView
  onClose: () => void
  onGone: () => void
  onSaved: (user: UserView) => void
}

// Revoking access (JLM-161): the operator picks which roles to take away, in which units - one, some
// or all of those within its reach - and a confirmation says exactly what goes, what stays, which units
// and roles are lost and, when nothing is left, that the person can no longer sign in (the account is
// neither inactivated nor deleted; the history stays). The user's sessions end. Nothing here reads as
// a definitive deletion.
export const RevokeModal = (props: RevokeModalProps) => {
  const { onClose, onGone, onSaved, unitDirectory, user } = props

  const { t } = useTranslation()
  const signedIn = useSignedInUser()
  const { accessLabel } = useAccessLabels(unitDirectory.units)
  const toFailure = useUserActionErrors()

  const [current, setCurrent] = useState(user)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [step, setStep] = useState<"choose" | "confirm">("choose")
  const [confirmed, setConfirmed] = useState(false)
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isAdmin = Boolean(signedIn?.admin || signedIn?.roles.includes("ADMIN"))
  const held = sortAccess(current.assignments.filter((assignment) => assignment.status === "ACTIVE"))
  const name = getPersonName(current)
  const change = describeAccessChange(
    held,
    held.filter((assignment) => !selectedIds.includes(assignment.assignmentId)),
  )

  const isLocked = (assignment: Assignment) =>
    !isAdmin && (assignment.role === "ADMIN" || !unitDirectory.units.some((unit) => unit.id === assignment.unitId))

  const toggle = (assignment: Assignment) =>
    setSelectedIds((ids) =>
      ids.includes(assignment.assignmentId)
        ? ids.filter((id) => id !== assignment.assignmentId)
        : [...ids, assignment.assignmentId],
    )

  const revoke = async () => {
    setIsSaving(true)
    setFailure("")

    try {
      const result = await revokeUserAssignments(current.id, { assignmentIds: selectedIds, confirm: true })
      toast.success(t("users.revoke.saved", { count: result.sessionsRevoked, name }))
      onSaved(result.user)
    } catch (error) {
      const result = toFailure(error)
      if (result.kind === "gone") {
        toast.error(result.message)
        onGone()
        return
      }
      if (result.kind === "conflict") {
        try {
          setCurrent(await getUser(current.id))
          setSelectedIds([])
        } catch {
          // Reading it again failed too: the message still says what happened.
        }
      }
      setFailure(result.message)
      setStep("choose")
    } finally {
      setIsSaving(false)
    }
  }

  const footer =
    step === "choose" ? (
      <>
        <Button onClick={onClose} variant="outlined">
          {t("common.cancel")}
        </Button>
        <Button
          disabled={selectedIds.length === 0}
          onClick={() => {
            setConfirmed(false)
            setStep("confirm")
          }}
        >
          {t("userAccess.form.review")}
        </Button>
      </>
    ) : (
      <>
        <Button disabled={isSaving} onClick={() => setStep("choose")} variant="outlined">
          {t("userAccess.form.back")}
        </Button>
        <Button color="danger" disabled={isSaving || !confirmed} onClick={() => void revoke()}>
          {t("users.revoke.confirm")}
        </Button>
      </>
    )

  return (
    <Modal
      closeLabel={t("common.close")}
      closeOnBackdropClick={false}
      footer={footer}
      onClose={onClose}
      size="lg"
      title={t("users.revoke.title", { name })}
      open
    >
      <FormFields>
        {failure && (
          <Text color="danger" fontSize="sm" role="alert">
            {failure}
          </Text>
        )}

        {step === "choose" ? (
          <>
            <Text color="secondary" fontSize="sm">
              {t("users.revoke.description")}
            </Text>
            <AccessItems aria-label={t("users.assignments.current")}>
              {held.map((assignment) => (
                <AccessItem key={assignment.assignmentId}>
                  <Checkbox
                    checked={selectedIds.includes(assignment.assignmentId)}
                    disabled={isLocked(assignment)}
                    helperText={isLocked(assignment) ? t("users.assignments.outOfReach") : undefined}
                    label={accessLabel(assignment)}
                    onChange={() => toggle(assignment)}
                  />
                </AccessItem>
              ))}
            </AccessItems>
          </>
        ) : (
          <>
            <AccessChangeSummary change={change} units={unitDirectory.units} />
            <Text color="secondary" fontSize="sm">
              {change.losesEverything
                ? t("users.revoke.everythingNotice", { name })
                : t("users.revoke.partialNotice", { name })}
            </Text>
            <Checkbox
              checked={confirmed}
              label={t("users.revoke.confirmCheck")}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
          </>
        )}
      </FormFields>
    </Modal>
  )
}
