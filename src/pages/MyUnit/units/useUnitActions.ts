import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import type { SchoolUnit, SchoolUnitInactivation, SchoolUnitInput } from "@/models"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { createSchoolUnit, inactivateSchoolUnit, listSchoolUnits, updateSchoolUnit } from "@/services/organization"

import type { SaveResult } from "../shared/saveResult"

type UseUnitActionsOptions = {
  // Called when an action found the unit changed by someone else, with the list as it is now (already
  // applied to the page): the dialog that asked keeps what the user typed and shows the current unit.
  onConflict: (units: SchoolUnit[]) => void
  // Applies a change to the page's list of units.
  onUnitsChange: (change: (units: SchoolUnit[]) => SchoolUnit[]) => void
}

const sameName = (first: string, second: string) =>
  first.trim().toLocaleLowerCase() === second.trim().toLocaleLowerCase()

// Registering, editing and inactivating a unit against the backend, each resolving to a SaveResult
// (the dialog that asked closes only on "saved"). A failure is told by the backend's error code: a
// name another unit already has says so and keeps the form open; a unit changed by someone else since
// it was read (VERSION_CONFLICT) has the list read again and resolves to "conflict", the dialog then
// keeping the user's changes beside the current unit; anything else is the generic "couldn't save".
//
// A registration that got no answer (a timeout, the connection dropped) may have been saved anyway, and
// sending it again would then be refused as a repeated name. So the list is read again: a unit with
// that name means it was saved (a name already taken would have been refused anyway); none means it
// wasn't, or the list couldn't be read, and the user is told to check the list before trying again.
export const useUnitActions = (options: UseUnitActionsOptions) => {
  const { onConflict, onUnitsChange } = options

  const { t } = useTranslation()

  const replaceUnit = (unit: SchoolUnit) =>
    onUnitsChange((units) => units.map((item) => (item.id === unit.id ? unit : item)))

  const handleFailure = async (error: unknown): Promise<SaveResult> => {
    const code = getErrorCode(error)

    if (code !== "VERSION_CONFLICT") {
      toast.error(code === "UNIT_NAME_DUPLICATE" ? t("myUnit.units.nameTaken") : t("myUnit.saveError"))
      return "failed"
    }

    try {
      const units = await listSchoolUnits()

      onUnitsChange(() => units)
      onConflict(units)
      return "conflict"
    } catch {
      toast.error(t("myUnit.saveError"))
      return "failed"
    }
  }

  const run = async <T>(
    action: () => Promise<T>,
    apply: (result: T) => void,
    successMessage: string,
  ): Promise<SaveResult> => {
    try {
      apply(await action())
      toast.success(successMessage)
      return "saved"
    } catch (error) {
      return handleFailure(error)
    }
  }

  const confirmCreated = async (input: SchoolUnitInput): Promise<SaveResult> => {
    try {
      const units = await listSchoolUnits()

      onUnitsChange(() => units)

      if (units.some((unit) => sameName(unit.name, input.name))) {
        toast.success(t("myUnit.units.created"))
        return "saved"
      }
    } catch {
      // The list couldn't be read either: whether the unit was saved stays unknown.
    }

    toast.error(t("myUnit.units.createUnconfirmed"))
    return "failed"
  }

  const createUnit = async (input: SchoolUnitInput): Promise<SaveResult> => {
    try {
      const unit = await createSchoolUnit(input)

      onUnitsChange((units) => [...units, unit])
      toast.success(t("myUnit.units.created"))
      return "saved"
    } catch (error) {
      if (getErrorStatus(error) !== undefined) return handleFailure(error)
    }

    return confirmCreated(input)
  }

  const updateUnit = (unit: SchoolUnit, input: SchoolUnitInput) =>
    run(() => updateSchoolUnit(unit, input), replaceUnit, t("myUnit.units.updated"))

  const inactivateUnit = (unit: SchoolUnit, inactivation: SchoolUnitInactivation) =>
    run(() => inactivateSchoolUnit(unit.id, inactivation), replaceUnit, t("myUnit.units.inactivated"))

  return { createUnit, inactivateUnit, updateUnit }
}
