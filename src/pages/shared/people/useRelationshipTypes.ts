import { useEffect, useState } from "react"

import type { CatalogItem } from "@/models"
import { listRelationshipTypes } from "@/services/catalogs"

// The relationships a link may have (Mãe, Pai, Avó...), from the backend's catalog: data, never a list
// written on screen. A failed read leaves the list empty, so a link can't be saved without one. Only the
// Admin and the Secretaria read the catalog: a screen that also opens for other roles passes `enabled`
// false for them, and nothing is read.
export const useRelationshipTypes = (enabled = true): CatalogItem[] => {
  const [types, setTypes] = useState<CatalogItem[]>([])

  useEffect(() => {
    if (!enabled) return

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
  }, [enabled])

  return types
}
