import { useEffect, useMemo, useState } from "react"

import { useSignedInUser } from "@/hooks"
import { listSchoolUnits } from "@/services/organization"
import { getManagedUnits } from "@/utils/access"

export type DirectoryUnit = {
  active: boolean
  id: number
  name: string
}

export type UnitDirectory = {
  // The units that can be granted now (active ones), by name.
  activeUnits: DirectoryUnit[]
  // The units list couldn't be read (an Admin's only: a Secretaria's come with the session).
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

// The units the signed-in user manages, for the users and invitations screens. An Admin manages them
// all: they are read from the backend (only an Admin may list units). A Secretaria manages the units
// where it holds the Secretaria role, which come with the session, so nothing is read (their status
// isn't known there: a unit inactivated since is refused by the backend with UNIT_INACTIVE).
export const useUnitDirectory = (): UnitDirectory => {
  const user = useSignedInUser()

  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)

  const managedUnits = useMemo(() => getManagedUnits(user), [user])

  useEffect(() => {
    if (managedUnits) return

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
  }, [managedUnits, reloadToken])

  const reload = () => setReloadToken((current) => current + 1)

  if (managedUnits) {
    const units = managedUnits.map((unit) => ({ ...unit, active: true }))

    return { activeUnits: units, failed: false, isLoading: false, reload, units }
  }

  const current = result?.token === reloadToken ? result : null
  const units = current?.units ?? []

  return {
    activeUnits: units.filter((unit) => unit.active),
    failed: current !== null && current.units === undefined,
    isLoading: current === null,
    reload,
    units,
  }
}
