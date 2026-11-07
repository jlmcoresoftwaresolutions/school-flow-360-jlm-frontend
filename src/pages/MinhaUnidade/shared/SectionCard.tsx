import type { ReactNode } from "react"

import { Card, Text } from "@/ds-components/atoms"
import { spacing } from "@/foundation"

import { SectionHeader, SectionHeading } from "../MinhaUnidade.styles"

export type SectionCardProps = {
  children: ReactNode
  title: string
  action?: ReactNode
  description?: string
}

// A white card with its title (an h2), an optional description below it and an optional action on
// the right - the building block of every Minha Unidade tab.
export const SectionCard = (props: SectionCardProps) => {
  const { action, children, description, title } = props

  return (
    <Card elevated style={{ padding: spacing[32] }}>
      <SectionHeader>
        <SectionHeading>
          <Text as="h2" fontSize="lg" bold>
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
    </Card>
  )
}
