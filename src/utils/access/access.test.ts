import { describe, expect, it } from "vitest"

import type { Assignment, RoleCode, UserContext } from "@/models"

import { canOpenPage, getDisplayRoles, getGrantableRoles, getManagedUnits, hasAnyRole, roleOrder } from "./access"

const withRoles = (roles: RoleCode[], admin = roles.includes("ADMIN")): UserContext => ({
  admin,
  assignments: [],
  email: "pessoa@escola.com.br",
  fullName: "Pessoa",
  roles,
  userId: 1,
})

describe("hasAnyRole", () => {
  it("passes when the user holds one of the roles", () => {
    expect(hasAnyRole(withRoles(["PROFESSOR", "COORDENACAO"]), ["COORDENACAO"])).toBe(true)
    expect(hasAnyRole(withRoles(["PROFESSOR"]), ["SECRETARIA", "FINANCEIRO"])).toBe(false)
  })

  it("lets an Admin through wherever a Secretaria goes", () => {
    expect(hasAnyRole(withRoles(["ADMIN"]), ["SECRETARIA"])).toBe(true)
    expect(hasAnyRole(withRoles([], true), ["SECRETARIA"])).toBe(true)
  })

  it("doesn't let a Secretaria through where only an Admin goes", () => {
    expect(hasAnyRole(withRoles(["SECRETARIA"]), ["ADMIN"])).toBe(false)
  })

  it("lets nobody through without knowing who signed in", () => {
    expect(hasAnyRole(null, ["ADMIN", "SECRETARIA"])).toBe(false)
  })
})

describe("canOpenPage", () => {
  it("opens a page without a restriction for anyone, even without a context", () => {
    expect(canOpenPage(withRoles(["ALUNO"]))).toBe(true)
    expect(canOpenPage(null)).toBe(true)
  })

  it("opens a restricted page only for the roles it allows", () => {
    expect(canOpenPage(withRoles(["SECRETARIA"]), ["ADMIN", "SECRETARIA"])).toBe(true)
    expect(canOpenPage(withRoles(["RESPONSAVEL"]), ["ADMIN", "SECRETARIA"])).toBe(false)
    expect(canOpenPage(null, ["ADMIN"])).toBe(false)
  })
})

describe("getDisplayRoles", () => {
  it("lists the roles widest first, each once", () => {
    expect(getDisplayRoles(withRoles(["ALUNO", "PROFESSOR", "SECRETARIA"]))).toEqual([
      "SECRETARIA",
      "PROFESSOR",
      "ALUNO",
    ])
  })

  it("shows an Admin only as Admin", () => {
    expect(getDisplayRoles(withRoles(["SECRETARIA", "ADMIN"]))).toEqual(["ADMIN"])
  })

  it("shows nothing without a context", () => {
    expect(getDisplayRoles(null)).toEqual([])
  })
})

const assignment = (role: RoleCode, unitId: number | null, unitName: string | null, revoked = false): Assignment => ({
  assignmentId: unitId ?? 0,
  createdAt: "2026-11-01T10:00:00Z",
  origin: "INVITATION",
  role,
  status: revoked ? "REVOKED" : "ACTIVE",
  unitId,
  unitName,
})

describe("getGrantableRoles", () => {
  it("lets an Admin grant every role", () => {
    expect(getGrantableRoles(withRoles(["ADMIN"]))).toEqual(roleOrder)
  })

  it("lets a Secretaria grant only Professor, Responsável and Aluno", () => {
    expect(getGrantableRoles(withRoles(["SECRETARIA"]))).toEqual(["PROFESSOR", "RESPONSAVEL", "ALUNO"])
  })

  it("lets nobody else grant anything", () => {
    expect(getGrantableRoles(withRoles(["PROFESSOR"]))).toEqual([])
    expect(getGrantableRoles(null)).toEqual([])
  })
})

describe("getManagedUnits", () => {
  it("is the whole tenant (null) for an Admin", () => {
    expect(getManagedUnits(withRoles(["ADMIN"]))).toBeNull()
  })

  it("lists a Secretaria's active Secretaria units, each once, by name", () => {
    const context = {
      ...withRoles(["SECRETARIA", "PROFESSOR"]),
      assignments: [
        assignment("SECRETARIA", 2, "Unidade Norte"),
        assignment("PROFESSOR", 3, "Unidade Sul"),
        assignment("SECRETARIA", 1, "Unidade Centro"),
        assignment("SECRETARIA", 4, "Unidade Leste", true),
      ],
    }

    expect(getManagedUnits(context)).toEqual([
      { id: 1, name: "Unidade Centro" },
      { id: 2, name: "Unidade Norte" },
    ])
  })

  it("is empty without knowing who signed in", () => {
    expect(getManagedUnits(null)).toEqual([])
  })
})
