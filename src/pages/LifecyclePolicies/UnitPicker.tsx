import { useTranslation } from "react-i18next"

import type { SelectOption } from "@/ds-components/molecules"
import { Select } from "@/ds-components/molecules"
import { spacing } from "@/foundation"

import type { AcademicUnits } from "../shared/academic/useAcademicUnits"

export type UnitPickerProps = {
  onChange: (unitId: number | null) => void
  unitId: number | null
  units: AcademicUnits
}

// The unit a policies tab shows, one at a time (an inactive one is named so).
export const UnitPicker = (props: UnitPickerProps) => {
  const { onChange, unitId, units } = props

  const { t } = useTranslation()

  const options: SelectOption[] = units.units.map((unit) => ({
    label: unit.active ? unit.name : t("documentRequirements.policies.inactiveUnit", { name: unit.name }),
    value: String(unit.id),
  }))

  if (options.length === 0) return null

  return (
    <div style={{ maxWidth: spacing[256] }}>
      <Select
        noOptionsMessage={t("common.noOptions")}
        onChange={(option) => onChange(option ? Number(option.value) : null)}
        options={options}
        placeholder={t("documentRequirements.policies.unitPlaceholder")}
        size="small"
        title={t("documentRequirements.policies.unit")}
        value={options.find((option) => option.value === String(unitId)) ?? null}
      />
    </div>
  )
}
