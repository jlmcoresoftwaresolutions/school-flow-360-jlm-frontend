import { afterEach, describe, expect, it, vi } from "vitest"

import { getTenantId } from "./tenant"

describe("getTenantId", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("reads the tenant from VITE_TENANT_ID", () => {
    vi.stubEnv("VITE_TENANT_ID", "schoolflow_demo")

    expect(getTenantId()).toBe("schoolflow_demo")
  })

  it("ignores surrounding whitespace", () => {
    vi.stubEnv("VITE_TENANT_ID", "  schoolflow_demo ")

    expect(getTenantId()).toBe("schoolflow_demo")
  })

  it("returns null when no tenant is configured", () => {
    vi.stubEnv("VITE_TENANT_ID", "")

    expect(getTenantId()).toBeNull()
  })
})
