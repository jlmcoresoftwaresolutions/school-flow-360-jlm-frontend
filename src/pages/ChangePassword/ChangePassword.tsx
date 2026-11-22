import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { toast } from "@/components"
import { Button, Card, Grid, Text } from "@/ds-components/atoms"
import { spacing } from "@/foundation"
import { homePath, paths } from "@/routes/paths"
import { getMe } from "@/services/me"
import { getSafeRedirectPath, loginRedirectParam } from "@/utils/authRedirect"
import { getSessionContext, updateSessionContext } from "@/utils/session"

import { PasswordChangeFields } from "../shared/password/PasswordChangeFields"
import { usePasswordChange } from "../shared/password/usePasswordChange"
import { ChangePasswordWrapper } from "./ChangePassword.styles"

// Who signed in, now without the forced change: read again from /api/me, or the stored reading with
// the flag cleared when the backend can't be reached (the change is already saved).
const refreshContext = async () => {
  try {
    await updateSessionContext(await getMe({ showLoading: false }))
  } catch {
    const stored = await getSessionContext()
    if (stored) await updateSessionContext({ ...stored, mustChangePassword: false })
  }
}

// Where someone who signed in with a temporary password (given by the Admin or the Secretaria) creates
// their own before anything else: until then the backend answers nothing but the own context, this
// change and the logout, and the routes send every page here (?redirect= keeps the one asked for, an
// in-app path only). The temporary password is the current one. Signing out is the only other way out.
export const ChangePassword = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const redirectPath = getSafeRedirectPath(searchParams.get(loginRedirectParam)) ?? homePath

  const { failure, form, submit } = usePasswordChange(async () => {
    await refreshContext()
    toast.success(t("passwordChange.saved"))
    navigate(redirectPath, { replace: true })
  })

  const { isSubmitting } = form.formState

  return (
    <ChangePasswordWrapper>
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
                  {t("passwordChange.forcedTitle")}
                </Text>

                <Text as="p" color="secondary">
                  {t("passwordChange.forcedDescription")}
                </Text>
              </div>

              <form
                onSubmit={(event) => void submit(event)}
                noValidate
                style={{ display: "flex", flexDirection: "column", gap: spacing[24] }}
              >
                <PasswordChangeFields currentLabel={t("passwordChange.temporaryLabel")} form={form} />

                {failure && (
                  <Text as="p" color="danger" fontSize="sm" role="alert">
                    {failure}
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
                    {t("passwordChange.submit")}
                  </Button>

                  <Button as={Link} size="small" to={paths.signOut} variant="link">
                    {t("passwordChange.signOut")}
                  </Button>
                </div>
              </form>
            </Card>
          </Grid.Col>
        </Grid.Row>
      </Grid.Container>
    </ChangePasswordWrapper>
  )
}
