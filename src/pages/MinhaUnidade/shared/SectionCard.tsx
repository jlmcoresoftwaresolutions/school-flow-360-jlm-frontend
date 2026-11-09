import type { ReactNode } from "react"

import { Text } from "@/ds-components/atoms"

import { SectionHeader, SectionHeading, SubCard } from "../MinhaUnidade.styles"

export type SectionCardProps = {
  children: ReactNode
  title: string
  action?: ReactNode
  description?: string
}

// A sub-card inside a tab's main card (TabCard): bordered, without a shadow of its own, with its title
// (an h2), an optional description below it and an optional action on the right.
export const SectionCard = (props: SectionCardProps) => {
  const { action, children, description, title } = props

  return (
    <SubCard>
      <SectionHeader>
        <SectionHeading>
          <Text as="h2" fontSize="md" bold>
            {title}
          </Text>
          {description && (
            <Text color="secondary" fontSize="sm">
              {description}
            </Text>
          )}
        </SectionHeading>
        {action}
      </SectionHeader>

      {children}
    </SubCard>
  )
}
