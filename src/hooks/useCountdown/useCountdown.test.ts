import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useCountdown } from "./useCountdown"

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("is not running before it starts", () => {
    const { result } = renderHook(() => useCountdown())

    expect(result.current.isRunning).toBe(false)
    expect(result.current.secondsLeft).toBe(0)
  })

  it("counts down one second at a time once started", () => {
    const { result } = renderHook(() => useCountdown())

    act(() => result.current.start(3))

    expect(result.current.isRunning).toBe(true)
    expect(result.current.secondsLeft).toBe(3)

    act(() => vi.advanceTimersByTime(1000))

    expect(result.current.secondsLeft).toBe(2)
  })

  it("stops when the time is up", () => {
    const { result } = renderHook(() => useCountdown())

    act(() => result.current.start(2))
    act(() => vi.advanceTimersByTime(2000))

    expect(result.current.isRunning).toBe(false)
    expect(result.current.secondsLeft).toBe(0)
  })

  it("keeps to the clock even when a tick comes late", () => {
    const { result } = renderHook(() => useCountdown())

    act(() => result.current.start(10))
    // A throttled tab: the clock moves on without the interval firing.
    vi.setSystemTime(Date.now() + 7000)
    act(() => vi.advanceTimersByTime(1000))

    expect(result.current.secondsLeft).toBe(2)
  })

  it("restarts from the new duration when started again", () => {
    const { result } = renderHook(() => useCountdown())

    act(() => result.current.start(5))
    act(() => vi.advanceTimersByTime(3000))
    act(() => result.current.start(5))

    expect(result.current.secondsLeft).toBe(5)
  })
})
