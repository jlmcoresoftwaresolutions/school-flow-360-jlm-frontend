// The backend's roles (User.role).
export type UserRole = "ADMIN" | "USER"

export type CurrentUser = {
  name: string
  role: UserRole
  avatarSrc?: string
}

// Placeholder for the signed-in user until the backend says who it is: there is no /me endpoint yet,
// and its User has no name or photo. Until then the topbar shows this same user for everyone.
export const currentUserMock: CurrentUser = {
  name: "João Silva",
  role: "ADMIN",
}
