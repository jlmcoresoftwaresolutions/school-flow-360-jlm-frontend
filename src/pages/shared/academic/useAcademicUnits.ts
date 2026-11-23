import { useEffect, useState } from "react"

import { useSignedInUser } from "@/hooks"
import type { RoleCode } from "@/models"
import { listSchoolUnits } from "@/services/organization"
import { hasAnyRole } from "@/utils/access"

import type { DirectoryUnit } from "../userAccess/useUnitDirectory"

export type AcademicUnits = {
  // The person manages the academic structure somewhere (Admin, Secretaria or Coordenação).
  canManage: boolean
  // The active units where the person may create and change the academic structure.
  manageableUnits: DirectoryUnit[]
  // Every unit the person knows, by name: for the filters and to name a unit in a list.
  units: DirectoryUnit[]
  // A unit's name, when the person knows the unit.
  nameOf: (unitId: number) => string | undefined
}

const managingRoles: RoleCode[] = ["SECRETARIA", "COORDENACAO"]

const byName = (first: DirectoryUnit, second: DirectoryUnit) => first.name.localeCompare(second.name)

// The units of the academic screens. Only the Admin and the Secretaria may list the school units (the
// Admin gets them all, the Secretaria its own); everyone also knows the units of their own assignments,
// which is all a Coordenação or a Professor has. The academic structure is managed by the Admin in every
// unit, and by the Secretaria and the Coordenação in the active units of their assignments (CT09); the
// backend checks it again on every call.
export const useAcademicUnits = (): AcademicUnits => {
  const signedIn = useSignedInUser()

  const [listed, setListed] = useState<DirectoryUnit[]>([])

  const canList = hasAnyRole(signedIn, ["SECRETARIA"])
  const isAdmin = hasAnyRole(signedIn, ["ADMIN"])

  useEffect(() => {
    if (!canList) return

    let isStale = false

    const load = async () => {
      try {
        const loaded = await listSchoolUnits({ showLoading: false })
        if (!isStale) {
          setListed(loaded.map((unit) => ({ active: unit.status === "ACTIVE", id: unit.id, name: unit.name })))
        }
      } catch {
        // The assignments below still name the person's own units.
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [canList])

  const assignments = signedIn?.assignments ?? []
  const byId = new Map<number, DirectoryUnit>()
  assignments.forEach((assignment) => {
    if (assignment.unitId === null || !assignment.unitName) return
    byId.set(assignment.unitId, {
      active: assignment.unitStatus !== "INACTIVE",
      id: assignment.unitId,
      name: assignment.unitName,
    })
  })
  listed.forEach((unit) => byId.set(unit.id, unit))
  const units = [...byId.values()].sort(byName)

  const managedIds = new Set(
    assignments
      .filter(
        (assignment) =>
          assignment.unitId !== null && assignment.status === "ACTIVE" && managingRoles.includes(assignment.role),
      )
      .map((assignment) => assignment.unitId as number),
  )
  const manageableUnits = units.filter((unit) => unit.active && (isAdmin || managedIds.has(unit.id)))

  return {
    canManage: hasAnyRole(signedIn, managingRoles),
    manageableUnits,
    nameOf: (unitId) => byId.get(unitId)?.name,
    units,
  }
}
