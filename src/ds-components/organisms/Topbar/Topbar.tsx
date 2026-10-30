import type { CSSProperties, ReactNode } from "react"

import type { IconName } from "@/ds-components/atoms"
import { Icon, useTooltip } from "@/ds-components/atoms"
import type { ActionMenuItem } from "@/ds-components/molecules"
import { UserIdentity } from "@/ds-components/molecules"

import {
  StyledTopbar,
  StyledTopbarAction,
  StyledTopbarEnd,
  StyledTopbarStart,
  StyledTopbarUser,
  StyledTopbarUserChevron,
  StyledTopbarUserMenu,
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
  userMenuItems?: ActionMenuItem[]
  userMenuLabel?: string
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
// signed-in `user` (a UserIdentity: the avatar - photo, or the name's initials without one - beside
// the name and role). On a narrow screen the name and role are hidden visually but stay available to
// screen readers. With `userMenuItems`, the user block becomes a button (with a chevron) that opens
// a menu of those items (e.g. signing out), named by `userMenuLabel`. It owns no copy: every label
// comes in through props, and userMenuLabel defaults to pt-BR.
export const Topbar = (props: TopbarProps) => {
  const {
    actions = [],
    children,
    className,
    style,
    user,
    userMenuItems = [],
    userMenuLabel = "Menu do usuário",
  } = props

  const hasTrailingContent = actions.length > 0 || user !== undefined
  const hasUserMenu = userMenuItems.length > 0

  const userElement = user && (
    <StyledTopbarUser>
      <UserIdentity avatarSrc={user.avatarSrc} name={user.name} role={user.role} hideTextOnNarrowScreens />

      {hasUserMenu && (
        <StyledTopbarUserChevron>
          <Icon color="secondary" name="chevron-down" size={20} />
        </StyledTopbarUserChevron>
      )}
    </StyledTopbarUser>
  )

  return (
    <StyledTopbar className={className} style={style}>
      <StyledTopbarStart>{children}</StyledTopbarStart>

      {hasTrailingContent && (
        <StyledTopbarEnd>
          {actions.map((action) => (
            <TopbarActionButton action={action} key={action.key} />
          ))}

          {userElement && hasUserMenu ? (
            <StyledTopbarUserMenu items={userMenuItems} trigger={userElement} triggerLabel={userMenuLabel} />
          ) : (
            userElement
          )}
        </StyledTopbarEnd>
      )}
    </StyledTopbar>
  )
}
