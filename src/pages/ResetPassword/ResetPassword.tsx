import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { toast } from "@/components"
import { Button, Card, Grid, Text } from "@/ds-components/atoms"
import { Input, StateMessage } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import { paths } from "@/routes/paths"
import { confirmPasswordRecovery, getErrorStatus, validatePasswordRecoveryToken } from "@/services"

import { ResetPasswordWrapper } from "./ResetPassword.styles"

// The backend's password policy: 12 to 128 characters, nothing else required.
const passwordLength = { max: 128, min: 12 }

type ResetPasswordValues = {
  confirmPassword: string
  newPassword: string
}

// checking: the token is being validated (the global Loading overlay covers the page meanwhile).
// invalid: no token in the link, or it expired or was already used. unavailable: the backend
// couldn't be reached to tell. valid: the form is shown.
type TokenStatus = "checking" | "invalid" | "unavailable" | "valid"

// Opened from the reset e-mail (/reset-password?token=...&tenant=...). The token is checked first, so
// a dead link says so right away instead of after the user has typed a new password. Both calls go to
// the tenant named in the link, which is the school the token was issued for.
export const ResetPassword = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { formState, getValues, handleSubmit, register } = useForm<ResetPasswordValues>({
    defaultValues: { confirmPassword: "", newPassword: "" },
  })

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("checking")
  const [reloadToken, setReloadToken] = useState(0)
  const [hasFailed, setHasFailed] = useState(false)

  const { errors, isSubmitting } = formState
  const token = searchParams.get("token")?.trim() ?? ""
  const tenantId = searchParams.get("tenant")?.trim() ?? ""
  const hasLinkParams = Boolean(token) && Boolean(tenantId)
  const status: TokenStatus = hasLinkParams ? tokenStatus : "invalid"

  useEffect(() => {
    if (!hasLinkParams) return

    // An answer that arrives after this effect was cleaned up (the link changed, or StrictMode's
    // double run in development) is dropped, so it can't overwrite the current one.
    let isStale = false

    const checkToken = async () => {
      try {
        const isValid = await validatePasswordRecoveryToken({ token }, { tenantId })
        if (!isStale) setTokenStatus(isValid ? "valid" : "invalid")
      } catch {
        if (!isStale) setTokenStatus("unavailable")
      }
    }

    void checkToken()

    return () => {
      isStale = true
    }
  }, [hasLinkParams, reloadToken, tenantId, token])

  const handleRetry = () => {
    setTokenStatus("checking")
    setReloadToken((current) => current + 1)
  }

  const onSubmit = async (values: ResetPasswordValues) => {
    setHasFailed(false)

    try {
      await confirmPasswordRecovery({ newPassword: values.newPassword, token }, { tenantId })
      toast.success(t("resetPassword.saved"))
      navigate(paths.login, { replace: true })
    } catch (error) {
      // The password already meets the policy here, so a 400 means the token died while the form was
      // open (expired, or used from another tab); anything else isn't the user's fault.
      if (getErrorStatus(error) === 400) setTokenStatus("invalid")
      else setHasFailed(true)
    }
  }

  const renderContent = () => {
    if (status === "invalid") {
      return (
        <StateMessage
          action={
            <Button as={Link} to={paths.forgotPassword}>
              {t("resetPassword.requestNewLink")}
            </Button>
          }
          description={t("resetPassword.invalidLinkDescription")}
          title={t("resetPassword.invalidLinkTitle")}
          variant="error"
        />
      )
    }

    if (status === "unavailable") {
      return (
        <StateMessage
          action={<Button onClick={handleRetry}>{t("resetPassword.retry")}</Button>}
          description={t("resetPassword.validationUnavailableDescription")}
          title={t("resetPassword.validationUnavailableTitle")}
          variant="error"
        />
      )
    }

    return (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing[8] }}>
          <Text as="h1" fontSize="3xl" bold>
            {t("resetPassword.title")}
          </Text>

          <Text as="p" color="secondary">
            {t("resetPassword.description")}
          </Text>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit, () => setHasFailed(false))}
          noValidate
          style={{ display: "flex", flexDirection: "column", gap: spacing[24] }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
            <Input
              autoComplete="new-password"
              error={errors.newPassword?.message}
              helperText={t("resetPassword.passwordHelper", passwordLength)}
              placeholder={t("resetPassword.passwordPlaceholder")}
              title={t("resetPassword.passwordLabel")}
              type="password"
              required
              {...register("newPassword", {
                maxLength: { message: t("resetPassword.passwordTooLong", passwordLength), value: passwordLength.max },
                minLength: { message: t("resetPassword.passwordTooShort", passwordLength), value: passwordLength.min },
                required: t("resetPassword.passwordRequired"),
              })}
            />

            <Input
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              placeholder={t("resetPassword.confirmPasswordPlaceholder")}
              title={t("resetPassword.confirmPasswordLabel")}
              type="password"
              required
              {...register("confirmPassword", {
                required: t("resetPassword.confirmPasswordRequired"),
                validate: (value) => value === getValues("newPassword") || t("resetPassword.passwordMismatch"),
              })}
            />
          </div>

          {hasFailed && (
            <Text as="p" color="danger" fontSize="sm" role="alert">
              {t("resetPassword.unavailable")}
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
              {t("resetPassword.submit")}
            </Button>

            <Button as={Link} size="small" to={paths.login} variant="link">
              {t("resetPassword.backToLogin")}
            </Button>
          </div>
        </form>
      </>
    )
  }

  if (status === "checking") return <ResetPasswordWrapper />

  return (
    <ResetPasswordWrapper>
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
    </ResetPasswordWrapper>
  )
}
