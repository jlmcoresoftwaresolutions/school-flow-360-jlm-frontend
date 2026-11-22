import type { AxiosResponse, InternalAxiosRequestConfig } from "axios"
import { AxiosError } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { UserContext } from "@/models"
import { endExpiredSession, requirePasswordChange } from "@/utils/authRedirect"
import { getSessionState, saveSession } from "@/utils/session"

import { getErrorData, getRetryAfterSeconds, httpClient } from "./httpClient"

vi.mock("@/utils/authRedirect", () => ({ endExpiredSession: vi.fn(), requirePasswordChange: vi.fn() }))

const context: UserContext = {
  admin: true,
  assignments: [],
  email: "diretor@escola.com.br",
  fullName: "Ana Diretora",
  roles: ["ADMIN"],
  userId: 1,
}

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString()
const aSecondAgo = () => new Date(Date.now() - 1000).toISOString()

type Handler = (config: InternalAxiosRequestConfig) => { data?: unknown; status: number } | "offline"

// Stands in for the network: each request is answered by `handle`, and every request is recorded,
// with the Authorization it was sent with (a retried request's config is reused).
let handle: Handler
const requests: InternalAxiosRequestConfig[] = []
const sentAuthorizations: (string | null)[] = []

const answer = (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  requests.push(config)
  sentAuthorizations.push(config.headers.Authorization ? String(config.headers.Authorization) : null)
  const result = handle(config)

  if (result === "offline") return Promise.reject(new AxiosError("Network Error", "ERR_NETWORK", config))

  const response: AxiosResponse = {
    config,
    data: result.data ?? {},
    headers: {},
    status: result.status,
    statusText: "",
  }
  if (result.status < 400) return Promise.resolve(response)

  return Promise.reject(new AxiosError("Refused", String(result.status), config, null, response))
}

const renewed = (token: string) => ({
  data: { data: { expiresAt: inOneHour(), refreshToken: `refresh-${token}`, token } },
  status: 200,
})

const authorizationOf = (url: string) =>
  sentAuthorizations.filter((_authorization, index) => requests[index].url === url)

describe("httpClient", () => {
  beforeEach(() => {
    httpClient.defaults.adapter = answer
    requests.length = 0
    sentAuthorizations.length = 0
  })

  afterEach(() => {
    localStorage.clear()
    vi.mocked(endExpiredSession).mockClear()
    vi.mocked(requirePasswordChange).mockClear()
  })

  it("sends the stored access token and the tenant to the backend", async () => {
    await saveSession({ expiresAt: inOneHour(), refreshToken: "refresh-1", token: "token-1" })
    handle = () => ({ status: 200 })

    await httpClient.get("/api/me")

    expect(requests[0].headers.Authorization).toBe("Bearer token-1")
    expect(requests[0].headers["X-Tenant-ID"]).toBeTruthy()
  })

  it("never sends the token to a third-party API", async () => {
    await saveSession({ expiresAt: inOneHour(), refreshToken: "refresh-1", token: "token-1" })
    handle = () => ({ status: 200 })

    await httpClient.get("https://viacep.com.br/ws/01310100/json/")

    expect(requests[0].headers.Authorization).toBeUndefined()
  })

  it("sends an idempotency key as its header", async () => {
    handle = () => ({ status: 200 })

    await httpClient.post("/api/invitations", {}, { idempotencyKey: "key-1" })

    expect(requests[0].headers["Idempotency-Key"]).toBe("key-1")
  })

  it("renews an expired access token before the call, keeping who signed in", async () => {
    await saveSession({ context, expiresAt: aSecondAgo(), refreshToken: "refresh-1", token: "token-1" })
    handle = (config) => (config.url === "/api/auth/refresh" ? renewed("token-2") : { status: 200 })

    await httpClient.get("/api/me")

    expect(authorizationOf("/api/auth/refresh")).toEqual([null])
    expect(JSON.parse(String(requests[0].data))).toEqual({ refreshToken: "refresh-1" })
    expect(authorizationOf("/api/me")).toEqual(["Bearer token-2"])

    const { session, status } = await getSessionState()
    expect(status).toBe("active")
    expect(session).toMatchObject({ context, refreshToken: "refresh-token-2", token: "token-2" })
  })

  it("renews once and sends again a call refused because its token expired", async () => {
    await saveSession({ expiresAt: inOneHour(), refreshToken: "refresh-1", token: "token-1" })
    handle = (config) => {
      if (config.url === "/api/auth/refresh") return renewed("token-2")
      return config.headers.Authorization === "Bearer token-2" ? { data: "ok", status: 200 } : { status: 401 }
    }

    const response = await httpClient.get("/api/users")

    expect(response.data).toBe("ok")
    expect(authorizationOf("/api/users")).toEqual(["Bearer token-1", "Bearer token-2"])
    expect(endExpiredSession).not.toHaveBeenCalled()
  })

  it("shares one renewal between calls made at the same time", async () => {
    await saveSession({ expiresAt: aSecondAgo(), refreshToken: "refresh-1", token: "token-1" })
    handle = (config) => (config.url === "/api/auth/refresh" ? renewed("token-2") : { status: 200 })

    await Promise.all([httpClient.get("/api/me"), httpClient.get("/api/users"), httpClient.get("/api/invitations")])

    expect(authorizationOf("/api/auth/refresh")).toHaveLength(1)
  })

  it("ends the session when the backend refuses to renew it", async () => {
    await saveSession({ expiresAt: inOneHour(), refreshToken: "refresh-1", token: "token-1" })
    handle = () => ({ status: 401 })

    await expect(httpClient.get("/api/users")).rejects.toThrow()

    expect(authorizationOf("/api/auth/refresh")).toHaveLength(1)
    expect(endExpiredSession).toHaveBeenCalledTimes(1)
  })

  it("sends a call again only once, ending the session if it is refused again", async () => {
    await saveSession({ expiresAt: inOneHour(), refreshToken: "refresh-1", token: "token-1" })
    handle = (config) => (config.url === "/api/auth/refresh" ? renewed("token-2") : { status: 401 })

    await expect(httpClient.get("/api/users")).rejects.toThrow()

    expect(authorizationOf("/api/users")).toHaveLength(2)
    expect(authorizationOf("/api/auth/refresh")).toHaveLength(1)
    expect(endExpiredSession).toHaveBeenCalledTimes(1)
  })

  it("goes to the password change when a temporary password must be changed first", async () => {
    await saveSession({ expiresAt: inOneHour(), refreshToken: "refresh-1", token: "token-1" })
    handle = () => ({ data: { code: "PASSWORD_CHANGE_REQUIRED", data: null }, status: 403 })

    await expect(httpClient.get("/api/users")).rejects.toThrow()

    expect(requirePasswordChange).toHaveBeenCalledWith("/change-password")
    expect(endExpiredSession).not.toHaveBeenCalled()
    expect((await getSessionState()).status).toBe("active")
  })

  it("leaves any other 403 to the caller", async () => {
    await saveSession({ expiresAt: inOneHour(), refreshToken: "refresh-1", token: "token-1" })
    handle = () => ({ data: { code: "SCOPE_DENIED", data: null }, status: 403 })

    await expect(httpClient.get("/api/users")).rejects.toThrow()

    expect(requirePasswordChange).not.toHaveBeenCalled()
  })

  it("leaves a 401 without a token to the caller, as wrong credentials on the login", async () => {
    handle = () => ({ status: 401 })

    await expect(httpClient.post("/api/auth/login", {})).rejects.toThrow()

    expect(authorizationOf("/api/auth/refresh")).toHaveLength(0)
    expect(endExpiredSession).not.toHaveBeenCalled()
  })

  it("keeps the session when the backend can't be reached to renew it", async () => {
    await saveSession({ expiresAt: aSecondAgo(), refreshToken: "refresh-1", token: "token-1" })
    handle = (config) => (config.url === "/api/auth/refresh" ? "offline" : { status: 200 })

    await httpClient.get("/api/me")

    expect(endExpiredSession).not.toHaveBeenCalled()
    expect((await getSessionState()).status).toBe("stale")
  })

  it("reads the seconds to wait from a refused call's Retry-After header, when it can be read", async () => {
    handle = () => ({ status: 429 })
    const withoutHeader = await httpClient.post("/api/auth/login", {}).catch((error: unknown) => error)

    expect(getRetryAfterSeconds(withoutHeader)).toBeUndefined()

    const config = { headers: {} } as InternalAxiosRequestConfig
    const refused = new AxiosError("Too many", "429", config, null, {
      config,
      data: {},
      headers: { "retry-after": "42" },
      status: 429,
      statusText: "",
    })

    expect(getRetryAfterSeconds(refused)).toBe(42)
    expect(getRetryAfterSeconds(new Error("other"))).toBeUndefined()
  })

  it("reads the data a failed call's envelope carries", async () => {
    handle = () => ({ data: { code: "SESSION_LIMIT_REACHED", data: { sessions: [] } }, status: 409 })
    const error = await httpClient.post("/api/auth/login", {}).catch((caught: unknown) => caught)

    expect(getErrorData(error)).toEqual({ sessions: [] })
    expect(getErrorData(new Error("other"))).toBeUndefined()
  })
})
