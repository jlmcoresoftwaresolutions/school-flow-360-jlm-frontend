import type { CSSProperties, ReactNode } from "react"

import type { IconName } from "@/ds-components/atoms"
import { Icon, useTooltip } from "@/ds-components/atoms"
import { getInitials } from "@/utils/strings"

import {
  StyledTopbar,
  StyledTopbarAction,
  StyledTopbarAvatarImage,
  StyledTopbarAvatarInitials,
  StyledTopbarEnd,
  StyledTopbarStart,
  StyledTopbarUser,
  StyledTopbarUserName,
  StyledTopbarUserRole,
  StyledTopbarUserText,
} from "./Topbar.styles"

export type TopbarAction = {
  icon: IconName
  key: string
  label: string
  disabled?: boolean
  onClick?: () => void
}

export type TopbarUser = {
  name: string
  avatarSrc?: string
  role?: string
}

export type TopbarProps = {
  actions?: TopbarAction[]
  children?: ReactNode
  className?: string
  style?: CSSProperties
  user?: TopbarUser
}

type TopbarActionButtonProps = {
  action: TopbarAction
}

const TopbarActionButton = (props: TopbarActionButtonProps) => {
  const { action } = props

  const { tooltipElement, tooltipHandlers } = useTooltip(action.label)

  return (
    <>
      <StyledTopbarAction
        aria-label={action.label}
        disabled={action.disabled}
        onClick={action.onClick}
        type="button"
        {...tooltipHandlers}
      >
        <Icon color="secondary" name={action.icon} size={20} />
      </StyledTopbarAction>
      {tooltipElement}
    </>
  )
}

// The bar across the top of the app shell. `children` fills its leading side (typically a
// Breadcrumb); on the trailing side come icon-only `actions` (e.g. notifications, help) and the
// signed-in `user`, shown as an avatar - the photo, or the name's initials without one - beside
// the name and role. On a narrow screen the name and role are hidden visually but stay available to
// screen readers. It owns no copy: every label comes in through props.
export const Topbar = (props: TopbarProps) => {
  const { actions = [], children, className, style, user } = props

  const hasTrailingContent = actions.length > 0 || user !== undefined

  return (
    <StyledTopbar className={className} style={style}>
      <StyledTopbarStart>{children}</StyledTopbarStart>

      {hasTrailingContent && (
        <StyledTopbarEnd>
          {actions.map((action) => (
            <TopbarActionButton action={action} key={action.key} />
          ))}

          {user && (
            <StyledTopbarUser>
              {user.avatarSrc ? (
                <StyledTopbarAvatarImage alt="" src={user.avatarSrc} />
              ) : (
                <StyledTopbarAvatarInitials aria-hidden="true">{getInitials(user.name)}</StyledTopbarAvatarInitials>
              )}

              <StyledTopbarUserText>
                <StyledTopbarUserName>{user.name}</StyledTopbarUserName>
                {user.role && <StyledTopbarUserRole>{user.role}</StyledTopbarUserRole>}
              </StyledTopbarUserText>
            </StyledTopbarUser>
          )}
        </StyledTopbarEnd>
      )}
    </StyledTopbar>
  )
}
