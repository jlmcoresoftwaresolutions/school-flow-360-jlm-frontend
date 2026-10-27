export type LoginRequest = {
  email: string
  password: string
}

// What /api/auth/login (and /api/auth/refresh) return. `token` is the access token to send as
// `Authorization: Bearer`; `accessToken` is the one the refresh endpoint hands back, so it is
// optional here. `expiresAt` is an ISO date-time.
export type AuthData = {
  expiresAt: string
  refreshToken: string
  token: string
  accessToken?: string | null
}
