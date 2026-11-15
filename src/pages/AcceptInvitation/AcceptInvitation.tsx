import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { toast } from "@/components"
import { Button, Card, Grid, Text } from "@/ds-components/atoms"
import { Input, StateMessage } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import type { InvitationValidation } from "@/models"
import { paths } from "@/routes/paths"
import { acceptInvitation, getErrorCode, getErrorStatus, validateInvitation } from "@/services"

import { AcceptInvitationWrapper } from "./AcceptInvitation.styles"

// The backend's password policy: 12 to 128 characters, nothing else required.
const passwordLength = { max: 128, min: 12 }

type AcceptInvitationValues = {
  confirmPassword: string
  password: string
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

// Opened from the invitation e-mail (/accept-invitation?token=...&tenant=...): the person creates
// their own password and the account is born (nobody else ever knows it); they then sign in normally.
// The link is checked first, so a dead one says so before anything is typed. Roles and units come
// from the invitation and can't be changed here. Both calls go to the tenant named in the link, the
// school that sent it. Signed-in or not, the link works (no redirect in the router).
export const AcceptInvitation = () => {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { formState, getValues, handleSubmit, register, setError } = useForm<AcceptInvitationValues>({
    defaultValues: { confirmPassword: "", password: "" },
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
  }, [hasLinkParams, reloadToken, tenantId, token])

  const handleRetry = () => {
    setLinkStatus("checking")
    setReloadToken((current) => current + 1)
  }

  const onSubmit = async (values: AcceptInvitationValues) => {
    setHasFailed(false)

    try {
      await acceptInvitation({ password: values.password, token }, { tenantId })
      toast.success(t("acceptInvitation.activated"))
      navigate(paths.login, { replace: true })
    } catch (error) {
      switch (getErrorCode(error)) {
        case "WEAK_PASSWORD":
          setError("password", { message: t("acceptInvitation.passwordTooShort", passwordLength) })
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
            {t("acceptInvitation.description", { email: invitation?.email ?? "" })}
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

        <form
          onSubmit={handleSubmit(onSubmit, () => setHasFailed(false))}
          noValidate
          style={{ display: "flex", flexDirection: "column", gap: spacing[24] }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
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
