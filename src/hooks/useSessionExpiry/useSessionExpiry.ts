import { useEffect, useRef } from "react"

import { getSessionState } from "@/utils/session"

// setTimeout's longest delay (about 24.8 days); a later expiry is reached in more than one step.
const maxTimeoutMs = 2 ** 31 - 1

// Calls onExpire when the stored session reaches its expiresAt, even if the page makes no request in
// the meantime (the backend's 401 only shows up on the next call). Checked once on mount, then again
// at the expiry time; a session removed in the meantime (signed out in another tab) doesn't call it.
export const useSessionExpiry = (onExpire: () => void): void => {
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    let isStale = false
    let timeout: ReturnType<typeof setTimeout> | undefined

    const check = async () => {
      const state = await getSessionState()
      if (isStale) return

      if (state.status !== "active") {
        if (state.status === "expired") onExpireRef.current()
        return
      }

      const remainingMs = Date.parse(state.session.expiresAt) - Date.now()
      if (Number.isNaN(remainingMs)) return

      timeout = setTimeout(() => void check(), Math.min(Math.max(remainingMs, 0), maxTimeoutMs))
    }

    void check()

    return () => {
      isStale = true
      clearTimeout(timeout)
    }
  }, [])
}
