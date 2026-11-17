import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useDebouncedValue } from "./useDebouncedValue"

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("gives the first value at once", () => {
    const { result } = renderHook(() => useDebouncedValue("escola"))

    expect(result.current).toBe("escola")
  })

  it("only takes a new value once it stops changing for the delay", () => {
    const { rerender, result } = renderHook((props: { value: string }) => useDebouncedValue(props.value, 300), {
      initialProps: { value: "" },
    })

    rerender({ value: "m" })
    act(() => vi.advanceTimersByTime(200))
    rerender({ value: "ma" })
    act(() => vi.advanceTimersByTime(200))

    expect(result.current).toBe("")

    act(() => vi.advanceTimersByTime(100))

    expect(result.current).toBe("ma")
  })
})
