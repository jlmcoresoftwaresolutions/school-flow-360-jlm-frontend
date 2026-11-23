import { useEffect, useState } from "react"

import type { CatalogItem } from "@/models"
import { listRelationshipTypes } from "@/services/catalogs"

// The relationships a link may have (Mãe, Pai, Avó...), from the backend's catalog: data, never a list
// written on screen. A failed read leaves the list empty, so a link can't be saved without one.
export const useRelationshipTypes = (): CatalogItem[] => {
  const [types, setTypes] = useState<CatalogItem[]>([])

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const loaded = await listRelationshipTypes({ showLoading: false })
        if (!isStale) setTypes(loaded)
      } catch {
        if (!isStale) setTypes([])
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [])

  return types
}
