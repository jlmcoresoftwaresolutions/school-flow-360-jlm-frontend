import type { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios"
import axios, { isAxiosError } from "axios"

import { startLoading, stopLoading } from "@/utils/loadingStore"
import { clearSession, getSessionToken } from "@/utils/session"
import { getTenantId } from "@/utils/tenant"

declare module "axios" {
  interface AxiosRequestConfig {
    showLoading?: boolean
  }
}

// The single config object every service function accepts, on top of its own arguments - kept
// as its own type (rather than exposing all of AxiosRequestConfig) so callers only ever see the
// options this app actually wants to offer, with room to grow (e.g. a future skipErrorToast).
export type RequestConfig = Pick<AxiosRequestConfig, "showLoading">

// The HTTP status of a failed call (e.g. 401 for wrong credentials), or undefined when there was no
// response at all (network down, CORS refusal, timeout) - so a page can tell the two apart without
// importing axios itself.
export const getErrorStatus = (error: unknown): number | undefined =>
  isAxiosError(error) ? error.response?.status : undefined

// Where the user lands when their session is no longer accepted. Kept as a literal here (rather
// than imported from @/routes) so this module doesn't depend on the router.
const loginPath = "/login"

// A relative URL ("/api/...") goes to the SchoolFlow360 backend through baseURL; an absolute one is
// a third-party API (e.g. ViaCEP), which must never receive the user's token.
const isBackendRequest = (url?: string) => url !== undefined && !/^[a-z][a-z\d+\-.]*:\/\//i.test(url)

// Shared axios instance every service must use instead of importing axios directly, so every API
// call automatically shows the global Loading overlay unless it opts out via config.showLoading,
// and every backend call carries the signed-in user's token. baseURL comes from .env (empty in
// development, where the Vite dev server proxies /api - see vite.config.ts).
export const httpClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL })

httpClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (config.showLoading !== false) startLoading()

  if (isBackendRequest(config.url)) {
    // The backend separates each school's data by tenant and needs it on every call, the login
    // included - without it, it looks in the "public" tenant and rejects valid accounts.
    const tenantId = getTenantId()
    if (tenantId && !config.headers["X-Tenant-ID"]) config.headers["X-Tenant-ID"] = tenantId

    if (!config.headers.Authorization) {
      const token = await getSessionToken()
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  }

  return config
})

httpClient.interceptors.response.use(
  (response) => {
    if (response.config.showLoading !== false) stopLoading()

    return response
  },
  async (error) => {
    if (error.config?.showLoading !== false) stopLoading()

    // A 401 on a request that carried a token means the session is no longer valid (expired or
    // revoked): drop it and send the user back to the login. A 401 without a token - wrong
    // credentials on the login itself - is left for the caller to handle.
    const sentToken = Boolean(error.config?.headers?.Authorization)

    if (error.response?.status === 401 && sentToken) {
      clearSession()
      if (window.location.pathname !== loginPath) window.location.replace(loginPath)
    }

    return Promise.reject(error)
  },
)
