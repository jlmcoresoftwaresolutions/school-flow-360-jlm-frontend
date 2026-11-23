import { useEffect, useState } from "react"

import type { CatalogItem } from "@/models"
import { listDocumentTypes } from "@/services/catalogs"

// The document types of the backend's catalog (CPF, RG...), for a person's document field: data, never
// a list written on screen. A failed read leaves the list empty, so the document can't be typed in
// without its type.
export const useDocumentTypes = (): CatalogItem[] => {
  const [types, setTypes] = useState<CatalogItem[]>([])

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const loaded = await listDocumentTypes({ showLoading: false })
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
