import { clearSession } from "../session"

// Query parameters of the login page: where to return after signing in, and whether the user lands
// there because their session expired (so the page can say so).
export const loginRedirectParam = "redirect"
export const sessionExpiredParam = "expired"

export type LoginUrlOptions = {
  from?: string
  sessionExpired?: boolean
}

// The return path, only if it stays inside this app: a path starting with a single "/". Anything else
// - a full URL, a protocol-relative "//other.site", a "/\other.site" that browsers read the same way -
// is dropped, so a crafted login link can't send the user to another site after they sign in.
export const getSafeRedirectPath = (value?: string | null): string | null => {
  if (!value?.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null

  return value
}

// The login URL with its query: the page to return to (left out when it is the login itself or the
// root, which lead to the login anyway) and the session-expired flag.
export const buildLoginUrl = (loginPath: string, options: LoginUrlOptions = {}): string => {
  const { from, sessionExpired } = options

  const params = new URLSearchParams()
  const redirectPath = getSafeRedirectPath(from)

  const redirectPathname = redirectPath?.split(/[?#]/)[0]

  if (redirectPath && redirectPathname !== "/" && redirectPathname !== loginPath) {
    params.set(loginRedirectParam, redirectPath)
  }
  if (sessionExpired) params.set(sessionExpiredParam, "1")

  const query = params.toString()

  return query ? `${loginPath}?${query}` : loginPath
}

// Ends a session the backend (or its expiry time) no longer accepts: drops it and reloads the app on
// the login, which then explains why and offers to bring the user back here. A full reload rather than
// a client-side navigation, so nothing the previous page loaded stays in memory.
export const endExpiredSession = (loginPath: string): void => {
  clearSession()

  const { hash, pathname, search } = window.location
  if (pathname === loginPath) return

  window.location.replace(buildLoginUrl(loginPath, { from: `${pathname}${search}${hash}`, sessionExpired: true }))
}
