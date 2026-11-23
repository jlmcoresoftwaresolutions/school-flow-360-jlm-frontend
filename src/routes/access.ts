import type { RoleCode } from "@/models"

import type { PathsType } from "./paths"
import { paths } from "./paths"

type PageKey = keyof PathsType

// Who may open each page behind the login, by its key in paths. A page left out opens for anyone
// signed in - only until the responsibilities matrix v2.0 (JLM-208) gives the other roles their pages.
// What is here follows the backend and the matrix v2.0: the access audit is Admin-only; Minha Unidade
// is managed by the Admin and read by the Secretaria; users and invitations are for both; the people
// (students and guardians, P03) are for both too (PE-14: the other roles wait for their own modules).
// The menu hides what a user can't open, and the AppShell's loader sends a direct visit to the access
// denied page; neither replaces the backend's own check on every call.
export const pageRoles: Partial<Record<PageKey, RoleCode[]>> = {
  audit: ["ADMIN"],
  guardians: ["ADMIN", "SECRETARIA"],
  invites: ["ADMIN", "SECRETARIA"],
  myUnit: ["ADMIN", "SECRETARIA"],
  peopleSearch: ["ADMIN", "SECRETARIA"],
  profilesAndPermissions: ["ADMIN", "SECRETARIA"],
  studentEdit: ["ADMIN", "SECRETARIA"],
  studentNew: ["ADMIN", "SECRETARIA"],
  studentProfile: ["ADMIN", "SECRETARIA"],
  students: ["ADMIN", "SECRETARIA"],
  userList: ["ADMIN", "SECRETARIA"],
}

const pageKeyByPath = new Map<string, PageKey>(Object.entries(paths).map(([key, path]) => [path, key as PageKey]))

// The page a path opens, if it is one of the app's own. A path under a page's own (a record of it, as
// /administration/students/12) belongs to that page, so it gets the same access rule.
export const getPageKey = (pathname: string): PageKey | undefined => {
  const exact = pageKeyByPath.get(pathname)
  if (exact) return exact

  let parent = pathname
  while (parent.lastIndexOf("/") > 0) {
    parent = parent.slice(0, parent.lastIndexOf("/"))
    const key = pageKeyByPath.get(parent)
    if (key) return key
  }

  return undefined
}
