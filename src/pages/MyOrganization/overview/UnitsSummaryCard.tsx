import { useTranslation } from "react-i18next"

import { Badge, Button, Icon, Text } from "@/ds-components/atoms"
import { StateMessage } from "@/ds-components/molecules"
import type { SchoolUnit } from "@/models"
import { formatCityState } from "@/utils/address"

import { unitsSummaryLimit } from "../MyOrganization.constants"
import {
  CountBlock,
  CountValue,
  UnitsSummaryCounts,
  UnitsSummaryItem,
  UnitsSummaryList,
} from "../MyOrganization.styles"
import { useCanManageMyOrganization } from "../shared/myOrganizationAccess"
import { SectionCard } from "../shared/SectionCard"
import { useStatusLabels } from "../shared/useStatusLabels"

export type UnitsSummaryCardProps = {
  units: SchoolUnit[]
  onCreateUnit: () => void
  onSeeAllUnits: () => void
}

// A summary of the units the user may access - only real ones, counted from the list itself (no
// illustrative numbers): how many are active and inactive, and the first few, active ones first. With
// none, it says so and points to registering the first one (AC-F1-04).
export const UnitsSummaryCard = (props: UnitsSummaryCardProps) => {
  const { onCreateUnit, onSeeAllUnits, units } = props

  const { t } = useTranslation()
  const { statusTone, unitStatusLabel } = useStatusLabels()
  const canManage = useCanManageMyOrganization()

  const activeCount = units.filter((unit) => unit.status === "ACTIVE").length
  const inactiveCount = units.length - activeCount
  const listedUnits = [...units]
    .sort((a, b) => Number(b.status === "ACTIVE") - Number(a.status === "ACTIVE"))
    .slice(0, unitsSummaryLimit)

  if (units.length === 0) {
    return (
      <SectionCard title={t("myOrganization.overview.unitsTitle")}>
        <StateMessage
          action={
            canManage ? (
              <Button onClick={onCreateUnit} size="small">
                {t("myOrganization.units.createFirst")}
              </Button>
            ) : undefined
          }
          description={
            canManage ? t("myOrganization.units.emptyDescription") : t("myOrganization.units.emptyAssignedDescription")
          }
          icon="location-outline"
          title={canManage ? t("myOrganization.units.emptyTitle") : t("myOrganization.units.emptyAssignedTitle")}
        />
      </SectionCard>
    )
  }

  return (
    <SectionCard
      action={
        <Button
          endIcon={<Icon color="inherit" name="chevron-right" size={16} />}
          onClick={onSeeAllUnits}
          size="small"
          variant="link"
        >
          {t("myOrganization.overview.seeAllUnits")}
        </Button>
      }
      title={t("myOrganization.overview.unitsTitle")}
    >
      <UnitsSummaryCounts>
        <CountBlock>
          <CountValue>{units.length}</CountValue>
          <Text color="secondary" fontSize="xs">
            {t("myOrganization.overview.unitsTotal")}
          </Text>
        </CountBlock>
        <CountBlock>
          <CountValue>{activeCount}</CountValue>
          <Text color="secondary" fontSize="xs">
            {t("myOrganization.overview.unitsActive")}
          </Text>
        </CountBlock>
        <CountBlock>
          <CountValue>{inactiveCount}</CountValue>
          <Text color="secondary" fontSize="xs">
            {t("myOrganization.overview.unitsInactive")}
          </Text>
        </CountBlock>
      </UnitsSummaryCounts>

      <UnitsSummaryList aria-label={t("myOrganization.overview.unitsTitle")}>
        {listedUnits.map((unit) => (
          <UnitsSummaryItem key={unit.id}>
            <div>
              <Text fontSize="sm" semibold>
                {unit.name}
              </Text>
              <Text color="secondary" fontSize="xs">
                {formatCityState(unit.address) || t("common.notInformed")}
              </Text>
            </div>
            <Badge tone={statusTone(unit.status)}>{unitStatusLabel(unit.status)}</Badge>
          </UnitsSummaryItem>
        ))}
      </UnitsSummaryList>
    </SectionCard>
  )
}
