import { useTranslation } from "react-i18next"

import type { BadgeProps } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import type { OperationModel, OrganizationStatus, SchoolUnitStatus } from "@/models"

import { operationModelValues } from "../MinhaUnidade.constants"

type BadgeTone = NonNullable<BadgeProps["tone"]>

const statusTones: Record<OrganizationStatus | SchoolUnitStatus, BadgeTone> = {
  ATIVA: "success",
  INATIVA: "neutral",
}

// The translated labels of Minha Unidade's codes. The organization's status reads differently from a
// unit's ("Organização ativa" vs. "Ativa"), so the two are never confused (AC-F1-06).
export const useStatusLabels = () => {
  const { t } = useTranslation()

  const operationModelLabel = (value: OperationModel) => t(`minhaUnidade.operationModels.${value}`)

  const operationModelOptions: SelectOption[] = operationModelValues.map((value) => ({
    label: operationModelLabel(value),
    value,
  }))

  const organizationStatusLabel = (value: OrganizationStatus) => t(`minhaUnidade.organizationStatuses.${value}`)

  const unitStatusLabel = (value: SchoolUnitStatus) => t(`minhaUnidade.units.statuses.${value}`)

  const statusTone = (value: OrganizationStatus | SchoolUnitStatus) => statusTones[value]

  return { operationModelLabel, operationModelOptions, organizationStatusLabel, statusTone, unitStatusLabel }
}
