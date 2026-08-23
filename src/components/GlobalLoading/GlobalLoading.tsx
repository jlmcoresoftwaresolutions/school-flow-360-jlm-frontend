import { useSyncExternalStore } from "react"

import { getIsLoading, subscribeToLoading } from "@/utils/loadingStore"

import { Loading } from "../Loading"

// Mounted once at the app root (see main.tsx) - reacts to httpClient's request/response
// interceptors instead of any component having to show/hide Loading by hand.
export const GlobalLoading = () => {
  const isLoading = useSyncExternalStore(subscribeToLoading, getIsLoading)

  return isLoading ? <Loading /> : null
}
