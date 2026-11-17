import { useEffect, useState } from "react"

import { listSchoolUnits } from "@/services/organization"

export type DirectoryUnit = {
  active: boolean
  id: number
  name: string
}

export type UnitDirectory = {
  // The units that can be granted now (active ones), by name.
  activeUnits: DirectoryUnit[]
  // The units list couldn't be read.
  failed: boolean
  isLoading: boolean
  // Every unit known, active or not, by name: for filters and for naming a unit in a list.
  units: DirectoryUnit[]
  reload: () => void
}

type LoadResult = {
  token: number
  units?: DirectoryUnit[]
}

const byName = (first: DirectoryUnit, second: DirectoryUnit) => first.name.localeCompare(second.name)

// The units the signed-in user manages, for the users and invitations screens, read from the backend:
// an Admin gets every unit of the institution, a Secretaria only the units assigned to it (JLM-2/128),
// each with its status, so an inactive unit is never offered for granting.
export const useUnitDirectory = (): UnitDirectory => {
  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const units = await listSchoolUnits({ showLoading: false })
        if (isStale) return

        setResult({
          token: reloadToken,
          units: units.map((unit) => ({ active: unit.status === "ACTIVE", id: unit.id, name: unit.name })).sort(byName),
        })
      } catch {
        if (!isStale) setResult({ token: reloadToken })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [reloadToken])

  const current = result?.token === reloadToken ? result : null
  const units = current?.units ?? []

  return {
    activeUnits: units.filter((unit) => unit.active),
    failed: current !== null && current.units === undefined,
    isLoading: current === null,
    reload: () => setReloadToken((value) => value + 1),
    units,
  }
}
