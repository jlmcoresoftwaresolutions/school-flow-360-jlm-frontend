import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { SessionState } from "@/utils/session"
import { getSessionState } from "@/utils/session"

import { sessionRetryDelayMs, useSessionExpiry } from "./useSessionExpiry"

vi.mock("@/utils/session", () => ({ getSessionState: vi.fn() }))

const mockedGetSessionState = vi.mocked(getSessionState)

const session = (expiresAt: number) => ({
  expiresAt: new Date(expiresAt).toISOString(),
  refreshToken: "r",
  token: "t",
})

const stateAt = (expiresAt: number): SessionState =>
  Date.now() >= expiresAt
    ? { session: session(expiresAt), status: "stale" }
    : { session: session(expiresAt), status: "active" }

const none: SessionState = { session: null, status: "none" }

describe("useSessionExpiry", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    mockedGetSessionState.mockReset()
  })

  it("calls onExpire when the access token expires, not before", async () => {
    const expiresAt = Date.now() + 60_000
    mockedGetSessionState.mockImplementation(async () => stateAt(expiresAt))
    const onExpire = vi.fn(() => false)

    renderHook(() => useSessionExpiry(onExpire))

    await vi.advanceTimersByTimeAsync(59_999)
    expect(onExpire).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it("calls onExpire right away for a session found already expired", async () => {
    mockedGetSessionState.mockImplementation(async () => stateAt(Date.now() - 1))
    const onExpire = vi.fn(() => false)

    renderHook(() => useSessionExpiry(onExpire))
    await vi.advanceTimersByTimeAsync(0)

    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it("watches the renewed session's new expiry after a renewal", async () => {
    let expiresAt = Date.now() + 1000
    mockedGetSessionState.mockImplementation(async () => stateAt(expiresAt))
    const onExpire = vi.fn(async () => {
      expiresAt = Date.now() + 60_000
      return true
    })

    renderHook(() => useSessionExpiry(onExpire))

    await vi.advanceTimersByTimeAsync(1000)
    expect(onExpire).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(59_999)
    expect(onExpire).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(onExpire).toHaveBeenCalledTimes(2)
  })

  it("tries again after a pause when the session couldn't be renewed yet", async () => {
    mockedGetSessionState.mockImplementation(async () => stateAt(Date.now() - 1))
    const onExpire = vi.fn(() => true)

    renderHook(() => useSessionExpiry(onExpire))
    await vi.advanceTimersByTimeAsync(0)
    expect(onExpire).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(sessionRetryDelayMs - 1)
    expect(onExpire).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(onExpire).toHaveBeenCalledTimes(2)
  })

  it("stops once the session ends", async () => {
    mockedGetSessionState.mockImplementation(async () => stateAt(Date.now() - 1))
    const onExpire = vi.fn(() => false)

    renderHook(() => useSessionExpiry(onExpire))
    await vi.advanceTimersByTimeAsync(sessionRetryDelayMs * 3)

    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it("does nothing when there is no session, or it was removed before expiring", async () => {
    const expiresAt = Date.now() + 1000
    mockedGetSessionState.mockResolvedValueOnce(stateAt(expiresAt)).mockResolvedValue(none)
    const onExpire = vi.fn(() => false)

    renderHook(() => useSessionExpiry(onExpire))
    await vi.advanceTimersByTimeAsync(5000)

    expect(onExpire).not.toHaveBeenCalled()
  })

  it("stops watching once unmounted", async () => {
    const expiresAt = Date.now() + 1000
    mockedGetSessionState.mockImplementation(async () => stateAt(expiresAt))
    const onExpire = vi.fn(() => false)

    const { unmount } = renderHook(() => useSessionExpiry(onExpire))
    await vi.advanceTimersByTimeAsync(0)
    unmount()
    await vi.advanceTimersByTimeAsync(5000)

    expect(onExpire).not.toHaveBeenCalled()
  })
})
