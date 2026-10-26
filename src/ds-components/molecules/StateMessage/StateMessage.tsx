import type { CSSProperties, ReactNode } from "react"

import type { IconName, IconProps } from "@/ds-components/atoms"
import { Icon, Text } from "@/ds-components/atoms"

import type { StateMessageVariant } from "./StateMessage.styles"
import { stateIconBackgroundMap, StyledStateIcon, StyledStateMessage, StyledStateText } from "./StateMessage.styles"

export type StateMessageProps = {
  title: string
  action?: ReactNode
  className?: string
  description?: string
  icon?: IconName
  style?: CSSProperties
  variant?: StateMessageVariant
}

type StateMessageVariantConfig = {
  icon: IconName
  iconColor: IconProps["color"]
}

const variantMap: Record<StateMessageVariant, StateMessageVariantConfig> = {
  empty: { icon: "file-outline", iconColor: "secondary" },
  error: { icon: "warning-outline", iconColor: "danger" },
  restricted: { icon: "lock-outline", iconColor: "warning" },
}

// The full-area message shown instead of content: nothing to list yet (empty), a failed load (error),
// or no permission (restricted). It owns no copy, so the title, description and the action (usually a
// Button such as "Tentar novamente") come from the page - and are translated there.
export const StateMessage = (props: StateMessageProps) => {
  const { action, className, description, icon, style, title, variant = "empty" } = props

  const config = variantMap[variant]

  // An error replaces what the user was waiting for, so it is announced right away; empty and
  // restricted states are the settled result of a load and are simply there to be read.
  const role = variant === "error" ? "alert" : undefined

  return (
    <StyledStateMessage className={className} role={role} style={style}>
      <StyledStateIcon $background={stateIconBackgroundMap[variant]}>
        <Icon color={config.iconColor} name={icon ?? config.icon} size={32} />
      </StyledStateIcon>

      <StyledStateText>
        <Text as="p" fontSize="lg" semibold>
          {title}
        </Text>

        {description && (
          <Text as="p" align="center" color="muted" fontSize="sm">
            {description}
          </Text>
        )}
      </StyledStateText>

      {action}
    </StyledStateMessage>
  )
}
