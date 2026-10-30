import type { CSSProperties } from "react"

import { getInitials } from "@/utils/strings"

import type { AvatarSize } from "./Avatar.styles"
import { StyledAvatarImage, StyledAvatarInitials } from "./Avatar.styles"

export type AvatarProps = {
  name: string
  className?: string
  decorative?: boolean
  size?: AvatarSize
  src?: string
  style?: CSSProperties
}

// A person's picture: the photo when there is one, otherwise the initials of their name on a tinted
// circle. On its own it is an image named by `name`; when the name is already shown beside it (see
// UserIdentity), `decorative` hides it from screen readers so the name isn't announced twice.
export const Avatar = (props: AvatarProps) => {
  const { className, decorative, name, size = "md", src, style } = props

  if (src) {
    return <StyledAvatarImage $size={size} alt={decorative ? "" : name} className={className} src={src} style={style} />
  }

  return (
    <StyledAvatarInitials
      $size={size}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={decorative ? undefined : name}
      className={className}
      role={decorative ? undefined : "img"}
      style={style}
    >
      {getInitials(name)}
    </StyledAvatarInitials>
  )
}
