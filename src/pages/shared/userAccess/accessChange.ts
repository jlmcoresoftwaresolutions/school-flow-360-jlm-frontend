import type { RoleCode } from "@/models"

import type { GrantedAccess } from "./useAccessLabels"

const keyOf = (access: GrantedAccess) => `${access.role}:${access.unitId ?? "institution"}`

// What a change of access does, role by role and unit by unit: what stays, what is added, what is
// removed, and how the person's reach changes - the units they start or stop reaching, the roles they
// start or stop holding, whether Admin is granted or taken and whether nothing is left.
export type AccessChange = {
  added: GrantedAccess[]
  gainedRoles: RoleCode[]
  gainedUnitIds: number[]
  grantsAdmin: boolean
  kept: GrantedAccess[]
  losesAdmin: boolean
  losesEverything: boolean
  lostRoles: RoleCode[]
  lostUnitIds: number[]
  removed: GrantedAccess[]
}

const unitIdsOf = (access: GrantedAccess[]) =>
  new Set(access.map((item) => item.unitId).filter((unitId): unitId is number => unitId !== null))

const rolesOf = (access: GrantedAccess[]) => new Set(access.map((item) => item.role))

export const describeAccessChange = (before: GrantedAccess[], after: GrantedAccess[]): AccessChange => {
  const beforeKeys = new Set(before.map(keyOf))
  const afterKeys = new Set(after.map(keyOf))
  const beforeUnits = unitIdsOf(before)
  const afterUnits = unitIdsOf(after)
  const beforeRoles = rolesOf(before)
  const afterRoles = rolesOf(after)

  return {
    added: after.filter((item) => !beforeKeys.has(keyOf(item))),
    gainedRoles: [...afterRoles].filter((role) => !beforeRoles.has(role)),
    gainedUnitIds: [...afterUnits].filter((unitId) => !beforeUnits.has(unitId)),
    grantsAdmin: afterRoles.has("ADMIN") && !beforeRoles.has("ADMIN"),
    kept: before.filter((item) => afterKeys.has(keyOf(item))),
    losesAdmin: beforeRoles.has("ADMIN") && !afterRoles.has("ADMIN"),
    losesEverything: before.length > 0 && after.length === 0,
    lostRoles: [...beforeRoles].filter((role) => !afterRoles.has(role)),
    lostUnitIds: [...beforeUnits].filter((unitId) => !afterUnits.has(unitId)),
    removed: before.filter((item) => !afterKeys.has(keyOf(item))),
  }
}
