import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { toast } from "@/components"
import { Button, Card, Grid, Text } from "@/ds-components/atoms"
import { Input } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import { useCountdown } from "@/hooks"
import type { PasswordRecoveryRequest } from "@/models"
import { paths } from "@/routes/paths"
import { requestPasswordRecovery } from "@/services"

import { ForgotPasswordWrapper } from "./ForgotPassword.styles"

// Same loose check as the login: catches typos before a request is spent; the backend decides the rest.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// How long the button stays locked after a send, so a second click doesn't fire another e-mail.
const resendCooldownSeconds = 60

// Asks for the e-mail of the account to recover. Whatever the address, the outcome reads the same -
// the backend never says whether it has an account, and neither does this page. Sending is locked
// while a request is on its way and for a minute after it succeeds.
export const ForgotPassword = () => {
  const { t } = useTranslation()
  const { formState, handleSubmit, register } = useForm<PasswordRecoveryRequest>({ defaultValues: { email: "" } })
  const resendCooldown = useCountdown()

  const [hasFailed, setHasFailed] = useState(false)

  const { errors, isSubmitting } = formState
  const isLocked = isSubmitting || resendCooldown.isRunning

  const onSubmit = async (request: PasswordRecoveryRequest) => {
    setHasFailed(false)

    try {
      await requestPasswordRecovery(request)
      toast.success(t("forgotPassword.sent"))
      resendCooldown.start(resendCooldownSeconds)
    } catch {
      setHasFailed(true)
    }
  }

  return (
    <ForgotPasswordWrapper>
      <Grid.Container>
        <Grid.Row justify="center">
          <Grid.Col xs={12} sm={10} md={8} lg={6}>
            <Card
              borderRadius="high"
              color="surface"
              elevated
              style={{ display: "flex", flexDirection: "column", gap: spacing[24], padding: spacing[40] }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: spacing[8] }}>
                <Text as="h1" fontSize="3xl" bold>
                  {t("forgotPassword.title")}
                </Text>

                <Text as="p" color="secondary">
                  {t("forgotPassword.description")}
                </Text>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit, () => setHasFailed(false))}
                noValidate
                style={{ display: "flex", flexDirection: "column", gap: spacing[24] }}
              >
                <Input
                  autoComplete="email"
                  error={errors.email?.message}
                  placeholder={t("login.emailPlaceholder")}
                  title={t("login.emailLabel")}
                  type="email"
                  required
                  {...register("email", {
                    pattern: { message: t("login.emailInvalid"), value: emailPattern },
                    required: t("login.emailRequired"),
                  })}
                />

                {hasFailed && (
                  <Text as="p" color="danger" fontSize="sm" role="alert">
                    {t("forgotPassword.unavailable")}
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
                  <Button disabled={isLocked} type="submit">
                    {resendCooldown.isRunning
                      ? t("forgotPassword.resendIn", { seconds: resendCooldown.secondsLeft })
                      : t("forgotPassword.submit")}
                  </Button>

                  <Button as={Link} size="small" to={paths.login} variant="link">
                    {t("forgotPassword.backToLogin")}
                  </Button>
                </div>
              </form>
            </Card>
          </Grid.Col>
        </Grid.Row>
      </Grid.Container>
    </ForgotPasswordWrapper>
  )
}
