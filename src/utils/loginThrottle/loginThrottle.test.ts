import { afterEach, describe, expect, it, vi } from "vitest"

import { clearFailedLogins, getLockDurationMs, getLoginLockRemainingMs, registerFailedLogin } from "./loginThrottle"

const minute = 60 * 1000

const failTimes = async (email: string, times: number) => {
  let lockMs = 0
  for (let attempt = 0; attempt < times; attempt += 1) lockMs = await registerFailedLogin(email)
  return lockMs
}

describe("getLockDurationMs", () => {
  it.each([
    [5, 1],
    [10, 3],
    [15, 3],
    [20, 3],
    [50, 3],
  ])("locks after %i wrong attempts for %i minutes", (failures, minutes) => {
    expect(getLockDurationMs(failures)).toBe(minutes * minute)
  })

  it.each([0, 1, 4, 6, 9, 11])("doesn't lock after %i wrong attempts", (failures) => {
    expect(getLockDurationMs(failures)).toBe(0)
  })
})

describe("loginThrottle", () => {
  afterEach(() => {
    localStorage.clear()
    vi.useRealTimers()
  })

  it("locks an e-mail on its 5th wrong attempt, not before", async () => {
    expect(await failTimes("diretor@escola.com", 4)).toBe(0)
    expect(await getLoginLockRemainingMs("diretor@escola.com")).toBe(0)

    expect(await registerFailedLogin("diretor@escola.com")).toBe(minute)
    expect(await getLoginLockRemainingMs("diretor@escola.com")).toBeGreaterThan(59 * 1000)
  })

  it("keeps counting after a lock ends, locking longer the next time", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })

    await failTimes("diretor@escola.com", 5)
    vi.advanceTimersByTime(minute)
    expect(await getLoginLockRemainingMs("diretor@escola.com")).toBe(0)

    expect(await failTimes("diretor@escola.com", 5)).toBe(3 * minute)
  })

  it("treats the same address the same way however it was typed", async () => {
    await failTimes(" Diretor@Escola.com", 5)

    expect(await getLoginLockRemainingMs("diretor@escola.com ")).toBeGreaterThan(0)
  })

  it("keeps each e-mail's count apart", async () => {
    await failTimes("diretor@escola.com", 5)

    expect(await getLoginLockRemainingMs("secretaria@escola.com")).toBe(0)
  })

  it("starts over after a successful sign-in", async () => {
    await failTimes("diretor@escola.com", 4)
    await clearFailedLogins("diretor@escola.com")

    expect(await failTimes("diretor@escola.com", 4)).toBe(0)
  })

  it("never stores the e-mail as plain text", async () => {
    await registerFailedLogin("diretor@escola.com")

    expect(JSON.stringify({ ...localStorage })).not.toContain("diretor@escola.com")
  })
})
