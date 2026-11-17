import type { RoleCode } from "../users/users"

// How a role reaches a matrix row: SIM (the screen opens), ADM (administers), OP (operates), APR
// (approves), VIEW (reads), SELF and SELF/OP (only the own or linked objects), COND (only when the policy
// enables it), AUTH (the sign-in flow) and BLOQ (blocked: the entry isn't even shown).
export type AccessLevel = "ADM" | "APR" | "AUTH" | "BLOQ" | "COND" | "OP" | "SELF" | "SELF/OP" | "SIM" | "VIEW"

export type AccessMatrixKind = "ACESSO" | "AÇÃO" | "APROVAÇÃO" | "CONSULTA"

// One line of the responsibilities matrix: a screen (`screenId`, e.g. ACC-M01) and what can be done in
// it, per role. `description` joins the module, the screen, the kind and the fields in one text.
export type AccessMatrixRow = {
  access: Record<RoleCode, AccessLevel>
  description: string
  id: string
  kind: AccessMatrixKind
  module: string
  rule: string | null
  screenId: string
}

// What the backend already enforces, by capability code (e.g. INVITE_USER), and for whom.
export type AccessCapability = {
  code: string
  roles: RoleCode[]
  scope: string
}

// GET /api/access-matrix (Admin and Secretaria) and GET /api/me/capabilities (anyone: only the rows of
// the own roles): the responsibilities matrix v2.0, read-only. Reading it grants nothing.
export type AccessMatrix = {
  capabilities: AccessCapability[]
  legend: Record<string, string>
  modules: string[]
  published: boolean
  roles: RoleCode[]
  rows: AccessMatrixRow[]
  version: string
}

// GET /api/access-matrix's optional filters: rows a role has access to, of a module (e.g. P05), of a
// kind, or containing a text.
export type AccessMatrixSearchParams = {
  kind?: AccessMatrixKind
  module?: string
  q?: string
  role?: RoleCode
}
