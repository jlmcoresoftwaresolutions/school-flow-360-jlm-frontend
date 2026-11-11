import { useTranslation } from "react-i18next"

import type { BadgeProps } from "@/ds-components/atoms"
import type { OperationModel, OrganizationStatus, SchoolUnitStatus } from "@/models"

type BadgeTone = NonNullable<BadgeProps["tone"]>

const statusTones: Record<OrganizationStatus | SchoolUnitStatus, BadgeTone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
}

// The translated labels of Minha Unidade's codes. The organization's status reads differently from a
// unit's ("Organização ativa" vs. "Ativa"), so the two are never confused (AC-F1-06).
export const useStatusLabels = () => {
  const { t } = useTranslation()

  const operationModelLabel = (value: OperationModel) => t(`myUnit.operationModels.${value}`)

  const organizationStatusLabel = (value: OrganizationStatus) => t(`myUnit.organizationStatuses.${value}`)

  const unitStatusLabel = (value: SchoolUnitStatus) => t(`myUnit.units.statuses.${value}`)

  const statusTone = (value: OrganizationStatus | SchoolUnitStatus) => statusTones[value]

  return { operationModelLabel, organizationStatusLabel, statusTone, unitStatusLabel }
}
