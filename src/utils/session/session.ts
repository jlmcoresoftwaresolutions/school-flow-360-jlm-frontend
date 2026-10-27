import { getStorageItem, removeStorageItem, setStorageItem } from "../storage"

export type Session = {
  expiresAt: string
  refreshToken: string
  token: string
}

export type SessionInput = Session & {
  accessToken?: string | null
}

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

// The stored session, or null when there is none, it can't be read, or it has expired. An expired
// session is also removed, so the next check doesn't have to decrypt it again.
export const getSession = async (): Promise<Session | null> => {
  const session = await getStorageItem<Session>(sessionStorageKey)

  if (!session?.token) return null

  const expiresAt = Date.parse(session.expiresAt)

  if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
    clearSession()
    return null
  }

  return session
}

export const getSessionToken = async (): Promise<string | null> => (await getSession())?.token ?? null

export const hasSession = async (): Promise<boolean> => (await getSession()) !== null

export const clearSession = (): void => {
  removeStorageItem(sessionStorageKey)
}
