import type { RoleCode } from "@/models"

import type { PathsType } from "./paths"
import { paths } from "./paths"

type PageKey = keyof PathsType

// Who may open each page behind the login, by its key in paths. A page left out opens for anyone
// signed in - only until the responsibilities matrix v2.0 (JLM-208) gives the other roles their pages.
// What is here follows the backend: the organization is Admin-only; users, invitations and the access
// audit are for Admin and Secretaria. The menu hides what a user can't open, and the AppShell's loader
// sends a direct visit home; neither replaces the backend's own check on every call.
export const pageRoles: Partial<Record<PageKey, RoleCode[]>> = {
  audit: ["ADMIN", "SECRETARIA"],
  invites: ["ADMIN", "SECRETARIA"],
  myUnit: ["ADMIN"],
  profilesAndPermissions: ["ADMIN", "SECRETARIA"],
  userList: ["ADMIN", "SECRETARIA"],
}

const pageKeyByPath = new Map<string, PageKey>(Object.entries(paths).map(([key, path]) => [path, key as PageKey]))

// The page a path opens, if it is one of the app's own.
export const getPageKey = (pathname: string): PageKey | undefined => pageKeyByPath.get(pathname)
