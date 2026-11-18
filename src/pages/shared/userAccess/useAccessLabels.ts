import { useTranslation } from "react-i18next"

import type { BadgeProps } from "@/ds-components/atoms"
import type { InvitationChannelResult, InvitationOrigin, InvitationStatus, RoleCode, UserStatus } from "@/models"
import { roleOrder } from "@/utils/access"

import type { DirectoryUnit } from "./useUnitDirectory"

type BadgeTone = NonNullable<BadgeProps["tone"]>

// A role in a unit, however the screen got it: a user's assignment carries the unit's name and status,
// an invitation's only its id (then looked up among the units the user knows).
export type GrantedAccess = {
  role: RoleCode
  unitId: number | null
  unitName?: string | null
  unitStatus?: "ACTIVE" | "INACTIVE" | null
}

const userStatusTones: Record<UserStatus, BadgeTone> = { ACTIVE: "success", INACTIVE: "neutral", LOCKED: "warning" }

const invitationStatusTones: Record<InvitationStatus, BadgeTone> = {
  ACCEPTED: "success",
  CANCELLED: "neutral",
  EXPIRED: "warning",
  PENDING: "info",
  SUPERSEDED: "neutral",
}

// Widest role first, then by unit name.
export const sortAccess = <T extends GrantedAccess>(access: T[]): T[] =>
  [...access].sort(
    (first, second) =>
      roleOrder.indexOf(first.role) - roleOrder.indexOf(second.role) ||
      (first.unitName ?? "").localeCompare(second.unitName ?? ""),
  )

// The words and tones the users and invitations screens share: roles, a role in a unit ("Secretaria ·
// Unidade Centro"; an Admin's "Toda a instituição"), the user and invitation statuses, the e-mail's
// delivery and an invitation's origin, plus dates in the user's language.
export const useAccessLabels = (units: DirectoryUnit[] = []) => {
  const { i18n, t } = useTranslation()

  const roleLabel = (role: RoleCode) => t(`shell.roles.${role}`)

  const unitLabel = (access: GrantedAccess) => {
    if (access.unitId === null) return t("userAccess.wholeInstitution")

    const known = units.find((unit) => unit.id === access.unitId)
    const name = access.unitName ?? known?.name
    if (!name) return t("userAccess.unknownUnit")

    const isInactive = access.unitStatus === "INACTIVE" || (known !== undefined && !known.active)

    return isInactive ? t("userAccess.inactiveUnit", { name }) : name
  }

  const accessLabel = (access: GrantedAccess) =>
    t("userAccess.assignment", { role: roleLabel(access.role), unit: unitLabel(access) })

  const formatDate = (value: string | null | undefined) => {
    const date = value ? new Date(value) : null
    if (!date || Number.isNaN(date.getTime())) return ""

    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(date)
  }

  return {
    accessLabel,
    channelResultLabel: (result: InvitationChannelResult) => t(`userAccess.channelResult.${result}`),
    formatDate,
    invitationStatusLabel: (status: InvitationStatus) => t(`userAccess.invitationStatus.${status}`),
    invitationStatusTone: (status: InvitationStatus) => invitationStatusTones[status],
    originLabel: (origin: InvitationOrigin) => t(`userAccess.origin.${origin}`),
    roleLabel,
    unitLabel,
    // A unit as a filter option: an inactive one says so.
    unitOptionLabel: (unit: DirectoryUnit) =>
      unit.active ? unit.name : t("userAccess.inactiveUnit", { name: unit.name }),
    userStatusLabel: (status: UserStatus) => t(`userAccess.userStatus.${status}`),
    userStatusTone: (status: UserStatus) => userStatusTones[status],
  }
}
