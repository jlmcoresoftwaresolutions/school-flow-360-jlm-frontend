import { useSyncExternalStore } from "react"
import { useTranslation } from "react-i18next"

import { getIsLoading, subscribeToLoading } from "@/utils/loadingStore"

import { Loading } from "../Loading"

export type GlobalLoadingProps = {
  visible?: boolean
}

// Mounted once at the app root (see main.tsx) - reacts to httpClient's request/response
// interceptors instead of any component having to show/hide Loading by hand. `visible` shows it
// regardless of requests, for a wait that isn't an API call (the router's fallback while a page's
// chunk downloads, see routes.tsx). Being mounted outside every page, it translates Loading's
// accessible name itself.
export const GlobalLoading = (props: GlobalLoadingProps) => {
  const { visible = false } = props

  const { t } = useTranslation()

  const isLoading = useSyncExternalStore(subscribeToLoading, getIsLoading)

  return visible || isLoading ? <Loading label={t("common.loading")} /> : null
}
