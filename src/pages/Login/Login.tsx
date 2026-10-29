import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"
import { Button, Card, Grid, Icon, type IconProps, Image, Tag, type TagProps, Text } from "@/ds-components/atoms"
import { Input } from "@/ds-components/molecules"
import { colors, spacing } from "@/foundation"
import { useCountdown } from "@/hooks"
import type { LoginRequest } from "@/models"
import { homePath, paths } from "@/routes/paths"
import { getErrorStatus, login } from "@/services"
import { getSafeRedirectPath, loginRedirectParam, sessionExpiredParam } from "@/utils/authRedirect"
import { formatCountdown } from "@/utils/formats"
import { clearFailedLogins, getLoginLockRemainingMs, normalizeEmail, registerFailedLogin } from "@/utils/loginThrottle"
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

const signInErrorId = "login-sign-in-error"

type SignInError = "invalidCredentials" | "signInUnavailable"

// Sign-in held back after repeated wrong passwords (see utils/loginThrottle): for which e-mail, and
// the wait announced when it started, in whole minutes.
type SignInLock = {
  email: string
  minutes: number
}

// The entry page of the app. There is no sign-up here on purpose: accounts are created for users,
// never by them. On success the session is stored (see utils/session) and the user goes back to the
// page they were sent from (?redirect=, only an in-app path) or home; the router keeps a signed-in
// user from coming back here (see routes.tsx). Arriving with ?expired=1 says the session ended.
// Every 5th wrong password for the same e-mail locks it for a while, with a countdown on the button.
export const Login = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { control, formState, handleSubmit, register } = useForm<LoginRequest>({
    defaultValues: { email: "", password: "" },
  })
  const typedEmail = useWatch({ control, name: "email" })
  const lockCountdown = useCountdown()

  const [signInError, setSignInError] = useState<SignInError | null>(null)
  const [signInLock, setSignInLock] = useState<SignInLock | null>(null)

  const { errors, isSubmitting } = formState
  const credentialsRejected = signInError === "invalidCredentials"
  const sessionExpired = searchParams.get(sessionExpiredParam) === "1"
  const redirectPath = getSafeRedirectPath(searchParams.get(loginRedirectParam)) ?? homePath
  // Only the locked e-mail is held back: typing another one frees the button.
  const isLocked = lockCountdown.isRunning && signInLock?.email === normalizeEmail(typedEmail)

  const clearSignInError = () => setSignInError(null)

  const startLock = (email: string, lockMs: number) => {
    setSignInLock({ email: normalizeEmail(email), minutes: Math.ceil(lockMs / 60_000) })
    lockCountdown.start(Math.ceil(lockMs / 1000))
  }

  // A new attempt always clears the previous one's error, whether it reaches the backend or stops at
  // the field validation (handleSubmit's second callback).
  const onSubmit = async (credentials: LoginRequest) => {
    setSignInError(null)

    // A lock still running for this e-mail (e.g. set before a reload) stops the attempt here.
    const remainingLockMs = await getLoginLockRemainingMs(credentials.email)
    if (remainingLockMs > 0) {
      startLock(credentials.email, remainingLockMs)
      return
    }

    try {
      const authData = await login(credentials)
      await saveSession(authData)
      await clearFailedLogins(credentials.email)
      navigate(redirectPath, { replace: true })
    } catch (error) {
      // 401 is the backend's answer to a wrong e-mail/password; anything else (no response, a 5xx)
      // isn't the user's fault, so they are told to try again instead and it doesn't count.
      if (getErrorStatus(error) !== 401) {
        setSignInError("signInUnavailable")
        return
      }

      const lockMs = await registerFailedLogin(credentials.email)
      if (lockMs > 0) startLock(credentials.email, lockMs)
      else setSignInError("invalidCredentials")
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

              {sessionExpired && (
                <Text as="p" color="warning" fontSize="sm" role="status" semibold>
                  {t("login.sessionExpired")}
                </Text>
              )}

              {/* noValidate: the browser's own validation bubbles are replaced by the messages under
                  each field, which match the rest of the design system and are translated. */}
              <form
                onSubmit={handleSubmit(onSubmit, clearSignInError)}
                noValidate
                style={{ display: "flex", flexDirection: "column", gap: spacing[24] }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
                  {/* Rejected credentials don't say which field is wrong, so both are flagged and point at
                      the one message under the form. */}
                  <Input
                    aria-describedby={credentialsRejected ? signInErrorId : undefined}
                    autoComplete="username"
                    error={errors.email?.message}
                    placeholder={t("login.emailPlaceholder")}
                    title={t("login.emailLabel")}
                    type="email"
                    invalid={credentialsRejected}
                    required
                    {...register("email", {
                      onChange: clearSignInError,
                      pattern: { message: t("login.emailInvalid"), value: emailPattern },
                      required: t("login.emailRequired"),
                    })}
                  />

                  <Input
                    aria-describedby={credentialsRejected ? signInErrorId : undefined}
                    autoComplete="current-password"
                    error={errors.password?.message}
                    placeholder={t("login.passwordPlaceholder")}
                    title={t("login.passwordLabel")}
                    type="password"
                    invalid={credentialsRejected}
                    required
                    {...register("password", { onChange: clearSignInError, required: t("login.passwordRequired") })}
                  />
                </div>

                {isLocked && signInLock && (
                  <Text as="p" color="danger" fontSize="sm" id={signInErrorId} role="alert">
                    {t("login.tooManyAttempts", { count: signInLock.minutes })}
                  </Text>
                )}

                {!isLocked && signInError && (
                  <Text as="p" color="danger" fontSize="sm" id={signInErrorId} role="alert">
                    {t(`login.${signInError}`)}
                  </Text>
                )}

                <div
                  style={{ alignItems: "center", display: "flex", gap: spacing[16], justifyContent: "space-between" }}
                >
                  {/* The countdown lives on the button, not in the alert above, so screen readers don't
                      re-announce the message every second. */}
                  <Button disabled={isSubmitting || isLocked} type="submit">
                    {isLocked
                      ? t("login.retryIn", { time: formatCountdown(lockCountdown.secondsLeft) })
                      : t("login.signIn")}
                  </Button>

                  <Button as={Link} size="small" to={paths.forgotPassword} variant="link">
                    {t("login.forgotPassword")}
                  </Button>
                </div>
              </form>
            </Card>
          </Grid.Col>
        </Grid.Row>
      </Grid.Container>
    </LoginWrapper>
  )
}
