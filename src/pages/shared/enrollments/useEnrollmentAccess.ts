import { useSignedInUser } from "@/hooks"
import { hasAnyRole } from "@/utils/access"

import { useAcademicUnits } from "../academic/useAcademicUnits"
import type { DirectoryUnit } from "../userAccess/useUnitDirectory"

export type EnrollmentAccess = {
  // The person starts and changes preparations somewhere (Admin, Secretaria).
  canOperate: boolean
  // The active units where the person may start a preparation: every one for the Admin, the Secretaria's
  // own otherwise.
  operableUnits: DirectoryUnit[]
  // Every unit the person knows, for the list's filter.
  units: DirectoryUnit[]
}

// Who does what with the enrollments (P05, CT09): the Admin and the Secretaria operate (the Secretaria in
// the units of its assignments), the Financeiro and the Coordenação only read. The backend checks every
// call again, and the actions of each enrollment come from its `eligibleActions`.
export const useEnrollmentAccess = (): EnrollmentAccess => {
  const signedIn = useSignedInUser()
  const { units } = useAcademicUnits()

  const isAdmin = hasAnyRole(signedIn, ["ADMIN"])
  const canOperate = hasAnyRole(signedIn, ["SECRETARIA"])
  const secretariaUnitIds = new Set(
    (signedIn?.assignments ?? [])
      .filter((assignment) => assignment.role === "SECRETARIA" && assignment.status === "ACTIVE")
      .map((assignment) => assignment.unitId),
  )
  const operableUnits = canOperate
    ? units.filter((unit) => unit.active && (isAdmin || secretariaUnitIds.has(unit.id)))
    : []

  return { canOperate, operableUnits, units }
}
