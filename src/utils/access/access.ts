import type { RoleCode, UserContext } from "@/models"

// The roles in the order they are shown: the widest reach first.
export const roleOrder: RoleCode[] = [
  "ADMIN",
  "SECRETARIA",
  "FINANCEIRO",
  "COORDENACAO",
  "PROFESSOR",
  "RESPONSAVEL",
  "ALUNO",
]

// Whether the signed-in user holds one of `allowed`. An Admin can do everything a Secretaria can (the
// backend's rule), so an Admin also passes where SECRETARIA does. Nobody passes without a context.
export const hasAnyRole = (context: UserContext | null, allowed: RoleCode[]): boolean => {
  if (!context) return false

  const roles = new Set<RoleCode>(context.roles)
  if (context.admin) roles.add("ADMIN")
  if (roles.has("ADMIN")) roles.add("SECRETARIA")

  return allowed.some((role) => roles.has(role))
}

// Whether a page restricted to `allowed` opens for the user; a page without a restriction opens for
// anyone signed in. Hiding a page is never the protection itself: the backend checks every call.
export const canOpenPage = (context: UserContext | null, allowed?: RoleCode[]): boolean =>
  allowed === undefined || hasAnyRole(context, allowed)

// The user's roles to show, widest first, each once. An Admin is shown only as Admin, since that role
// already includes the others it holds in the tenant.
export const getDisplayRoles = (context: UserContext | null): RoleCode[] => {
  if (!context) return []
  if (context.admin || context.roles.includes("ADMIN")) return ["ADMIN"]

  return roleOrder.filter((role) => context.roles.includes(role))
}

// The roles a Secretaria may grant, in its own active units: every role but Admin (the backend's
// access.secretaria.grantable, defined by product in JLM-139/199/129). It never changes its own
// assignments. The backend checks every grant anyway (403 ROLE_NOT_GRANTABLE).
export const secretariaGrantableRoles: RoleCode[] = roleOrder.filter((role) => role !== "ADMIN")

const isAdmin = (context: UserContext) => context.admin || context.roles.includes("ADMIN")

// The roles the signed-in user may grant in an invitation or a manual registration, widest first: an
// Admin any of them (Admin itself without a unit), a Secretaria every one but Admin, anyone else none.
export const getGrantableRoles = (context: UserContext | null): RoleCode[] => {
  if (!context) return []
  if (isAdmin(context)) return roleOrder
  if (context.roles.includes("SECRETARIA")) return secretariaGrantableRoles

  return []
}
