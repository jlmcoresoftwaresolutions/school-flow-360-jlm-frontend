import type { CSSProperties } from "react"

import { Avatar } from "@/ds-components/atoms"
import { getShortName } from "@/utils/strings"

import {
  StyledUserIdentity,
  StyledUserIdentityName,
  StyledUserIdentityRole,
  StyledUserIdentityText,
} from "./UserIdentity.styles"

export type UserIdentityProps = {
  name: string
  avatarSrc?: string
  className?: string
  fullName?: boolean
  hideTextOnNarrowScreens?: boolean
  role?: string
  style?: CSSProperties
}

// Who someone is at a glance: their Avatar (photo or initials) beside their name and, optionally,
// their role. The avatar is decorative here, since the name is right next to it.
// Only the first and last names are shown by default, so a long name doesn't stretch the element; the
// whole name is still the hover title. `fullName` shows it in full.
// `hideTextOnNarrowScreens` keeps only the avatar visible on small screens (the Topbar uses it to leave
// room for the breadcrumb); the name and role stay available to screen readers.
export const UserIdentity = (props: UserIdentityProps) => {
  const { avatarSrc, className, fullName = false, hideTextOnNarrowScreens = false, name, role, style } = props

  const displayName = fullName ? name.trim() : getShortName(name)
  const isShortened = displayName !== name.trim()

  return (
    <StyledUserIdentity className={className} style={style}>
      <Avatar name={name} src={avatarSrc} decorative />

      <StyledUserIdentityText $hideOnNarrowScreens={hideTextOnNarrowScreens}>
        <StyledUserIdentityName title={isShortened ? name.trim() : undefined}>{displayName}</StyledUserIdentityName>
        {role && <StyledUserIdentityRole>{role}</StyledUserIdentityRole>}
      </StyledUserIdentityText>
    </StyledUserIdentity>
  )
}
