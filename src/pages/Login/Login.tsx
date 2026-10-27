import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"
import { Button, Card, Grid, Icon, type IconProps, Image, Tag, type TagProps, Text } from "@/ds-components/atoms"
import { Input } from "@/ds-components/molecules"
import { colors, spacing } from "@/foundation"
import type { LoginRequest } from "@/models"
import { homePath } from "@/routes/paths"
import { getErrorStatus, login } from "@/services"
import { saveSession } from "@/utils/session"

import { LoginWrapper } from "./Login.styles"

const commonTagProps: Omit<TagProps, "children"> = {
  color: "muted",
  fontWeight: "bold",
  padding: "md",
  textColor: colors.neutral[0],
  translucent: "high",
  variant: "soft",
}

// Secondary text on the dark hero card. The semantic muted color is a dark gray meant for light
// surfaces (it reaches WCAG AA there, see semanticColors.ts) and would vanish on this background.
const onDarkSecondaryText = colors.neutral[300]

const commonTagStartIconProps: Omit<IconProps, "name"> = {
  color: "inverse",
  size: 16,
}

// Deliberately loose: the backend is the judge of what a real address is, this only catches typos
// such as a missing "@" or domain before a request is spent on them.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SignInError = "invalidCredentials" | "signInUnavailable"

// The entry page of the app. There is no sign-up here on purpose: accounts are created for users,
// never by them. On success the session is stored (see utils/session) and the user goes home; the
// router keeps a signed-in user from coming back here (see routes.tsx).
export const Login = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { formState, handleSubmit, register } = useForm<LoginRequest>({ defaultValues: { email: "", password: "" } })

  const [signInError, setSignInError] = useState<SignInError | null>(null)

  const { errors, isSubmitting } = formState

  // A new attempt always clears the previous one's error, whether it reaches the backend or stops at
  // the field validation (handleSubmit's second callback).
  const onSubmit = async (credentials: LoginRequest) => {
    setSignInError(null)

    try {
      const authData = await login(credentials)
      await saveSession(authData)
      navigate(homePath, { replace: true })
    } catch (error) {
      // 401 is the backend's answer to a wrong e-mail/password; anything else (no response, a 5xx)
      // isn't the user's fault, so they are told to try again instead.
      setSignInError(getErrorStatus(error) === 401 ? "invalidCredentials" : "signInUnavailable")
    }
  }

  return (
    <LoginWrapper>
      <Grid.Container>
        <Grid.Row align="center" justify="center">
          <Grid.Col xs={12} md={7}>
            <Card
              borderRadius="high"
              translucent="high"
              elevated
              style={{ display: "flex", flexDirection: "column", gap: spacing[20], padding: spacing[40] }}
            >
              <div style={{ alignItems: "center", display: "flex", gap: spacing[12] }}>
                <Image alt={t("login.logoAlt")} borderRadius="medium" size={64} src={schoolFlowIcon} />

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {/* The product name is a brand term, not translated content, like "White Label" below. */}
                  <Text as="p" color="inverse" fontSize="lg" bold>
                    SchoolFlow360º
                  </Text>

                  <Text as="p" fontSize="sm" style={{ color: onDarkSecondaryText }}>
                    {t("common.poweredBy")}
                  </Text>
                </div>
              </div>

              <Text as="p" color="inverse" fontSize="7xl" bold>
                {t("login.heroTitle")}
              </Text>

              <Text as="p" style={{ color: onDarkSecondaryText }}>
                {t("login.heroSubtitle")}
              </Text>

              <div style={{ display: "flex", flexWrap: "wrap", gap: spacing[8] }}>
                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="dashboard-outline" />}>
                  {t("login.tagDashboard")}
                </Tag>

                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="label-outline" />}>
                  {t("login.tagWhiteLabel")}
                </Tag>

                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="users-outline" />}>
                  {t("login.tagStudents")}
                </Tag>

                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="money-outline" />}>
                  {t("login.tagFinance")}
                </Tag>

                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="star-outline" />}>
                  {t("login.tagAi")}
                </Tag>
              </div>
            </Card>
          </Grid.Col>

          <Grid.Col xs={12} md={5}>
            <Card
              borderRadius="high"
              color="surface"
              elevated
              style={{ display: "flex", flexDirection: "column", gap: spacing[24], padding: spacing[40] }}
            >
              <Text as="h1" fontSize="3xl" bold>
                {t("login.signInTitle")}
              </Text>

              {/* noValidate: the browser's own validation bubbles are replaced by the messages under
                  each field, which match the rest of the design system and are translated. */}
              <form
                onSubmit={handleSubmit(onSubmit, () => setSignInError(null))}
                noValidate
                style={{ display: "flex", flexDirection: "column", gap: spacing[24] }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
                  <Input
                    autoComplete="username"
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

                  <Input
                    autoComplete="current-password"
                    error={errors.password?.message}
                    placeholder={t("login.passwordPlaceholder")}
                    title={t("login.passwordLabel")}
                    type="password"
                    required
                    {...register("password", { required: t("login.passwordRequired") })}
                  />
                </div>

                {signInError && (
                  <Text as="p" color="danger" fontSize="sm" role="alert">
                    {t(`login.${signInError}`)}
                  </Text>
                )}

                <div
                  style={{ alignItems: "center", display: "flex", gap: spacing[16], justifyContent: "space-between" }}
                >
                  <Button
                    disabled={isSubmitting}
                    startIcon={<Icon color="inverse" name="lock-outline" size={16} />}
                    type="submit"
                  >
                    {t("login.signIn")}
                  </Button>

                  {/* Password recovery comes in a later step; the link stays as its entry point. */}
                  <Button variant="link">{t("login.forgotPassword")}</Button>
                </div>
              </form>
            </Card>
          </Grid.Col>
        </Grid.Row>
      </Grid.Container>
    </LoginWrapper>
  )
}
