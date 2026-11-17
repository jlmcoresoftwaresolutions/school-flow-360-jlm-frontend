import { useEffect, useState } from "react"

// `value`, but only once it stopped changing for `delayMs`: a search box that asks the backend on each
// pause instead of on each keystroke. The first value comes through at once.
export const useDebouncedValue = <T>(value: T, delayMs = 300): T => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)

    return () => window.clearTimeout(timer)
  }, [delayMs, value])

  return debounced
}
