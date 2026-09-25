import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useMediaQuery } from "./useMediaQuery"

type Listener = () => void

// A minimal controllable matchMedia: tests flip `matches` and fire the registered "change" listeners.
const stubMatchMedia = (initialMatches: boolean) => {
  const listeners = new Set<Listener>()
  const state = { matches: initialMatches }

  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
      get matches() {
        return state.matches
      },
      media: query,
      removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
    })),
  )

  return {
    listeners,
    setMatches: (matches: boolean) => {
      state.matches = matches
      listeners.forEach((listener) => listener())
    },
  }
}

describe("useMediaQuery", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns false when matchMedia is not available", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"))

    expect(result.current).toBe(false)
  })

  it("returns whether the query currently matches", () => {
    stubMatchMedia(true)

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"))

    expect(result.current).toBe(true)
  })

  it("re-renders when the query starts or stops matching", () => {
    const media = stubMatchMedia(false)

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"))
    expect(result.current).toBe(false)

    act(() => media.setMatches(true))
    expect(result.current).toBe(true)

    act(() => media.setMatches(false))
    expect(result.current).toBe(false)
  })

  it("stops listening once the component unmounts", () => {
    const media = stubMatchMedia(false)

    const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"))
    expect(media.listeners.size).toBe(1)

    unmount()

    expect(media.listeners.size).toBe(0)
  })
})
