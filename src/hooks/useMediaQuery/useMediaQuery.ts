import { useCallback, useSyncExternalStore } from "react"

// Subscribes to a CSS media query and re-renders when it starts/stops matching. Where matchMedia
// doesn't exist (jsdom, i.e. every unit test unless one stubs it) it reports false, which for a
// "compact screen" query means "behave as on desktop".
export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== "function") return () => {}

      const mediaQueryList = window.matchMedia(query)
      mediaQueryList.addEventListener("change", onChange)

      return () => mediaQueryList.removeEventListener("change", onChange)
    },
    [query],
  )

  const getSnapshot = useCallback(
    () => typeof window.matchMedia === "function" && window.matchMedia(query).matches,
    [query],
  )

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
