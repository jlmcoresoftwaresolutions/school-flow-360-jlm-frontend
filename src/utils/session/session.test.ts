import { afterEach, describe, expect, it } from "vitest"

import { clearSession, getSession, getSessionToken, hasSession, saveSession } from "./session"

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString()

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

    expect(await getSession()).toEqual({ expiresAt, refreshToken: "refresh-1", token: "token-1" })
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

  it("treats an expired session as no session and removes it", async () => {
    await saveSession({ expiresAt: new Date(Date.now() - 1000).toISOString(), refreshToken: "r", token: "t" })

    expect(await getSession()).toBeNull()
    expect(localStorage.getItem("sf360.session")).toBeNull()
  })

  it("keeps a session whose expiry can't be read", async () => {
    await saveSession({ expiresAt: "", refreshToken: "r", token: "t" })

    expect(await getSessionToken()).toBe("t")
  })

  it("forgets the session on clearSession", async () => {
    await saveSession({ expiresAt: inOneHour(), refreshToken: "r", token: "t" })

    clearSession()

    expect(await hasSession()).toBe(false)
  })
})
