import { afterEach, describe, expect, it } from "vitest"

import type { UserContext } from "@/models"

import {
  clearSession,
  getSession,
  getSessionContext,
  getSessionState,
  getSessionToken,
  hasSession,
  saveSession,
  updateSessionContext,
} from "./session"

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString()
const aSecondAgo = () => new Date(Date.now() - 1000).toISOString()

const adminContext: UserContext = {
  admin: true,
  assignments: [],
  email: "diretor@escola.com.br",
  fullName: "Ana Diretora",
  roles: ["ADMIN"],
  userId: 1,
}

describe("session", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("has no session before one is saved", async () => {
    expect(await getSession()).toBeNull()
    expect(await getSessionToken()).toBeNull()
    expect(await hasSession()).toBe(false)
  })

  it("stores the login's token, refresh token and expiry", async () => {
    const expiresAt = inOneHour()
    await saveSession({ expiresAt, refreshToken: "refresh-1", token: "token-1" })

    expect(await getSession()).toEqual({ context: null, expiresAt, refreshToken: "refresh-1", token: "token-1" })
    expect(await getSessionToken()).toBe("token-1")
    expect(await hasSession()).toBe(true)
  })

  it("uses token, not accessToken, as the access token", async () => {
    await saveSession({ accessToken: "refreshed", expiresAt: inOneHour(), refreshToken: "refresh-1", token: "token-1" })

    expect(await getSessionToken()).toBe("token-1")
    expect(await getSession()).not.toHaveProperty("accessToken")
  })

  it("never writes the token to storage as plain text", async () => {
    await saveSession({ expiresAt: inOneHour(), refreshToken: "refresh-1", token: "token-1" })

    expect(JSON.stringify({ ...localStorage })).not.toContain("token-1")
  })

  it("keeps a session whose access token expired, as stale, for its refresh token to renew", async () => {
    const expiresAt = aSecondAgo()
    await saveSession({ expiresAt, refreshToken: "r", token: "t" })

    expect(await getSessionState()).toEqual({
      session: { context: null, expiresAt, refreshToken: "r", token: "t" },
      status: "stale",
    })
    expect(await getSession()).toBeNull()
    expect(await getSessionToken()).toBeNull()
    expect(await hasSession()).toBe(true)
  })

  it("keeps a session whose expiry can't be read", async () => {
    await saveSession({ expiresAt: "", refreshToken: "r", token: "t" })

    expect(await getSessionToken()).toBe("t")
  })

  it("reports no session, and an unexpired one as active", async () => {
    expect(await getSessionState()).toEqual({ session: null, status: "none" })

    const expiresAt = inOneHour()
    await saveSession({ expiresAt, refreshToken: "r", token: "t" })

    expect(await getSessionState()).toEqual({
      session: { context: null, expiresAt, refreshToken: "r", token: "t" },
      status: "active",
    })
  })

  it("keeps who signed in with the session, and a fresher reading of it", async () => {
    expect(await getSessionContext()).toBeNull()

    await saveSession({ context: adminContext, expiresAt: inOneHour(), refreshToken: "r", token: "t" })
    expect(await getSessionContext()).toEqual(adminContext)

    const renamed = { ...adminContext, fullName: "Ana Souza" }
    await updateSessionContext(renamed)

    expect(await getSessionContext()).toEqual(renamed)
    expect(await getSessionToken()).toBe("t")
  })

  it("doesn't bring a session back when updating who signed in after it ended", async () => {
    await updateSessionContext(adminContext)

    expect(await hasSession()).toBe(false)
  })

  it("forgets the session on clearSession", async () => {
    await saveSession({ expiresAt: inOneHour(), refreshToken: "r", token: "t" })

    clearSession()

    expect(await hasSession()).toBe(false)
  })
})
