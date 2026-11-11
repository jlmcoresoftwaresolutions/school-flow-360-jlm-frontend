import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import type { SchoolUnit, SchoolUnitInactivation, SchoolUnitInput } from "@/models"
import { getErrorCode } from "@/services/httpClient"
import { createSchoolUnit, inactivateSchoolUnit, listSchoolUnits, updateSchoolUnit } from "@/services/organization"

type UseUnitActionsOptions = {
  // Called when an action found the unit changed by someone else, after the list was read again: the
  // dialog that asked is showing stale data and must close.
  onConflict: () => void
  // Applies a change to the page's list of units.
  onUnitsChange: (change: (units: SchoolUnit[]) => SchoolUnit[]) => void
}

// Registering, editing and inactivating a unit against the backend, each resolving to whether it
// worked (the dialog that asked closes only then). A failure is told by the backend's error code: a
// name another unit already has says so and keeps the form open; a unit changed by someone else since
// it was read (VERSION_CONFLICT) has the list read again and the dialog closed, for the user to redo
// the change on the current data; anything else is the generic "couldn't save".
export const useUnitActions = (options: UseUnitActionsOptions) => {
  const { onConflict, onUnitsChange } = options

  const { t } = useTranslation()

  const replaceUnit = (unit: SchoolUnit) =>
    onUnitsChange((units) => units.map((item) => (item.id === unit.id ? unit : item)))

  const run = async <T>(action: () => Promise<T>, apply: (result: T) => void, successMessage: string) => {
    try {
      apply(await action())
      toast.success(successMessage)
      return true
    } catch (error) {
      const code = getErrorCode(error)

      if (code !== "VERSION_CONFLICT") {
        toast.error(code === "UNIT_NAME_DUPLICATE" ? t("myUnit.units.nameTaken") : t("myUnit.saveError"))
        return false
      }
    }

    try {
      const units = await listSchoolUnits()

      onUnitsChange(() => units)
      onConflict()
      toast.error(t("myUnit.units.conflict"))
    } catch {
      toast.error(t("myUnit.saveError"))
    }

    return false
  }

  const createUnit = (input: SchoolUnitInput) =>
    run(
      () => createSchoolUnit(input),
      (unit) => onUnitsChange((units) => [...units, unit]),
      t("myUnit.units.created"),
    )

  const updateUnit = (unit: SchoolUnit, input: SchoolUnitInput) =>
    run(() => updateSchoolUnit(unit, input), replaceUnit, t("myUnit.units.updated"))

  const inactivateUnit = (unit: SchoolUnit, inactivation: SchoolUnitInactivation) =>
    run(() => inactivateSchoolUnit(unit.id, inactivation), replaceUnit, t("myUnit.units.inactivated"))

  return { createUnit, inactivateUnit, updateUnit }
}
