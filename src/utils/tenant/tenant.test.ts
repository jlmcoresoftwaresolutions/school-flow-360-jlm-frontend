import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getSchoolAddress, getTenantDomain, getTenantId } from "./tenant"

describe("getTenantId", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_TENANT_DOMAIN", "schoolflow360.com.br")
    vi.stubEnv("VITE_TENANT_ID", "")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("reads the school from the first part of its address, with - turned into _", () => {
    expect(getTenantId("colegio-saber.schoolflow360.com.br")).toBe("colegio_saber")
    expect(getTenantId("escola-municipal-pedro-ii.schoolflow360.com.br")).toBe("escola_municipal_pedro_ii")
    expect(getTenantId("schoolflow-demo.schoolflow360.com.br")).toBe("schoolflow_demo")
  })

  it("ignores letter case", () => {
    expect(getTenantId("Colegio-Saber.SchoolFlow360.com.br")).toBe("colegio_saber")
  })

  it("serves no school on the domain itself nor on a reserved name", () => {
    expect(getTenantId("schoolflow360.com.br")).toBeNull()
    expect(getTenantId("www.schoolflow360.com.br")).toBeNull()
    expect(getTenantId("app.schoolflow360.com.br")).toBeNull()
    expect(getTenantId("api.schoolflow360.com.br")).toBeNull()
  })

  it("serves no school on a name the backend would refuse, nor on more than one level", () => {
    expect(getTenantId("colégio.schoolflow360.com.br")).toBeNull()
    expect(getTenantId(`${"a".repeat(64)}.schoolflow360.com.br`)).toBeNull()
    expect(getTenantId("a.colegio-saber.schoolflow360.com.br")).toBeNull()
  })

  it("never takes the fixed tenant on an address under the domain", () => {
    vi.stubEnv("VITE_TENANT_ID", "schoolflow_demo")

    expect(getTenantId("schoolflow360.com.br")).toBeNull()
    expect(getTenantId("colegio-saber.schoolflow360.com.br")).toBe("colegio_saber")
  })

  it("serves the fixed tenant on any other address, when one is set (development)", () => {
    vi.stubEnv("VITE_TENANT_ID", "  schoolflow_demo ")

    expect(getTenantId("localhost")).toBe("schoolflow_demo")
    expect(getTenantId("school-flow-360-i2m0.onrender.com")).toBe("schoolflow_demo")
  })

  it("serves no school on any other address when no fixed tenant is set (production)", () => {
    expect(getTenantId("localhost")).toBeNull()
    expect(getTenantId("school-flow-360-i2m0.onrender.com")).toBeNull()
  })

  it("doesn't take an address that only ends like the domain", () => {
    expect(getTenantId("colegio-saber.notschoolflow360.com.br")).toBeNull()
  })

  it("reads the current address by default", () => {
    vi.stubEnv("VITE_TENANT_ID", "schoolflow_demo")

    expect(getTenantId()).toBe("schoolflow_demo")
  })
})

describe("getTenantDomain", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("gives the platform's domain, lowercase and without surrounding dots", () => {
    vi.stubEnv("VITE_TENANT_DOMAIN", " .SchoolFlow360.com.br. ")

    expect(getTenantDomain()).toBe("schoolflow360.com.br")
  })

  it("is null when no domain is set", () => {
    vi.stubEnv("VITE_TENANT_DOMAIN", "")

    expect(getTenantDomain()).toBeNull()
  })
})

describe("getSchoolAddress", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_TENANT_DOMAIN", "schoolflow360.com.br")
    vi.stubEnv("VITE_TENANT_ID", "")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("sends an address that serves no school to the school's own", () => {
    expect(getSchoolAddress("colegio_saber", "/login", "school-flow-360-i2m0.onrender.com")).toBe(
      "https://colegio-saber.schoolflow360.com.br/login",
    )
    expect(getSchoolAddress("colegio_saber", "/login", "schoolflow360.com.br")).toBe(
      "https://colegio-saber.schoolflow360.com.br/login",
    )
  })

  it("sends another school's address to the school's own", () => {
    expect(getSchoolAddress("colegio_saber", "/forgot-password", "escola-aurora.schoolflow360.com.br")).toBe(
      "https://colegio-saber.schoolflow360.com.br/forgot-password",
    )
  })

  it("stays on the school's own address", () => {
    expect(getSchoolAddress("colegio_saber", "/login", "colegio-saber.schoolflow360.com.br")).toBeNull()
  })

  it("stays on an address outside the platform that serves a school (development)", () => {
    vi.stubEnv("VITE_TENANT_ID", "schoolflow_demo")

    expect(getSchoolAddress("colegio_saber", "/login", "localhost")).toBeNull()
  })

  it("stays put without a domain or with a tenant the backend would refuse", () => {
    expect(getSchoolAddress("Colégio", "/login", "school-flow-360-i2m0.onrender.com")).toBeNull()
    vi.stubEnv("VITE_TENANT_DOMAIN", "")
    expect(getSchoolAddress("colegio_saber", "/login", "school-flow-360-i2m0.onrender.com")).toBeNull()
  })
})
