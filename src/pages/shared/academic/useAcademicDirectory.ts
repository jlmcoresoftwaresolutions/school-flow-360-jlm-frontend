import { useCallback, useEffect, useState } from "react"

import type { ApiItemsPage } from "@/models"
import type { RequestConfig } from "@/services/httpClient"

// The backend's largest page for the academic lists.
const directorySize = 200

// Every item of a short academic list (the stages, the grades of the institution), read once for the
// selects and to name an item by its id, without the global overlay; `reload` reads it again after a
// change. A failed read leaves it empty, so nothing is offered rather than something stale.
export const useAcademicDirectory = <T>(
  load: (params: { size: number }, config?: RequestConfig) => Promise<ApiItemsPage<T>>,
) => {
  const [reloadToken, setReloadToken] = useState(0)
  const [items, setItems] = useState<T[]>([])

  useEffect(() => {
    let isStale = false

    const read = async () => {
      try {
        const page = await load({ size: directorySize }, { showLoading: false })
        if (!isStale) setItems(page.items)
      } catch {
        if (!isStale) setItems([])
      }
    }

    void read()

    return () => {
      isStale = true
    }
  }, [load, reloadToken])

  const reload = useCallback(() => setReloadToken((value) => value + 1), [])

  return { items, reload }
}
