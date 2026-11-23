import type { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios"
import axios, { isAxiosError } from "axios"

import type { ApiErrorCode } from "@/models"
import { paths } from "@/routes/paths"
import { endExpiredSession, requirePasswordChange } from "@/utils/authRedirect"
import { markBackendResponse } from "@/utils/backendActivity"
import { startLoading, stopLoading } from "@/utils/loadingStore"
import { getSessionState, saveSession } from "@/utils/session"
import { getTenantId } from "@/utils/tenant"

import { refreshSession } from "../auth/auth"

declare module "axios" {
  interface AxiosRequestConfig {
    idempotencyKey?: string
    // Internal: set on a request sent again after the session was renewed, so it is never retried twice.
    retriedAfterRenewal?: boolean
    showLoading?: boolean
    tenantId?: string
  }
}

// The single config object every service function accepts, on top of its own arguments - kept
// as its own type (rather than exposing all of AxiosRequestConfig) so callers only ever see the
// options this app actually wants to offer, with room to grow (e.g. a future skipErrorToast).
// tenantId overrides the deploy's tenant for one call, for a request that names its own school (the
// password reset link carries the tenant it was issued for). idempotencyKey goes as the
// Idempotency-Key header, so repeating a create (a double click, a retry after a timeout) returns
// the first result instead of creating twice - generate one per attempt the user means as one.
// onUploadProgress follows an upload as it goes (a file sent with a progress shown), and signal (an
// AbortController's) cancels the call, for an upload the user gives up on.
export type RequestConfig = Pick<
  AxiosRequestConfig,
  "idempotencyKey" | "onUploadProgress" | "showLoading" | "signal" | "tenantId"
>

// The HTTP status of a failed call (e.g. 401 for wrong credentials), or undefined when there was no
// response at all (network down, CORS refusal, timeout) - so a page can tell the two apart without
// importing axios itself.
export const getErrorStatus = (error: unknown): number | undefined =>
  isAxiosError(error) ? error.response?.status : undefined

// The backend's stable code of a failed call (e.g. UNIT_NAME_DUPLICATE), or undefined when the error
// has none - which tells apart errors that share a status (a 409 for a stale version from a 409 for a
// name already taken) without reading the message.
export const getErrorCode = (error: unknown): ApiErrorCode | undefined => {
  if (!isAxiosError(error)) return undefined

  const body: unknown = error.response?.data
  if (typeof body !== "object" || body === null || !("code" in body)) return undefined

  return typeof body.code === "string" ? (body.code as ApiErrorCode) : undefined
}

// The `data` of a failed call's envelope, for the errors that carry one (the login's 409
// SESSION_LIMIT_REACHED brings the sessions to choose from), or undefined. Its shape is the caller's to
// check: nothing here vouches for it.
export const getErrorData = (error: unknown): unknown => {
  if (!isAxiosError(error)) return undefined

  const body: unknown = error.response?.data
  if (typeof body !== "object" || body === null || !("data" in body)) return undefined

  return body.data ?? undefined
}

// The backend's own text of a failed call (the envelope's `message`), or undefined. Never decide by it -
// the `code` is for that; it is only read where the backend puts data in it that has no field of its own
// (the dependencies an academic change waits on, listed in its 409 ACADEMIC_DEPENDENCY_ACTIVE).
export const getErrorMessage = (error: unknown): string | undefined => {
  if (!isAxiosError(error)) return undefined

  const body: unknown = error.response?.data
  if (typeof body !== "object" || body === null || !("message" in body)) return undefined

  return typeof body.message === "string" && body.message ? body.message : undefined
}

// The id the backend gave a failed call (the envelope's `correlationId`, or its X-Correlation-ID header),
// which finds the call in the backend's logs: shown as a reference on an unexpected failure, for support.
// Undefined when there was no answer, or the answer has none.
export const getErrorCorrelationId = (error: unknown): string | undefined => {
  if (!isAxiosError(error)) return undefined

  const body: unknown = error.response?.data
  if (typeof body === "object" && body !== null && "correlationId" in body && typeof body.correlationId === "string") {
    return body.correlationId || undefined
  }

  const header: unknown = error.response?.headers?.["x-correlation-id"]
  return typeof header === "string" && header ? header : undefined
}

// The seconds a refused call says to wait (its Retry-After header, as the login's 429 sends), or
// undefined when it doesn't say - or the browser can't read it: a cross-origin response only shows the
// headers the backend's CORS exposes.
export const getRetryAfterSeconds = (error: unknown): number | undefined => {
  if (!isAxiosError(error)) return undefined

  const seconds = Number(error.response?.headers?.["retry-after"])

  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined
}

// A relative URL ("/api/...") goes to the SchoolFlow360 backend through baseURL; an absolute one is
// a third-party API (e.g. ViaCEP), which must never receive the user's token.
const isBackendRequest = (url?: string) => url !== undefined && !/^[a-z][a-z\d+\-.]*:\/\//i.test(url)

// The renewal itself carries no access token (the expired one would only get it refused) and is never
// renewed in turn.
const renewalPath = "/api/auth/refresh"
const isRenewalRequest = (url?: string) => url === renewalPath

let pendingRenewal: Promise<string | null> | null = null

const requestRenewal = async (): Promise<string | null> => {
  const { session } = await getSessionState()
  if (!session?.refreshToken) return null

  let renewed
  try {
    renewed = await refreshSession({ refreshToken: session.refreshToken }, { showLoading: false })
  } catch (error) {
    // Refused: the refresh token expired or the session was revoked. Anything else (offline, the
    // backend down) says nothing about the session, so it is left for the caller.
    if (getErrorStatus(error) === 401) return null
    throw error
  }

  // Signed out while the renewal was on its way: don't bring the session back.
  if ((await getSessionState()).status === "none") return null

  await saveSession({ ...renewed, context: session.context })

  return renewed.token
}

// Trades the refresh token for a new access token (it lasts 1 h; the refresh token, 7 days) and stores
// it, keeping who signed in. Resolves to the new token, or null when the session can't be renewed
// (none stored, or the backend refused it) and must end; rejects when the backend couldn't be reached.
// Calls made at the same time share one renewal, since each refresh token works only once.
export const renewSession = (): Promise<string | null> => {
  pendingRenewal ??= requestRenewal().finally(() => {
    pendingRenewal = null
  })

  return pendingRenewal
}

// The access token to send: the stored one while it works, a renewed one once it has expired. A
// session the backend won't renew ends here, sending the user to the login.
const getUsableToken = async (): Promise<string | null> => {
  const state = await getSessionState()

  if (state.status === "active") return state.session.token
  if (state.status === "none") return null

  try {
    const token = await renewSession()
    if (!token) endExpiredSession(paths.login)

    return token
  } catch {
    // The backend couldn't be reached: the call goes as it is and fails on its own.
    return null
  }
}

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
    const tenantId = config.tenantId ?? getTenantId()
    if (tenantId && !config.headers["X-Tenant-ID"]) config.headers["X-Tenant-ID"] = tenantId

    if (!config.headers.Authorization && !isRenewalRequest(config.url)) {
      const token = await getUsableToken()
      if (token) config.headers.Authorization = `Bearer ${token}`
    }

    if (config.idempotencyKey) config.headers["Idempotency-Key"] = config.idempotencyKey
  }

  return config
})

httpClient.interceptors.response.use(
  (response) => {
    if (response.config.showLoading !== false) stopLoading()
    if (isBackendRequest(response.config.url)) markBackendResponse()

    return response
  },
  async (error) => {
    if (error.config?.showLoading !== false) stopLoading()
    // Any answer, even an error status, means the backend is awake; no response at all doesn't.
    if (error.response && isBackendRequest(error.config?.url)) markBackendResponse()

    // A 401 on a request that carried a token means its access token is no longer accepted: the
    // session is renewed once and the request sent again. When it can't be renewed (revoked, or the
    // refresh token expired too), the session ends and the user goes to the login, which says so and
    // offers to come back here. A 401 without a token - wrong credentials on the login itself - is
    // left for the caller.
    const sentToken = Boolean(error.config?.headers?.Authorization)

    if (error.response?.status === 401 && sentToken && !isRenewalRequest(error.config.url)) {
      if (!error.config.retriedAfterRenewal) {
        try {
          const token = await renewSession()

          if (token) {
            error.config.headers.Authorization = `Bearer ${token}`
            return httpClient({ ...error.config, retriedAfterRenewal: true })
          }
        } catch {
          // The backend couldn't be reached to renew it: the call fails as it is.
          return Promise.reject(error)
        }
      }

      endExpiredSession(paths.login)
    }

    // A temporary password must be changed before anything else: the backend refuses every other call
    // until then, and the app goes to the change page (the routes send there too, from the context).
    if (error.response?.status === 403 && sentToken && error.response.data?.code === "PASSWORD_CHANGE_REQUIRED") {
      requirePasswordChange(paths.changePassword)
    }

    return Promise.reject(error)
  },
)
