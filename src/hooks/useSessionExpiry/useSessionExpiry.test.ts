import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { SessionState } from "@/utils/session"
import { getSessionState } from "@/utils/session"

import { useSessionExpiry } from "./useSessionExpiry"

vi.mock("@/utils/session", () => ({ getSessionState: vi.fn() }))

const mockedGetSessionState = vi.mocked(getSessionState)

const activeUntil = (expiresAt: number): SessionState => ({
  session: { expiresAt: new Date(expiresAt).toISOString(), refreshToken: "r", token: "t" },
  status: "active",
})

const expired: SessionState = { session: null, status: "expired" }
const none: SessionState = { session: null, status: "none" }

describe("useSessionExpiry", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    mockedGetSessionState.mockReset()
  })

  it("calls onExpire when the session reaches its expiry, not before", async () => {
    const expiresAt = Date.now() + 60_000
    mockedGetSessionState.mockImplementation(async () => (Date.now() >= expiresAt ? expired : activeUntil(expiresAt)))
    const onExpire = vi.fn()

    renderHook(() => useSessionExpiry(onExpire))

    await vi.advanceTimersByTimeAsync(59_999)
    expect(onExpire).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it("calls onExpire right away for a session found already expired", async () => {
    mockedGetSessionState.mockResolvedValue(expired)
    const onExpire = vi.fn()

    renderHook(() => useSessionExpiry(onExpire))
    await vi.advanceTimersByTimeAsync(0)

    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it("does nothing when there is no session, or it was removed before expiring", async () => {
    const expiresAt = Date.now() + 1000
    mockedGetSessionState.mockResolvedValueOnce(activeUntil(expiresAt)).mockResolvedValue(none)
    const onExpire = vi.fn()

    renderHook(() => useSessionExpiry(onExpire))
    await vi.advanceTimersByTimeAsync(5000)

    expect(onExpire).not.toHaveBeenCalled()
  })

  it("stops watching once unmounted", async () => {
    const expiresAt = Date.now() + 1000
    mockedGetSessionState.mockImplementation(async () => (Date.now() >= expiresAt ? expired : activeUntil(expiresAt)))
    const onExpire = vi.fn()

    const { unmount } = renderHook(() => useSessionExpiry(onExpire))
    await vi.advanceTimersByTimeAsync(0)
    unmount()
    await vi.advanceTimersByTimeAsync(5000)

    expect(onExpire).not.toHaveBeenCalled()
  })
})
