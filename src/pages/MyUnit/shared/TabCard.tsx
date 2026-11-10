import type { ReactNode } from "react"

import { Card, Text } from "@/ds-components/atoms"
import { spacing } from "@/foundation"

import { SectionHeader, SectionHeading, TabPanel } from "../MyUnit.styles"

export type TabCardProps = {
  children: ReactNode
  action?: ReactNode
  description?: string
  title?: string
}

// The one main card of a Minha Unidade tab, joined to the selected tab above it. Its sections sit
// inside as sub-cards (SectionCard); a tab whose content is a single block (the units list) puts it
// straight in here, with the card's own title, description and action.
export const TabCard = (props: TabCardProps) => {
  const { action, children, description, title } = props

  return (
    <Card elevated style={{ padding: spacing[32] }}>
      {title && (
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
      )}

      <TabPanel>{children}</TabPanel>
    </Card>
  )
}
