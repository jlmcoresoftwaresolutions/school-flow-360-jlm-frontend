import type { UserContext } from "@/models"

import { getStorageItem, removeStorageItem, setStorageItem } from "../storage"

// The access token (`token`, valid for 1 h, its expiry in `expiresAt`), the refresh token that renews
// it (7 days, a new one on every renewal) and who signed in (`context`, from the login or /api/me).
export type Session = {
  expiresAt: string
  refreshToken: string
  token: string
  context?: UserContext | null
}

export type SessionInput = Session & {
  accessToken?: string | null
}

// What is stored right now: a session whose access token still works, one whose access token has
// expired ("stale": the refresh token may still renew it - only a failed renewal ends it), or none.
export type SessionState =
  | { session: null; status: "none" }
  | { session: Session; status: "active" }
  | { session: Session; status: "stale" }

const sessionStorageKey = "sf360.session"

// The signed-in user's session, kept encrypted in localStorage (see storage.ts) so it survives reloads
// and new tabs. A plain module rather than a hook: httpClient's interceptors and the router's loaders
// read it outside React.

// Stores what /api/auth/login (or a renewal) returned. Only `token` is kept as the access token -
// `accessToken` repeats it. A renewal brings no context, so the caller passes the one it already had.
export const saveSession = async (input: SessionInput): Promise<void> => {
  const { context, expiresAt, refreshToken, token } = input

  await setStorageItem(sessionStorageKey, {
    context: context ?? null,
    expiresAt,
    refreshToken,
    token,
  } satisfies Session)
}

// The stored session and whether its access token is still valid.
export const getSessionState = async (): Promise<SessionState> => {
  const session = await getStorageItem<Session>(sessionStorageKey)

  if (!session?.token) return { session: null, status: "none" }

  const expiresAt = Date.parse(session.expiresAt)

  if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) return { session, status: "stale" }

  return { session, status: "active" }
}

// The stored session while its access token works, or null (none, unreadable, or stale).
export const getSession = async (): Promise<Session | null> => {
  const state = await getSessionState()

  return state.status === "active" ? state.session : null
}

export const getSessionToken = async (): Promise<string | null> => (await getSession())?.token ?? null

// Whether someone is signed in in this browser: a stale session counts, since it may still be renewed.
export const hasSession = async (): Promise<boolean> => (await getSessionState()).status !== "none"

// Who signed in, as last read (the login or /api/me), or null when unknown.
export const getSessionContext = async (): Promise<UserContext | null> =>
  (await getSessionState()).session?.context ?? null

// Keeps a fresher reading of who signed in (from /api/me) without touching the tokens. Does nothing
// when the session is gone (signed out in the meantime).
export const updateSessionContext = async (context: UserContext): Promise<void> => {
  const { session } = await getSessionState()
  if (!session) return

  await setStorageItem(sessionStorageKey, { ...session, context } satisfies Session)
}

export const clearSession = (): void => {
  removeStorageItem(sessionStorageKey)
}
