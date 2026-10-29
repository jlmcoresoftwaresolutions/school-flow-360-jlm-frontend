import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { isBackendLikelyAsleep, markBackendResponse, resetBackendActivity } from "./backendActivity"

describe("backendActivity", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetBackendActivity()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("assumes the backend may be asleep before it has answered in this tab", () => {
    expect(isBackendLikelyAsleep()).toBe(true)
  })

  it("knows the backend is awake right after it answers", () => {
    markBackendResponse()

    expect(isBackendLikelyAsleep()).toBe(false)
  })

  it("still counts it awake up to 15 minutes after the last answer", () => {
    markBackendResponse()
    vi.advanceTimersByTime(15 * 60 * 1000)

    expect(isBackendLikelyAsleep()).toBe(false)
  })

  it("assumes it went back to sleep after more than 15 minutes without an answer", () => {
    markBackendResponse()
    vi.advanceTimersByTime(15 * 60 * 1000 + 1)

    expect(isBackendLikelyAsleep()).toBe(true)
  })
})
