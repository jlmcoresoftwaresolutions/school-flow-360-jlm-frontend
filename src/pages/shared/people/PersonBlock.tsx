import type { ReactNode } from "react"

import { Text } from "@/ds-components/atoms"

import { PersonBlockHeader, PersonSection } from "./people.styles"

export type PersonBlockProps = {
  children: ReactNode
  title: string
  // Buttons on the right of the title, for what the block lets the operator do (link a guardian...).
  action?: ReactNode
}

// A titled block of a person's profile (identity, contact...), a region named by its title.
export const PersonBlock = (props: PersonBlockProps) => {
  const { action, children, title } = props

  return (
    <PersonSection aria-label={title}>
      <PersonBlockHeader>
        <Text as="h2" fontSize="md" semibold>
          {title}
        </Text>
        {action}
      </PersonBlockHeader>
      {children}
    </PersonSection>
  )
}
