import { useState } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, IconButton, Text } from "@/ds-components/atoms"
import { Checkbox } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import { useSignedInUser } from "@/hooks"
import type { Assignment, RoleCode, UserView } from "@/models"
import { getUser, updateUserAssignments } from "@/services/users"
import { getGrantableRoles } from "@/utils/access"

import { describeAccessChange } from "../shared/userAccess/accessChange"
import { AccessChangeSummary } from "../shared/userAccess/AccessChangeSummary"
import { AssignmentFields } from "../shared/userAccess/AssignmentFields"
import { type AssignmentsFormValues, newAccessLimits } from "../shared/userAccess/newAccess"
import { getPersonName } from "../shared/userAccess/personName"
import { sortAccess, useAccessLabels } from "../shared/userAccess/useAccessLabels"
import { AccessItems, ActionableAccessItem, DetailsSection, FormFields } from "../shared/userAccess/userAccess.styles"
import type { UnitDirectory } from "../shared/userAccess/useUnitDirectory"
import { useUserActionErrors } from "../shared/userAccess/useUserActionErrors"

export type AssignmentsModalProps = {
  unitDirectory: UnitDirectory
  user: UserView
  onClose: () => void
  onGone: () => void
  onSaved: (user: UserView) => void
}

// Changing a user's roles and units (JLM-157): the access held is listed - each piece removable, but
// those outside the operator's reach (another unit, or Admin for a Secretaria), which stay as they are -
// and new roles are added below, limited to what the operator may grant. Never a permission toggle.
// Before saving, a review compares before and after: what is added, removed and kept, the units and
// roles gained or lost, a warning when Admin is granted, and an explicit confirmation when access is
// reduced. Saving ends the user's sessions (the backend does it), so the new access holds at once. At
// least one role must remain: taking all access away is "Revogar acesso". A change by someone else
// meanwhile reads the user again, keeping the roles being added.
export const AssignmentsModal = (props: AssignmentsModalProps) => {
  const { onClose, onGone, onSaved, unitDirectory, user } = props

  const { t } = useTranslation()
  const signedIn = useSignedInUser()
  const { accessLabel } = useAccessLabels(unitDirectory.units)
  const toFailure = useUserActionErrors()
  const form = useForm<AssignmentsFormValues>({ defaultValues: { assignments: [] } })

  const [current, setCurrent] = useState(user)
  const [removedIds, setRemovedIds] = useState<number[]>([])
  const [step, setStep] = useState<"edit" | "review">("edit")
  const [failure, setFailure] = useState("")
  const [reductionConfirmed, setReductionConfirmed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const isAdmin = Boolean(signedIn?.admin || signedIn?.roles.includes("ADMIN"))
  const held = sortAccess(current.assignments.filter((assignment) => assignment.status === "ACTIVE"))
  const kept = held.filter((assignment) => !removedIds.includes(assignment.assignmentId))
  const name = getPersonName(current)
  const hasChanges = removedIds.length > 0 || form.formState.isDirty

  useUnsavedChanges(hasChanges)

  // What a Secretaria can't touch: an Admin role, and anything in a unit outside its own.
  const isLocked = (assignment: Assignment) =>
    !isAdmin && (assignment.role === "ADMIN" || !unitDirectory.units.some((unit) => unit.id === assignment.unitId))

  const toggleRemoved = (assignment: Assignment) =>
    setRemovedIds((ids) =>
      ids.includes(assignment.assignmentId)
        ? ids.filter((id) => id !== assignment.assignmentId)
        : [...ids, assignment.assignmentId],
    )

  const added = () =>
    form.getValues().assignments.map((row) => ({
      role: row.role as RoleCode,
      unitId: row.role === "ADMIN" ? null : Number(row.unitId),
    }))

  const after = () => [...kept.map((item) => ({ role: item.role, unitId: item.unitId })), ...added()]

  const goToReview = form.handleSubmit(() => {
    setFailure("")
    if (after().length === 0) {
      setFailure(t("users.assignments.keepOne"))
      return
    }
    setReductionConfirmed(false)
    setStep("review")
  })

  const save = async () => {
    setIsSaving(true)
    setFailure("")

    try {
      const change = await updateUserAssignments(current.id, {
        assignments: after().map((item) => ({ roleCode: item.role, schoolUnitId: item.unitId })),
        version: current.version,
      })
      form.reset({ assignments: [] })
      setRemovedIds([])
      toast.success(t("users.assignments.saved", { count: change.sessionsRevoked, name }))
      onSaved(change.user)
    } catch (error) {
      const result = toFailure(error)
      if (result.kind === "gone") {
        toast.error(result.message)
        onGone()
        return
      }
      if (result.kind === "units") unitDirectory.reload()
      if (result.kind === "conflict") {
        try {
          setCurrent(await getUser(current.id))
          setRemovedIds([])
        } catch {
          // Reading it again failed too: the message still says what happened.
        }
      }
      setFailure(result.message)
      setStep("edit")
    } finally {
      setIsSaving(false)
    }
  }

  const change = step === "review" ? describeAccessChange(held, after()) : null
  const reduces = Boolean(change && change.removed.length > 0)

  const footer =
    step === "edit" ? (
      <>
        <Button onClick={onClose} variant="outlined">
          {t("common.cancel")}
        </Button>
        <Button disabled={!hasChanges} onClick={() => void goToReview()}>
          {t("userAccess.form.review")}
        </Button>
      </>
    ) : (
      <>
        <Button disabled={isSaving} onClick={() => setStep("edit")} variant="outlined">
          {t("userAccess.form.back")}
        </Button>
        <Button disabled={isSaving || (reduces && !reductionConfirmed)} onClick={() => void save()}>
          {t("users.assignments.confirm")}
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
      title={t("users.assignments.title", { name })}
      open
    >
      <FormFields>
        {failure && (
          <Text color="danger" fontSize="sm" role="alert">
            {failure}
          </Text>
        )}

        {change && (
          <>
            <AccessChangeSummary change={change} units={unitDirectory.units} />
            <Text color="secondary" fontSize="sm">
              {t("users.assignments.sessionsNotice", { name })}
            </Text>
            {reduces && (
              <Checkbox
                checked={reductionConfirmed}
                label={t("users.assignments.confirmReduction")}
                onChange={(event) => setReductionConfirmed(event.target.checked)}
              />
            )}
          </>
        )}

        <div hidden={step === "review"}>
          <FormFields>
            <DetailsSection aria-label={t("users.assignments.current")}>
              <Text as="h3" fontSize="sm" semibold>
                {t("users.assignments.current")}
              </Text>
              <AccessItems>
                {held.map((assignment) => {
                  const removed = removedIds.includes(assignment.assignmentId)
                  const label = accessLabel(assignment)

                  return (
                    <ActionableAccessItem key={assignment.assignmentId}>
                      <Text color={removed ? "danger" : "default"} fontSize="sm">
                        {removed ? t("users.assignments.willBeRemoved", { access: label }) : label}
                      </Text>
                      {isLocked(assignment) ? (
                        <Text color="secondary" fontSize="xs">
                          {t("users.assignments.outOfReach")}
                        </Text>
                      ) : (
                        <IconButton
                          color={removed ? "brand" : "danger"}
                          icon={removed ? "undo" : "trash-outline"}
                          label={
                            removed
                              ? t("users.assignments.keepLabel", { access: label })
                              : t("users.assignments.removeLabel", { access: label })
                          }
                          onClick={() => toggleRemoved(assignment)}
                          size="small"
                          tooltip={removed ? t("users.assignments.keep") : t("userAccess.form.removeAssignment")}
                        />
                      )}
                    </ActionableAccessItem>
                  )
                })}
              </AccessItems>
            </DetailsSection>

            <FormProvider {...form}>
              <AssignmentFields
                description={t("users.assignments.addDescription")}
                maxRows={newAccessLimits.assignments - kept.length}
                roles={getGrantableRoles(signedIn)}
                taken={held.map((assignment) => ({ role: assignment.role, unitId: assignment.unitId }))}
                title={t("users.assignments.add")}
                units={unitDirectory.activeUnits}
                allowEmpty
              />
            </FormProvider>
          </FormFields>
        </div>
      </FormFields>
    </Modal>
  )
}
