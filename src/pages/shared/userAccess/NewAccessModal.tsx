import { useId, useState } from "react"
import { Controller, FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { DescriptionList, Input } from "@/ds-components/molecules"
import { PhoneInput } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import { useSignedInUser } from "@/hooks"
import type { InvitationView } from "@/models"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { createInvitation } from "@/services/invitations"
import { createUser } from "@/services/users"
import { getGrantableRoles } from "@/utils/access"
import { defaultCountry } from "@/utils/countries"
import { isValidEmail } from "@/utils/email"
import { isValidPhone } from "@/utils/phone"

import { usePhoneInputTexts } from "../phone/usePhoneInputTexts"
import { AssignmentFields } from "./AssignmentFields"
import {
  emptyNewAccess,
  newAccessLimits,
  type NewAccessMode,
  type NewAccessValues,
  toNewUserRequest,
} from "./newAccess"
import { sortAccess, useAccessLabels } from "./useAccessLabels"
import { AccessLines, FormFields } from "./userAccess.styles"
import type { UnitDirectory } from "./useUnitDirectory"

export type NewAccessModalProps = {
  mode: NewAccessMode
  // The units the user manages (useUnitDirectory): their active ones are offered, and a unit refused
  // as gone has them read again.
  unitDirectory: UnitDirectory
  onClose: () => void
  // After the invitation was created: the page reads its list again.
  onCreated: (invitation: InvitationView) => void
}

// Inviting a person or registering one by hand: the same form, and on the backend the same 48 h
// invitation (the manual one marked MANUAL), never a password - the person creates their own when
// accepting it. Rendered only while open. The e-mail is required; the name is required for a manual
// registration and optional for an invitation (the person then types it when activating); the phone
// is optional. The access is one or more roles, each in a unit, limited to what the user may grant.
// Before sending, a review shows the recipient, the roles and the units. Sending carries an
// Idempotency-Key, one per review: trying again after no answer returns the same invitation instead of
// creating a second one. A refusal about the data takes the user back to the form with the field (or
// the access) marked.
export const NewAccessModal = (props: NewAccessModalProps) => {
  const { mode, onClose, onCreated, unitDirectory } = props

  const { t } = useTranslation()
  const phoneTexts = usePhoneInputTexts()
  const user = useSignedInUser()
  const { accessLabel } = useAccessLabels(unitDirectory.units)
  const form = useForm<NewAccessValues>({ defaultValues: emptyNewAccess })

  const formId = useId()

  const [step, setStep] = useState<"form" | "review">("form")
  const [attemptKey, setAttemptKey] = useState("")
  const [accessError, setAccessError] = useState("")
  const [reviewError, setReviewError] = useState("")
  const [isSending, setIsSending] = useState(false)

  const { errors, isDirty } = form.formState
  const isRegister = mode === "register"
  const roles = getGrantableRoles(user)

  useUnsavedChanges(isDirty)

  const goToReview = form.handleSubmit(() => {
    setAccessError("")
    setReviewError("")
    setAttemptKey(crypto.randomUUID())
    setStep("review")
  })

  // Back to the form, with the reason on the field (or the access) it concerns.
  const backToForm = (field?: "email", message?: string) => {
    setStep("form")
    if (field && message) form.setError(field, { message })
  }

  const notifyCreated = (invitation: InvitationView, email: string) => {
    toast.success(isRegister ? t("userAccess.form.registered", { email }) : t("userAccess.form.invited", { email }))
    if (invitation.channelResult === "FAILED") toast.warning(t("userAccess.form.emailNotSent"))
    if (invitation.channelResult === "UNKNOWN") toast.warning(t("userAccess.form.emailUnconfirmed"))
  }

  const send = async () => {
    const request = toNewUserRequest(form.getValues())

    setIsSending(true)
    setReviewError("")

    try {
      const create = isRegister ? createUser : createInvitation
      const invitation = await create(request, { idempotencyKey: attemptKey })

      notifyCreated(invitation, request.email)
      form.reset(form.getValues())
      onCreated(invitation)
      onClose()
    } catch (error) {
      switch (getErrorCode(error)) {
        case "USER_DUPLICATE":
          backToForm("email", t("userAccess.form.userDuplicate"))
          break
        case "INVITATION_PENDING":
          backToForm("email", t("userAccess.form.invitationPending"))
          break
        case "ROLE_NOT_GRANTABLE":
          setAccessError(t("userAccess.form.roleNotGrantable"))
          backToForm()
          break
        case "UNIT_INACTIVE":
        case "UNIT_NOT_FOUND":
          setAccessError(t("userAccess.form.unitUnavailable"))
          unitDirectory.reload()
          backToForm()
          break
        case "INVALID_REQUEST":
          setReviewError(t("userAccess.form.invalid"))
          break
        default:
          setReviewError(
            getErrorStatus(error) === undefined ? t("userAccess.form.noAnswer") : t("userAccess.form.failed"),
          )
      }
    } finally {
      setIsSending(false)
    }
  }

  const renderReview = () => {
    const values = form.getValues()
    const access = sortAccess(
      values.assignments.map((assignment) => ({
        role: assignment.role as Exclude<typeof assignment.role, "">,
        unitId: assignment.role === "ADMIN" ? null : Number(assignment.unitId),
      })),
    )
    const email = values.email.trim().toLowerCase()

    return (
      <FormFields>
        <Text color="secondary">
          {isRegister ? t("userAccess.form.reviewRegister", { email }) : t("userAccess.form.reviewInvite", { email })}
        </Text>

        <DescriptionList
          columns={1}
          emptyValue={t("common.notInformed")}
          items={[
            { key: "email", label: t("userAccess.form.emailLabel"), value: email },
            {
              key: "fullName",
              label: t("userAccess.form.nameLabel"),
              value: values.fullName.trim() || t("userAccess.form.nameToBeInformed"),
            },
            { key: "phone", label: t("userAccess.form.phoneLabel"), value: values.phone.trim() },
            {
              key: "access",
              label: t("userAccess.form.accessTitle"),
              value: (
                <AccessLines>
                  {access.map((item) => (
                    <span key={`${item.role}-${item.unitId ?? "institution"}`}>{accessLabel(item)}</span>
                  ))}
                </AccessLines>
              ),
            },
          ]}
        />

        {reviewError && (
          <Text color="danger" fontSize="sm" role="alert">
            {reviewError}
          </Text>
        )}
      </FormFields>
    )
  }

  const footer =
    step === "form" ? (
      <>
        <Button onClick={onClose} variant="outlined">
          {t("common.cancel")}
        </Button>
        <Button form={formId} type="submit">
          {t("userAccess.form.review")}
        </Button>
      </>
    ) : (
      <>
        <Button disabled={isSending} onClick={() => setStep("form")} variant="outlined">
          {t("userAccess.form.back")}
        </Button>
        <Button disabled={isSending} onClick={() => void send()}>
          {isRegister ? t("userAccess.form.confirmRegister") : t("userAccess.form.sendInvite")}
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
      title={isRegister ? t("userAccess.form.registerTitle") : t("userAccess.form.inviteTitle")}
      open
    >
      {step === "review" && renderReview()}

      {/* Kept mounted while reviewing, so going back finds the form (and any refusal marked) as it was. */}
      <FormProvider {...form}>
        <form id={formId} hidden={step === "review"} onSubmit={goToReview} noValidate>
          <FormFields>
            <Text color="secondary">
              {isRegister ? t("userAccess.form.registerDescription") : t("userAccess.form.inviteDescription")}
            </Text>

            <Input
              autoComplete="off"
              error={errors.email?.message}
              maxLength={newAccessLimits.email}
              placeholder={t("userAccess.form.emailPlaceholder")}
              title={t("userAccess.form.emailLabel")}
              type="email"
              required
              {...form.register("email", {
                validate: (value) => {
                  if (value.trim() === "") return t("userAccess.form.emailRequired")

                  return isValidEmail(value.trim()) || t("userAccess.form.emailInvalid")
                },
              })}
            />

            <Input
              autoComplete="off"
              error={errors.fullName?.message}
              helperText={isRegister ? undefined : t("userAccess.form.nameOptional")}
              maxLength={newAccessLimits.fullName}
              placeholder={t("userAccess.form.namePlaceholder")}
              required={isRegister}
              title={t("userAccess.form.nameLabel")}
              {...form.register("fullName", {
                validate: (value) => !isRegister || value.trim() !== "" || t("userAccess.form.nameRequired"),
              })}
            />

            <Controller
              control={form.control}
              name="phone"
              render={(controller) => (
                <PhoneInput
                  {...phoneTexts}
                  error={controller.fieldState.error?.message}
                  helperText={t("userAccess.form.phoneHelper")}
                  name={controller.field.name}
                  onBlur={controller.field.onBlur}
                  onChange={controller.field.onChange}
                  title={t("userAccess.form.phoneLabel")}
                  value={controller.field.value}
                />
              )}
              rules={{
                validate: (value) =>
                  value.trim() === "" || isValidPhone(value, defaultCountry) || t("userAccess.form.phoneInvalid"),
              }}
            />

            {unitDirectory.failed ? (
              <Text color="danger" fontSize="sm" role="alert">
                {t("userAccess.form.unitsUnavailable")}{" "}
                <Button onClick={unitDirectory.reload} size="small" variant="link">
                  {t("common.tryAgain")}
                </Button>
              </Text>
            ) : (
              <AssignmentFields error={accessError} roles={roles} units={unitDirectory.activeUnits} />
            )}
          </FormFields>
        </form>
      </FormProvider>
    </Modal>
  )
}
