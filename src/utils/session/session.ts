import { getStorageItem, removeStorageItem, setStorageItem } from "../storage"

export type Session = {
  expiresAt: string
  refreshToken: string
  token: string
}

export type SessionInput = Session & {
  accessToken?: string | null
}

// What is stored right now: an active session, one that has just been found expired (and removed),
// or none at all. Telling the last two apart is what lets the app say "your session expired" instead
// of just showing the login.
export type SessionState = { session: null; status: "expired" | "none" } | { session: Session; status: "active" }

const sessionStorageKey = "sf360.session"

// The signed-in user's tokens, kept encrypted in localStorage (see storage.ts) so the session
// survives reloads and new tabs. A plain module rather than a hook: httpClient's interceptors and the
// router's loaders read it outside React.

// Stores what /api/auth/login returned. Only `token` is used as the access token - `accessToken` is
// what the refresh endpoint returns, and isn't kept.
export const saveSession = async (input: SessionInput): Promise<void> => {
  const { expiresAt, refreshToken, token } = input

  await setStorageItem(sessionStorageKey, { expiresAt, refreshToken, token } satisfies Session)
}

// The stored session and whether it is still valid. An expired session is also removed, so the next
// check doesn't have to decrypt it again - and from then on it reads as "none".
export const getSessionState = async (): Promise<SessionState> => {
  const session = await getStorageItem<Session>(sessionStorageKey)

  if (!session?.token) return { session: null, status: "none" }

  const expiresAt = Date.parse(session.expiresAt)

  if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
    clearSession()
    return { session: null, status: "expired" }
  }

  return { session, status: "active" }
}

// The stored session, or null when there is none, it can't be read, or it has expired.
export const getSession = async (): Promise<Session | null> => (await getSessionState()).session

export const getSessionToken = async (): Promise<string | null> => (await getSession())?.token ?? null

export const hasSession = async (): Promise<boolean> => (await getSession()) !== null

export const clearSession = (): void => {
  removeStorageItem(sessionStorageKey)
}
