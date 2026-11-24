import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"
import { Button, Card, Grid, Icon, type IconProps, Image, Tag, type TagProps, Text } from "@/ds-components/atoms"
import { Input } from "@/ds-components/molecules"
import { colors, spacing } from "@/foundation"
import { useCountdown } from "@/hooks"
import type { AuthData, LoginRequest, SessionLimitChallenge } from "@/models"
import { homePath, paths } from "@/routes/paths"
import { getErrorCode, getErrorData, getErrorStatus, getRetryAfterSeconds, login } from "@/services"
import { getSafeRedirectPath, loginRedirectParam, sessionExpiredParam } from "@/utils/authRedirect"
import { formatCountdown } from "@/utils/formats"
import { saveSession } from "@/utils/session"

import { SchoolIdentity } from "../shared/school/SchoolIdentity"
import { usePublicBranding } from "../shared/school/usePublicBranding"
import { LoginWrapper } from "./Login.styles"
import { SessionLimitDialog } from "./SessionLimitDialog"

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

// A nickname as the backend makes them: 3 to 60 letters, digits, ".", "_" or "-" (case doesn't matter
// to sign in).
const nicknamePattern = /^[a-z0-9._-]{3,60}$/i

// What signs in: an e-mail (with an "@") or a nickname (without one).
const isValidLogin = (value: string) => {
  const login = value.trim()

  return login.includes("@") ? emailPattern.test(login) : nicknamePattern.test(login)
}

const signInErrorId = "login-sign-in-error"

type SignInError = "invalidCredentials" | "sessionLimitExpired" | "signInUnavailable"

// Sign-in held back by the backend after repeated wrong passwords (its 429): for which e-mail or
// nickname, and the wait announced when it started, in whole minutes.
type SignInLock = {
  login: string
  minutes: number
}

// The wait when the 429 doesn't say how long (no readable Retry-After): the backend's shortest lock.
const defaultLockSeconds = 60

const normalizeLogin = (login: string) => login.trim().toLowerCase()

// The challenge of the login's 409 SESSION_LIMIT_REACHED, if the error carries a usable one.
const toSessionLimitChallenge = (error: unknown): SessionLimitChallenge | null => {
  if (getErrorCode(error) !== "SESSION_LIMIT_REACHED") return null

  const data = getErrorData(error) as Partial<SessionLimitChallenge> | undefined
  if (!data?.challengeToken || !Array.isArray(data.sessions)) return null

  return {
    challengeExpiresInSeconds: data.challengeExpiresInSeconds ?? 0,
    challengeToken: data.challengeToken,
    sessions: data.sessions,
  }
}

// The entry page of the app, signing in with the e-mail or the nickname (a student without an e-mail
// has only the nickname) and the password. There is no sign-up here on purpose: accounts are created
// for users, never by them. Someone who signs in with a temporary password is sent by the routes to
// create their own first. On success the session is stored (see utils/session) and the user goes back to the
// page they were sent from (?redirect=, only an in-app path) or home; the router keeps a signed-in
// user from coming back here (see routes.tsx). Arriving with ?expired=1 says the session ended.
// Repeated wrong passwords make the backend hold the e-mail or nickname back for a while (its 429: 1 minute on the
// 3rd, 3 minutes on every 5th), shown as a countdown on the button. With 5 sessions already open, the
// person picks one to end and signs in in the same step (SessionLimitDialog). The sign-in card opens
// with the school's published logo and name (SchoolIdentity), when it has them.
export const Login = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { control, formState, handleSubmit, register } = useForm<LoginRequest>({
    defaultValues: { login: "", password: "" },
  })
  const typedLogin = useWatch({ control, name: "login" })
  const branding = usePublicBranding()
  const lockCountdown = useCountdown()

  const [signInError, setSignInError] = useState<SignInError | null>(null)
  const [signInLock, setSignInLock] = useState<SignInLock | null>(null)
  const [sessionLimit, setSessionLimit] = useState<SessionLimitChallenge | null>(null)

  const { errors, isSubmitting } = formState
  const credentialsRejected = signInError === "invalidCredentials"
  const sessionExpired = searchParams.get(sessionExpiredParam) === "1"
  const redirectPath = getSafeRedirectPath(searchParams.get(loginRedirectParam)) ?? homePath
  // Only the locked e-mail or nickname is held back: typing another one frees the button.
  const isLocked = lockCountdown.isRunning && signInLock?.login === normalizeLogin(typedLogin)

  const clearSignInError = () => setSignInError(null)

  const startLock = (login: string, seconds: number) => {
    setSignInLock({ login: normalizeLogin(login), minutes: Math.ceil(seconds / 60) })
    lockCountdown.start(seconds)
  }

  const finishSignIn = async (authData: AuthData) => {
    await saveSession(authData)
    navigate(redirectPath, { replace: true })
  }

  const handleSessionLimitExpired = () => {
    setSessionLimit(null)
    setSignInError("sessionLimitExpired")
  }

  // A new attempt always clears the previous one's error, whether it reaches the backend or stops at
  // the field validation (handleSubmit's second callback).
  const onSubmit = async (credentials: LoginRequest) => {
    setSignInError(null)

    try {
      await finishSignIn(await login({ ...credentials, login: credentials.login.trim() }))
    } catch (error) {
      const status = getErrorStatus(error)

      // 401 is the backend's answer to a wrong e-mail, nickname or password, 429 to too many of them, a 409 with a
      // challenge to a 6th session. Anything else (no response, a 5xx) isn't the user's fault, so they
      // are told to try again.
      if (status === 401) {
        setSignInError("invalidCredentials")
        return
      }

      if (status === 429) {
        startLock(credentials.login, getRetryAfterSeconds(error) ?? defaultLockSeconds)
        return
      }

      const challenge = toSessionLimitChallenge(error)
      if (challenge) setSessionLimit(challenge)
      else setSignInError("signInUnavailable")
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
              <SchoolIdentity branding={branding} />

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
                    autoCapitalize="none"
                    autoComplete="username"
                    error={errors.login?.message}
                    placeholder={t("login.loginPlaceholder")}
                    spellCheck={false}
                    title={t("login.loginLabel")}
                    type="text"
                    invalid={credentialsRejected}
                    required
                    {...register("login", {
                      onChange: clearSignInError,
                      required: t("login.loginRequired"),
                      validate: (value) => isValidLogin(value) || t("login.loginInvalid"),
                    })}
                  />

                  <Input
                    aria-describedby={credentialsRejected ? signInErrorId : undefined}
                    autoComplete="current-password"
                    error={errors.password?.message}
                    hidePasswordLabel={t("common.hidePassword")}
                    placeholder={t("login.passwordPlaceholder")}
                    showPasswordLabel={t("common.showPassword")}
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

      {sessionLimit && (
        <SessionLimitDialog
          challenge={sessionLimit}
          onCancel={() => setSessionLimit(null)}
          onChallengeExpired={handleSessionLimitExpired}
          onSignedIn={(authData) => void finishSignIn(authData)}
        />
      )}
    </LoginWrapper>
  )
}
