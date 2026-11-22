import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { toast } from "@/components"
import { Button, Card, Grid, Text } from "@/ds-components/atoms"
import { Checkbox, DescriptionList, Input, StateMessage } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import type { AcceptInvitationRequest, InvitationValidation, InvitationValidationAssignment } from "@/models"
import { paths } from "@/routes/paths"
import { acceptInvitation, getErrorCode, getErrorStatus, validateInvitation } from "@/services"
import { defaultCountry } from "@/utils/countries"
import { formatPhoneForDisplay, formatPhoneInput, isValidPhone, toInternationalPhone } from "@/utils/phone"

import { AcceptInvitationWrapper } from "./AcceptInvitation.styles"

// The backend's password policy: 12 to 128 characters, nothing else required.
const passwordLength = { max: 128, min: 12 }

// The backend's limits for what the screen collects (longer is a 400 INVALID_REQUEST).
const nameMaxLength = 150
const phoneMaxLength = 30

type AcceptInvitationValues = {
  confirmPassword: string
  fullName: string
  password: string
  phone: string
  termsAccepted: boolean
}

// What the link leads to. checking: being validated (the global Loading overlay covers the page).
// valid: the form is shown. unavailable: the backend couldn't be reached to tell. The rest are links
// that can't create an account: invalid (unknown, cancelled or replaced by a newer invitation - the
// backend doesn't say which), expired, used, duplicate (the e-mail already has an account) and
// unitInactive (the unit it grants was inactivated).
type LinkStatus = "checking" | "duplicate" | "expired" | "invalid" | "unavailable" | "unitInactive" | "used" | "valid"

// The dead ends, each with its own explanation and a way out.
const deadEnds: Partial<Record<LinkStatus, "forgotPassword" | "login">> = {
  duplicate: "forgotPassword",
  expired: "login",
  invalid: "login",
  unitInactive: "login",
  used: "login",
}

// Opened from the invitation e-mail (/accept-invitation?token=...&tenant=...): the person confirms
// their name and phone and creates their own password, and the account is born (nobody else ever
// knows the password); they then sign in normally. The link is checked first, so a dead one says so
// before anything is typed, and a valid one shows the institution and what the account will be able
// to do and where (the invitation's roles and units, which can't be changed here). Every account has
// a name: the invitation's prefills the field, and the one typed replaces it. Both calls go to the
// tenant named in the link, the school that sent it. Signed-in or not, the link works (no redirect in
// the router).
export const AcceptInvitation = () => {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { control, formState, getValues, handleSubmit, register, reset, setError, setValue } =
    useForm<AcceptInvitationValues>({
      defaultValues: { confirmPassword: "", fullName: "", password: "", phone: "", termsAccepted: false },
    })

  const [linkStatus, setLinkStatus] = useState<LinkStatus>("checking")
  const [invitation, setInvitation] = useState<InvitationValidation | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [hasFailed, setHasFailed] = useState(false)

  const { errors, isSubmitting } = formState
  const token = searchParams.get("token")?.trim() ?? ""
  const tenantId = searchParams.get("tenant")?.trim() ?? ""
  const hasLinkParams = Boolean(token) && Boolean(tenantId)
  const status: LinkStatus = hasLinkParams ? linkStatus : "invalid"
  const expiresAt = invitation ? new Date(invitation.expiresAt) : null
  const institution = invitation?.organizationName?.trim() || invitation?.institutionName?.trim() || ""
  const prefilledPhone = invitation?.phone ? formatPhoneForDisplay(invitation.phone, defaultCountry) : ""

  useEffect(() => {
    if (!hasLinkParams) return

    // An answer that arrives after this effect was cleaned up (the link changed) is dropped.
    let isStale = false

    const checkLink = async () => {
      try {
        const validation = await validateInvitation({ token }, { tenantId })
        if (isStale) return

        setInvitation(validation)
        setLinkStatus(validation.valid ? "valid" : "invalid")
        // What the invitation already carries fills the form; the person can still change it.
        reset({
          confirmPassword: "",
          fullName: validation.fullName ?? "",
          password: "",
          phone: validation.phone ? formatPhoneForDisplay(validation.phone, defaultCountry) : "",
          termsAccepted: false,
        })
      } catch (error) {
        if (isStale) return

        // Any unusable link is the same 404 INVITATION_INVALID; anything else says nothing about it.
        setLinkStatus(getErrorStatus(error) === 404 ? "invalid" : "unavailable")
      }
    }

    void checkLink()

    return () => {
      isStale = true
    }
  }, [hasLinkParams, reloadToken, reset, tenantId, token])

  const handleRetry = () => {
    setLinkStatus("checking")
    setReloadToken((current) => current + 1)
  }

  const describeAssignment = (assignment: InvitationValidationAssignment) => {
    const role = t(`shell.roles.${assignment.role}`)
    if (assignment.unitId === null)
      return t("acceptInvitation.assignment", { role, unit: t("acceptInvitation.wholeInstitution") })
    if (!assignment.unitName) return role

    return t("acceptInvitation.assignment", { role, unit: assignment.unitName })
  }

  const onSubmit = async (values: AcceptInvitationValues) => {
    setHasFailed(false)

    const request: AcceptInvitationRequest = {
      fullName: values.fullName.trim(),
      password: values.password,
      termsAccepted: values.termsAccepted,
      termsVersion: invitation?.termsVersion ?? "",
      token,
    }
    // The invitation's own phone (or none) is left out: the backend keeps the invitation's.
    if (values.phone.trim() !== "" && values.phone !== prefilledPhone) {
      request.phone = toInternationalPhone(values.phone, defaultCountry)
    }

    try {
      await acceptInvitation(request, { tenantId })
      toast.success(t("acceptInvitation.activated"))
      navigate(paths.login, { replace: true })
    } catch (error) {
      switch (getErrorCode(error)) {
        case "WEAK_PASSWORD":
          setError("password", { message: t("acceptInvitation.passwordTooShort", passwordLength) })
          return
        case "NAME_REQUIRED":
          setError("fullName", { message: t("acceptInvitation.nameRequired") })
          return
        case "TERMS_NOT_ACCEPTED":
          setError("termsAccepted", { message: t("acceptInvitation.termsRequired") })
          return
        case "TERMS_VERSION_INVALID":
          await refreshTermsVersion()
          return
        case "INVITATION_EXPIRED":
          setLinkStatus("expired")
          return
        case "INVITATION_ALREADY_USED":
          setLinkStatus("used")
          return
        case "INVITATION_INVALID":
          setLinkStatus("invalid")
          return
        case "USER_DUPLICATE":
          setLinkStatus("duplicate")
          return
        case "UNIT_INACTIVE":
          setLinkStatus("unitInactive")
          return
        default:
          setHasFailed(true)
      }
    }
  }

  // The Terms of Use changed while the form was open: read the version in force again (keeping what was
  // typed) and ask for the acceptance again, since what was accepted is no longer the current text.
  const refreshTermsVersion = async () => {
    try {
      const validation = await validateInvitation({ token }, { tenantId })
      setInvitation(validation)
      setValue("termsAccepted", false)
      setError("termsAccepted", { message: t("acceptInvitation.termsChanged", { version: validation.termsVersion }) })
    } catch {
      setHasFailed(true)
    }
  }

  const renderDeadEnd = (deadEnd: "forgotPassword" | "login") => (
    <StateMessage
      action={
        <Button as={Link} to={deadEnd === "forgotPassword" ? paths.forgotPassword : paths.login}>
          {deadEnd === "forgotPassword" ? t("acceptInvitation.recoverPassword") : t("acceptInvitation.goToLogin")}
        </Button>
      }
      description={t(`acceptInvitation.${status}Description` as "acceptInvitation.invalidDescription")}
      title={t(`acceptInvitation.${status}Title` as "acceptInvitation.invalidTitle")}
      variant="error"
    />
  )

  // What the account will be able to do and where (the institution is already in the description).
  const renderAccess = () => {
    const assignments = invitation?.assignments ?? []
    if (assignments.length === 0) return null

    return (
      <DescriptionList
        columns={1}
        items={[
          {
            key: "access",
            label: t("acceptInvitation.accessLabel"),
            value: (
              <span style={{ display: "flex", flexDirection: "column", gap: spacing[4] }}>
                {assignments.map((assignment) => (
                  <span key={`${assignment.role}-${assignment.unitId ?? "institution"}`}>
                    {describeAssignment(assignment)}
                  </span>
                ))}
              </span>
            ),
          },
        ]}
      />
    )
  }

  const renderContent = () => {
    const deadEnd = deadEnds[status]
    if (deadEnd) return renderDeadEnd(deadEnd)

    if (status === "unavailable") {
      return (
        <StateMessage
          action={<Button onClick={handleRetry}>{t("common.tryAgain")}</Button>}
          description={t("acceptInvitation.unavailableDescription")}
          title={t("acceptInvitation.unavailableTitle")}
          variant="error"
        />
      )
    }

    return (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing[8] }}>
          <Text as="h1" fontSize="3xl" bold>
            {t("acceptInvitation.title")}
          </Text>

          <Text as="p" color="secondary">
            {institution
              ? t("acceptInvitation.descriptionWithInstitution", { email: invitation?.email ?? "", institution })
              : t("acceptInvitation.description", { email: invitation?.email ?? "" })}
          </Text>

          {expiresAt && !Number.isNaN(expiresAt.getTime()) && (
            <Text as="p" color="secondary" fontSize="sm">
              {t("acceptInvitation.validUntil", {
                date: new Intl.DateTimeFormat(i18n.language, { dateStyle: "long", timeStyle: "short" }).format(
                  expiresAt,
                ),
              })}
            </Text>
          )}
        </div>

        {renderAccess()}

        <form
          onSubmit={handleSubmit(onSubmit, () => setHasFailed(false))}
          noValidate
          style={{ display: "flex", flexDirection: "column", gap: spacing[24] }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
            <Input
              autoComplete="name"
              error={errors.fullName?.message}
              maxLength={nameMaxLength}
              placeholder={t("acceptInvitation.namePlaceholder")}
              title={t("acceptInvitation.nameLabel")}
              required
              {...register("fullName", {
                validate: (value) => value.trim() !== "" || t("acceptInvitation.nameRequired"),
              })}
            />

            <Controller
              control={control}
              name="phone"
              render={(controller) => (
                <Input
                  autoComplete="tel"
                  error={controller.fieldState.error?.message}
                  helperText={t("acceptInvitation.phoneHelper")}
                  maxLength={phoneMaxLength}
                  name={controller.field.name}
                  onBlur={controller.field.onBlur}
                  onChange={(event) =>
                    controller.field.onChange(
                      formatPhoneInput(event.target.value, controller.field.value, defaultCountry),
                    )
                  }
                  placeholder={t("acceptInvitation.phonePlaceholder")}
                  ref={controller.field.ref}
                  title={t("acceptInvitation.phoneLabel")}
                  type="tel"
                  value={controller.field.value}
                />
              )}
              rules={{
                validate: (value) => {
                  // The invitation's own phone isn't sent again, so it isn't checked either.
                  if (value.trim() === "" || value === prefilledPhone) return true

                  return isValidPhone(value, defaultCountry) || t("acceptInvitation.phoneInvalid")
                },
              }}
            />

            <Input
              autoComplete="new-password"
              error={errors.password?.message}
              helperText={t("acceptInvitation.passwordHelper", passwordLength)}
              hidePasswordLabel={t("common.hidePassword")}
              placeholder={t("acceptInvitation.passwordPlaceholder")}
              showPasswordLabel={t("common.showPassword")}
              title={t("acceptInvitation.passwordLabel")}
              type="password"
              required
              {...register("password", {
                maxLength: {
                  message: t("acceptInvitation.passwordTooLong", passwordLength),
                  value: passwordLength.max,
                },
                minLength: {
                  message: t("acceptInvitation.passwordTooShort", passwordLength),
                  value: passwordLength.min,
                },
                required: t("acceptInvitation.passwordRequired"),
              })}
            />

            <Input
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              hidePasswordLabel={t("common.hidePassword")}
              placeholder={t("acceptInvitation.confirmPasswordPlaceholder")}
              showPasswordLabel={t("common.showPassword")}
              title={t("acceptInvitation.confirmPasswordLabel")}
              type="password"
              required
              {...register("confirmPassword", {
                required: t("acceptInvitation.confirmPasswordRequired"),
                validate: (value) => value === getValues("password") || t("acceptInvitation.passwordMismatch"),
              })}
            />

            {/* The Terms of Use and the Privacy Notice must be accepted, in the version in force. Their
                links come from validate, null until the final texts are published: each shows only once
                it exists, outside the checkbox's label (a click on it reads, never ticks), in a new tab
                so the form keeps what was typed. */}
            <Controller
              control={control}
              name="termsAccepted"
              render={(controller) => (
                <Checkbox
                  checked={controller.field.value}
                  error={controller.fieldState.error?.message}
                  label={t("acceptInvitation.termsLabel", { version: invitation?.termsVersion ?? "" })}
                  name={controller.field.name}
                  onBlur={controller.field.onBlur}
                  onChange={(event) => controller.field.onChange(event.target.checked)}
                  ref={controller.field.ref}
                  required
                />
              )}
              rules={{ validate: (value) => value || t("acceptInvitation.termsRequired") }}
            />
            {(invitation?.termsUrl || invitation?.privacyUrl) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: spacing[16] }}>
                {invitation.termsUrl && (
                  <Text
                    as="a"
                    color="brand"
                    fontSize="sm"
                    href={invitation.termsUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {t("acceptInvitation.readTerms")}
                  </Text>
                )}
                {invitation.privacyUrl && (
                  <Text
                    as="a"
                    color="brand"
                    fontSize="sm"
                    href={invitation.privacyUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {t("acceptInvitation.readPrivacy")}
                  </Text>
                )}
              </div>
            )}
          </div>

          {hasFailed && (
            <Text as="p" color="danger" fontSize="sm" role="alert">
              {t("acceptInvitation.failed")}
            </Text>
          )}

          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexWrap: "wrap",
              gap: spacing[16],
              justifyContent: "space-between",
            }}
          >
            <Button disabled={isSubmitting} type="submit">
              {t("acceptInvitation.submit")}
            </Button>

            <Button as={Link} size="small" to={paths.login} variant="link">
              {t("acceptInvitation.haveAccount")}
            </Button>
          </div>
        </form>
      </>
    )
  }

  if (status === "checking") return <AcceptInvitationWrapper />

  return (
    <AcceptInvitationWrapper>
      <Grid.Container>
        <Grid.Row justify="center">
          <Grid.Col xs={12} sm={10} md={8} lg={6}>
            <Card
              borderRadius="high"
              color="surface"
              elevated
              style={{ display: "flex", flexDirection: "column", gap: spacing[24], padding: spacing[40] }}
            >
              {renderContent()}
            </Card>
          </Grid.Col>
        </Grid.Row>
      </Grid.Container>
    </AcceptInvitationWrapper>
  )
}
