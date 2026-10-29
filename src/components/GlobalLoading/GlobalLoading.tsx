import { useEffect, useState, useSyncExternalStore } from "react"
import { useTranslation } from "react-i18next"

import { isBackendLikelyAsleep } from "@/utils/backendActivity"
import { getIsLoading, subscribeToLoading } from "@/utils/loadingStore"

import { Loading } from "../Loading"

// After this long on the same overlay, a message explains the wait.
const slowWaitDelayMs = 5000

type SlowWaitMessage = "slowServer" | "slowWait"

export type GlobalLoadingProps = {
  visible?: boolean
}

// Mounted only while the overlay is up, so each wait starts its own countdown from zero. A long wait
// is blamed on the backend waking up only when that is likely (it hasn't answered in this tab yet, or
// not for a while - see utils/backendActivity); any other slow call gets a neutral message instead.
const GlobalLoadingOverlay = () => {
  const { t } = useTranslation()

  const [slowWaitMessage, setSlowWaitMessage] = useState<SlowWaitMessage | null>(null)

  useEffect(() => {
    const timeout = setTimeout(
      () => setSlowWaitMessage(isBackendLikelyAsleep() ? "slowServer" : "slowWait"),
      slowWaitDelayMs,
    )

    return () => clearTimeout(timeout)
  }, [])

  return <Loading label={t("common.loading")} message={slowWaitMessage ? t(`common.${slowWaitMessage}`) : undefined} />
}

// Mounted once at the app root (see main.tsx) - reacts to httpClient's request/response
// interceptors instead of any component having to show/hide Loading by hand. `visible` shows it
// regardless of requests, for a wait that isn't an API call (the router's fallback while a page's
// chunk downloads, see routes.tsx). Being mounted outside every page, it translates Loading's
// accessible name and message itself.
export const GlobalLoading = (props: GlobalLoadingProps) => {
  const { visible = false } = props

  const isLoading = useSyncExternalStore(subscribeToLoading, getIsLoading)

  return visible || isLoading ? <GlobalLoadingOverlay /> : null
}
