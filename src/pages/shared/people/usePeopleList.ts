import { useCallback, useEffect, useState } from "react"

import type { ApiItemsPage } from "@/models"
import type { RequestConfig } from "@/services/httpClient"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"

// Why a list couldn't be read: a refusal (403), too many searches in a minute (429, the people search
// limit, which the lists share), or anything else.
export type PeopleListError = "failed" | "forbidden" | "rateLimited"

// What a people list shows: the page asked for (by its request key, so a page of an earlier search or
// filter is never shown under a new one), or why it couldn't be read. `current` is null while the
// page for the present key is on its way, and while there is nothing to read (no params).
export type PeopleListState<T> = {
  current: { data: ApiItemsPage<T> } | { error: PeopleListError } | null
  reload: () => void
}

type ListResult<T> = { data: ApiItemsPage<T>; key: string } | { error: PeopleListError; key: string }

const toListError = (error: unknown): PeopleListError => {
  if (getErrorStatus(error) === 403) return "forbidden"
  if (getErrorStatus(error) === 429 || getErrorCode(error) === "SEARCH_RATE_LIMITED") return "rateLimited"

  return "failed"
}

// Reads a page of a people list (students, guardians, the people search) for the given query, without
// the global overlay (the table shows its own loading). A newer query drops the answer of an older one.
// Null params read nothing: the people search only reads once a term is searched.
export const usePeopleList = <T, P>(
  load: (params: P, config?: RequestConfig) => Promise<ApiItemsPage<T>>,
  params: P | null,
): PeopleListState<T> => {
  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState<ListResult<T> | null>(null)

  const requestKey = `${JSON.stringify(params)}#${reloadToken}`

  useEffect(() => {
    if (params === null) return

    let isStale = false

    const read = async () => {
      try {
        const data = await load(params, { showLoading: false })
        if (!isStale) setResult({ data, key: requestKey })
      } catch (error) {
        if (!isStale) setResult({ error: toListError(error), key: requestKey })
      }
    }

    void read()

    return () => {
      isStale = true
    }
  }, [load, params, requestKey])

  const reload = useCallback(() => setReloadToken((current) => current + 1), [])

  const current = result?.key === requestKey ? result : null

  return { current, reload }
}
