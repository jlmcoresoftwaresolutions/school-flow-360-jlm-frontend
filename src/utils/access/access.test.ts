import { describe, expect, it } from "vitest"

import type { RoleCode, UserContext } from "@/models"

import { canOpenPage, getDisplayRoles, getGrantableRoles, hasAnyRole, roleOrder } from "./access"

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

describe("getGrantableRoles", () => {
  it("lets an Admin grant every role", () => {
    expect(getGrantableRoles(withRoles(["ADMIN"]))).toEqual(roleOrder)
  })

  it("lets a Secretaria grant every role but Admin", () => {
    expect(getGrantableRoles(withRoles(["SECRETARIA"]))).toEqual([
      "SECRETARIA",
      "FINANCEIRO",
      "COORDENACAO",
      "PROFESSOR",
      "RESPONSAVEL",
      "ALUNO",
    ])
  })

  it("lets nobody else grant anything", () => {
    expect(getGrantableRoles(withRoles(["PROFESSOR"]))).toEqual([])
    expect(getGrantableRoles(null)).toEqual([])
  })
})
