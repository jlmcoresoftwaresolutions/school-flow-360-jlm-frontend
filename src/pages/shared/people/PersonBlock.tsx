import type { ReactNode } from "react"

import { Text } from "@/ds-components/atoms"

import { PersonSection } from "./people.styles"

export type PersonBlockProps = {
  children: ReactNode
  title: string
}

// A titled block of a person's profile (identity, contact...), a region named by its title.
export const PersonBlock = (props: PersonBlockProps) => {
  const { children, title } = props

  return (
    <PersonSection aria-label={title}>
      <Text as="h2" fontSize="md" semibold>
        {title}
      </Text>
      {children}
    </PersonSection>
  )
}
