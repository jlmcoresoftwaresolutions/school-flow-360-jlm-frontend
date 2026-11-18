import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Badge, Button, Text } from "@/ds-components/atoms"
import { DescriptionList, StateMessage } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import { useSignedInUser } from "@/hooks"
import type { RoleCode, UserView } from "@/models"
import { getErrorStatus } from "@/services/httpClient"
import { getUser } from "@/services/users"
import { roleOrder } from "@/utils/access"
import { defaultCountry } from "@/utils/countries"
import { formatPhoneForDisplay } from "@/utils/phone"

import { sortAccess, useAccessLabels } from "../shared/userAccess/useAccessLabels"
import {
  AccessItem,
  AccessItems,
  ActionRow,
  DetailsSection,
  DetailsSections,
} from "../shared/userAccess/userAccess.styles"
import type { DirectoryUnit } from "../shared/userAccess/useUnitDirectory"

// What the operator can do from the details, each in its own dialog.
export type UserDetailsAction = "assignments" | "inactivate" | "profile" | "reactivate" | "revoke"

export type UserDetailsModalProps = {
  // The units the signed-in user knows, to mark an inactive one.
  units: DirectoryUnit[]
  userId: number
  onAction: (action: UserDetailsAction, user: UserView) => void
  onClose: () => void
  // The user is out of reach now (removed from the operator's scope): the list is read again.
  onUnavailable: () => void
}

type LoadState = { kind: "failed" } | { kind: "loaded"; user: UserView } | { kind: "loading" }

// One user, read again when opened (the list doesn't carry what the operator may do): who they are,
// whether the account is active, each role in each unit (and since when), what those roles allow and
// the access revoked before. The capabilities are informative: what a role allows follows the
// institution's policy, never a per-person setting. The actions the backend allows the operator on
// this user (eligibleActions: change roles and units, revoke, inactivate or reactivate) open from
// here, as does editing the name and phone (EDIT_PROFILE). Nobody changes their own access (matrix
// ACC-M09): on the own account only the name and phone can be edited. The backend still offers the
// Admin the access actions on its own account (protected by the last-Admin rule only), pending Lucas's
// decision; the screen keeps them hidden for everyone.
export const UserDetailsModal = (props: UserDetailsModalProps) => {
  const { onAction, onClose, onUnavailable, units, userId } = props

  const { t } = useTranslation()
  const signedIn = useSignedInUser()
  const { accessLabel, formatDate, roleLabel, userStatusLabel, userStatusTone } = useAccessLabels(units)

  const [state, setState] = useState<LoadState>({ kind: "loading" })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const user = await getUser(userId)
        if (!isStale) setState({ kind: "loaded", user })
      } catch (error) {
        if (isStale) return

        // Out of scope and missing are the same 404: either way, it's no longer there for this operator.
        if (getErrorStatus(error) === 404) {
          toast.error(t("users.details.unavailable"))
          onUnavailable()
          onClose()
          return
        }

        setState({ kind: "failed" })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [onClose, onUnavailable, reloadToken, t, userId])

  // Nothing to show until the user arrives: the global loading overlay covers the wait.
  if (state.kind === "loading") return null

  const renderActions = (user: UserView) => {
    const isSelf = signedIn?.userId === user.id
    const can = (action: UserView["eligibleActions"][number]) => !isSelf && user.eligibleActions.includes(action)
    const canEditProfile = user.eligibleActions.includes("EDIT_PROFILE")

    if (!canEditProfile) return null

    return (
      <DetailsSection aria-label={t("users.manage.title")}>
        <ActionRow>
          <Button onClick={() => onAction("profile", user)} size="small" variant="outlined">
            {t("users.manage.editProfile")}
          </Button>
          {can("EDIT_ASSIGNMENTS") && (
            <Button onClick={() => onAction("assignments", user)} size="small" variant="outlined">
              {t("users.manage.changeAccess")}
            </Button>
          )}
          {can("REVOKE") && user.assignments.some((assignment) => assignment.status === "ACTIVE") && (
            <Button color="danger" onClick={() => onAction("revoke", user)} size="small" variant="outlined">
              {t("users.manage.revoke")}
            </Button>
          )}
          {can("INACTIVATE") && (
            <Button color="danger" onClick={() => onAction("inactivate", user)} size="small" variant="outlined">
              {t("users.status.inactivate")}
            </Button>
          )}
          {can("REACTIVATE") && (
            <Button onClick={() => onAction("reactivate", user)} size="small" variant="outlined">
              {t("users.status.reactivate")}
            </Button>
          )}
        </ActionRow>
        {isSelf && (
          <Text color="secondary" fontSize="sm">
            {t("users.manage.selfNotice")}
          </Text>
        )}
      </DetailsSection>
    )
  }

  const renderUser = (user: UserView) => {
    const active = sortAccess(user.assignments.filter((assignment) => assignment.status === "ACTIVE"))
    const revoked = sortAccess(user.assignments.filter((assignment) => assignment.status === "REVOKED"))
    const roles = roleOrder.filter((role) => active.some((assignment) => assignment.role === role))

    return (
      <DetailsSections>
        {renderActions(user)}

        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            { key: "name", label: t("users.details.name"), value: user.fullName || t("userAccess.noName") },
            { key: "email", label: t("users.details.email"), value: user.email },
            {
              key: "phone",
              label: t("users.details.phone"),
              value: user.phone ? formatPhoneForDisplay(user.phone, defaultCountry) : "",
            },
            {
              key: "status",
              label: t("users.details.status"),
              value: <Badge tone={userStatusTone(user.status)}>{userStatusLabel(user.status)}</Badge>,
            },
          ]}
        />

        <DetailsSection aria-labelledby="user-details-access">
          <Text as="h3" fontSize="md" id="user-details-access" semibold>
            {t("users.details.access")}
          </Text>
          {active.length === 0 ? (
            <Text color="warning" fontSize="sm">
              {t("users.details.noAccess")}
            </Text>
          ) : (
            <AccessItems>
              {active.map((assignment) => (
                <AccessItem key={assignment.assignmentId}>
                  <Text fontSize="sm" semibold>
                    {accessLabel(assignment)}
                  </Text>
                  <Text color="secondary" fontSize="sm">
                    {t("users.details.since", { date: formatDate(assignment.createdAt) })}
                  </Text>
                </AccessItem>
              ))}
            </AccessItems>
          )}
        </DetailsSection>

        {roles.length > 0 && (
          <DetailsSection aria-labelledby="user-details-capabilities">
            <Text as="h3" fontSize="md" id="user-details-capabilities" semibold>
              {t("users.details.capabilities")}
            </Text>
            <Text color="secondary" fontSize="sm">
              {t("users.details.capabilitiesNote")}
            </Text>
            <AccessItems>
              {roles.map((role: RoleCode) => (
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

        {revoked.length > 0 && (
          <DetailsSection aria-labelledby="user-details-history">
            <Text as="h3" fontSize="md" id="user-details-history" semibold>
              {t("users.details.history")}
            </Text>
            <AccessItems>
              {revoked.map((assignment) => (
                <AccessItem key={assignment.assignmentId}>
                  <Text color="secondary" fontSize="sm" semibold>
                    {accessLabel(assignment)}
                  </Text>
                  <Text color="secondary" fontSize="sm">
                    {t("users.details.revokedSince", { date: formatDate(assignment.createdAt) })}
                  </Text>
                </AccessItem>
              ))}
            </AccessItems>
          </DetailsSection>
        )}
      </DetailsSections>
    )
  }

  return (
    <Modal
      closeLabel={t("common.close")}
      footer={
        <Button onClick={onClose} variant="outlined">
          {t("common.close")}
        </Button>
      }
      onClose={onClose}
      size="md"
      title={t("users.details.title")}
      open
    >
      {state.kind === "loaded" ? (
        renderUser(state.user)
      ) : (
        <StateMessage
          action={
            <Button
              onClick={() => {
                setState({ kind: "loading" })
                setReloadToken((current) => current + 1)
              }}
            >
              {t("common.tryAgain")}
            </Button>
          }
          description={t("users.details.errorDescription")}
          title={t("users.details.errorTitle")}
          variant="error"
        />
      )}
    </Modal>
  )
}
