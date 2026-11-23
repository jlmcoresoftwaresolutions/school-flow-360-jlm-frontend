import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useRevalidator } from "react-router-dom"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Card, Icon, Text } from "@/ds-components/atoms"
import { DescriptionList, Input, PageHeader, StateMessage } from "@/ds-components/molecules"
import { PhoneInput } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import type { UserContext } from "@/models"
import { paths } from "@/routes/paths"
import { getErrorCode } from "@/services/httpClient"
import { getMe, updateMyProfile } from "@/services/me"
import { roleOrder } from "@/utils/access"
import { defaultCountry } from "@/utils/countries"
import { formatPhoneForDisplay, isValidPhone, toInternationalPhone } from "@/utils/phone"
import { updateSessionContext } from "@/utils/session"

import { usePhoneInputTexts } from "../shared/phone/usePhoneInputTexts"
import { newAccessLimits } from "../shared/userAccess/newAccess"
import { sortAccess, useAccessLabels } from "../shared/userAccess/useAccessLabels"
import { AccessItem, AccessItems, ActionRow, DetailsSection, FormFields } from "../shared/userAccess/userAccess.styles"
import { ChangePasswordModal } from "./ChangePasswordModal"

type ProfileValues = {
  fullName: string
  phone: string
}

type LoadState = { kind: "failed" } | { kind: "loaded"; me: UserContext } | { kind: "loading" }

const toValues = (me: UserContext): ProfileValues => ({
  fullName: me.fullName ?? "",
  phone: me.phone ? toInternationalPhone(me.phone, defaultCountry) : "",
})

// The signed-in user's own profile (matrix ACC-M09 "Meu Acesso / Meu Perfil", for every role), opened
// from the user menu in the topbar. The name and phone are read first and edited in place (PUT
// /api/me/profile, with the version from /api/me); saving updates the name shown in the topbar too.
// Below, the person's own access - each role in each unit and what the roles allow, informative only:
// nobody changes their own roles or units. A link leads to the open sessions. Last, the own password,
// changed in a dialog (the current one, then the new one).
export const MyProfile = () => {
  const { t } = useTranslation()
  const phoneTexts = usePhoneInputTexts()
  const revalidator = useRevalidator()
  const { accessLabel, roleLabel } = useAccessLabels()
  const form = useForm<ProfileValues>({ defaultValues: { fullName: "", phone: "" } })

  const [state, setState] = useState<LoadState>({ kind: "loading" })
  const [reloadToken, setReloadToken] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [failure, setFailure] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const { errors, isDirty, isSubmitting } = form.formState
  const me = state.kind === "loaded" ? state.me : null

  useUnsavedChanges(isEditing && isDirty)

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const read = await getMe()
        if (!isStale) setState({ kind: "loaded", me: read })
      } catch {
        if (!isStale) setState({ kind: "failed" })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [reloadToken])

  const startEditing = () => {
    if (!me) return
    form.reset(toValues(me))
    setFailure("")
    setIsEditing(true)
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!me) return
    setFailure("")
    const phone = values.phone.trim()
    let savedPhone = ""
    if (values.phone === toValues(me).phone) savedPhone = me.phone ?? ""
    else if (phone) savedPhone = toInternationalPhone(phone, defaultCountry)

    try {
      const saved = await updateMyProfile({
        fullName: values.fullName.trim(),
        phone: savedPhone,
        version: me.version ?? 0,
      })
      const updated: UserContext = { ...me, fullName: saved.fullName, phone: saved.phone, version: saved.version }
      setState({ kind: "loaded", me: updated })
      form.reset(values)
      setIsEditing(false)
      toast.success(t("myProfile.saved"))
      // The topbar shows the signed-in user's name: keep the session's copy and read it again.
      await updateSessionContext(updated)
      void revalidator.revalidate()
    } catch (error) {
      if (getErrorCode(error) === "VERSION_CONFLICT") {
        try {
          const fresh = await getMe()
          setState({ kind: "loaded", me: fresh })
        } catch {
          // Reading it again failed too: the message still says what happened.
        }
        setFailure(t("myProfile.conflict"))
        return
      }
      setFailure(t("users.errors.failed"))
    }
  })

  const renderData = (current: UserContext) => {
    if (!isEditing) {
      return (
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            { key: "name", label: t("users.details.name"), value: current.fullName ?? "" },
            { key: "email", label: t("users.details.email"), value: current.email ?? "" },
            { key: "nickname", label: t("users.details.nickname"), value: current.nickname ?? "" },
            {
              key: "phone",
              label: t("users.details.phone"),
              value: current.phone ? formatPhoneForDisplay(current.phone, defaultCountry) : "",
            },
          ]}
        />
      )
    }

    return (
      <form aria-label={t("myProfile.dataTitle")} onSubmit={handleSubmit} noValidate>
        <FormFields>
          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}
          <Input
            error={errors.fullName?.message}
            maxLength={newAccessLimits.fullName}
            placeholder={t("myProfile.namePlaceholder")}
            title={t("userAccess.form.nameLabel")}
            required
            {...form.register("fullName", {
              validate: (value) => value.trim() !== "" || t("userAccess.form.nameRequired"),
            })}
          />
          <Controller
            control={form.control}
            name="phone"
            render={(controller) => (
              <PhoneInput
                {...phoneTexts}
                error={controller.fieldState.error?.message}
                helperText={t("users.profile.phoneHelper")}
                name={controller.field.name}
                onBlur={controller.field.onBlur}
                onChange={controller.field.onChange}
                placeholder={t("myProfile.phonePlaceholder")}
                title={t("userAccess.form.phoneLabel")}
                value={controller.field.value}
              />
            )}
            rules={{
              validate: (value) =>
                value.trim() === "" ||
                value === toValues(current).phone ||
                isValidPhone(value, defaultCountry) ||
                t("userAccess.form.phoneInvalid"),
            }}
          />
          <ActionRow>
            <Button disabled={isSubmitting} onClick={() => setIsEditing(false)} size="small" variant="outlined">
              {t("common.cancel")}
            </Button>
            <Button disabled={!isDirty || isSubmitting} size="small" type="submit">
              {t("common.save")}
            </Button>
          </ActionRow>
        </FormFields>
      </form>
    )
  }

  const renderProfile = (current: UserContext) => {
    const access = sortAccess(current.assignments.filter((assignment) => assignment.status === "ACTIVE"))
    const roles = roleOrder.filter((role) => access.some((assignment) => assignment.role === role))

    return (
      <>
        <Card elevated style={{ display: "flex", flexDirection: "column", gap: spacing[16], padding: spacing[32] }}>
          <ActionRow style={{ alignItems: "center", justifyContent: "space-between" }}>
            <Text as="h2" fontSize="lg" bold>
              {t("myProfile.dataTitle")}
            </Text>
            {!isEditing && (
              <Button
                onClick={startEditing}
                size="small"
                startIcon={<Icon color="inherit" name="pen-outline" size={16} />}
                variant="outlined"
              >
                {t("common.edit")}
              </Button>
            )}
          </ActionRow>
          <Text color="secondary" fontSize="sm">
            {t("myProfile.dataDescription")}
          </Text>
          {renderData(current)}
        </Card>

        <Card
          elevated
          style={{
            display: "flex",
            flexDirection: "column",
            gap: spacing[16],
            marginTop: spacing[24],
            padding: spacing[32],
          }}
        >
          <Text as="h2" fontSize="lg" bold>
            {t("myProfile.accessTitle")}
          </Text>
          <Text color="secondary" fontSize="sm">
            {t("myProfile.accessDescription")}
          </Text>
          <DetailsSection aria-label={t("users.details.access")}>
            {access.length === 0 && (
              <Text color="secondary" fontSize="sm">
                {t("myProfile.noAccess")}
              </Text>
            )}
            <AccessItems>
              {access.map((assignment) => (
                <AccessItem key={assignment.assignmentId}>
                  <Text fontSize="sm" semibold>
                    {accessLabel(assignment)}
                  </Text>
                </AccessItem>
              ))}
            </AccessItems>
          </DetailsSection>
          {roles.length > 0 && (
            <DetailsSection aria-label={t("users.details.capabilities")}>
              <Text as="h3" fontSize="md" semibold>
                {t("users.details.capabilities")}
              </Text>
              <AccessItems>
                {roles.map((role) => (
                  <AccessItem key={role}>
                    <Text fontSize="sm" semibold>
                      {roleLabel(role)}
                    </Text>
                    <Text color="secondary" fontSize="sm">
                      {t(`userAccess.roleDescriptions.${role}`)}
                    </Text>
                  </AccessItem>
                ))}
              </AccessItems>
            </DetailsSection>
          )}
          <div>
            <Button as={Link} size="small" to={paths.activeSessions} variant="link">
              {t("myProfile.seeSessions")}
            </Button>
          </div>
        </Card>

        <Card
          elevated
          style={{
            display: "flex",
            flexDirection: "column",
            gap: spacing[16],
            marginTop: spacing[24],
            padding: spacing[32],
          }}
        >
          <ActionRow style={{ alignItems: "center", justifyContent: "space-between" }}>
            <Text as="h2" fontSize="lg" bold>
              {t("myProfile.passwordTitle")}
            </Text>
            <Button
              onClick={() => setIsChangingPassword(true)}
              size="small"
              startIcon={<Icon color="inherit" name="lock-outline" size={16} />}
              variant="outlined"
            >
              {t("passwordChange.title")}
            </Button>
          </ActionRow>
          <Text color="secondary" fontSize="sm">
            {t("myProfile.passwordDescription")}
          </Text>
        </Card>

        {isChangingPassword && <ChangePasswordModal onClose={() => setIsChangingPassword(false)} />}
      </>
    )
  }

  const renderContent = () => {
    if (state.kind === "loading") return null
    if (state.kind === "failed") {
      return (
        <Card elevated style={{ padding: spacing[32] }}>
          <StateMessage
            action={
              <Button
                onClick={() => {
                  setState({ kind: "loading" })
                  setReloadToken((value) => value + 1)
                }}
              >
                {t("common.tryAgain")}
              </Button>
            }
            description={t("myProfile.errorDescription")}
            title={t("myProfile.errorTitle")}
            variant="error"
          />
        </Card>
      )
    }

    return renderProfile(state.me)
  }

  return (
    <>
      <PageHeader description={t("myProfile.description")} icon="user-outline" title={t("myProfile.title")} />
      {renderContent()}
    </>
  )
}
