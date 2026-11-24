import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/ds-components/atoms"
import { getSchoolAddress } from "@/utils/tenant"

export type SchoolLinkProps = {
  children: ReactNode
  // The school the e-mail's link carries.
  tenantId: string
  to: string
  size?: "large" | "medium" | "small"
  variant?: "filled" | "link" | "outlined"
}

// A link of a page opened from an e-mail (invitation, password reset) to another page of the same
// school: inside the app when the address opened is the school's (or, in development, localhost), and
// to the school's own address otherwise - the e-mail may have been opened on the Render address, which
// serves no school, or on another school's.
export const SchoolLink = (props: SchoolLinkProps) => {
  const { children, size, tenantId, to, variant } = props

  const address = getSchoolAddress(tenantId, to)

  if (address) {
    return (
      <Button as="a" href={address} size={size} variant={variant}>
        {children}
      </Button>
    )
  }

  return (
    <Button as={Link} size={size} to={to} variant={variant}>
      {children}
    </Button>
  )
}
