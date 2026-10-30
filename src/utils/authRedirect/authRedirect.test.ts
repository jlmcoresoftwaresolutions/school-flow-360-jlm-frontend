import { describe, expect, it } from "vitest"

import { buildLoginUrl, getSafeRedirectPath } from "./authRedirect"

describe("getSafeRedirectPath", () => {
  it.each(["/administration/my-unit", "/administration/my-unit?tab=2#branding", "/"])("keeps %s", (path) => {
    expect(getSafeRedirectPath(path)).toBe(path)
  })

  it.each([
    "https://other.site/login",
    "//other.site",
    "/\\other.site",
    "javascript:alert(1)",
    "administration/my-unit",
    "",
    null,
    undefined,
  ])("drops %s", (value) => {
    expect(getSafeRedirectPath(value)).toBeNull()
  })
})

describe("buildLoginUrl", () => {
  it("is the plain login path with no options", () => {
    expect(buildLoginUrl("/login")).toBe("/login")
  })

  it("carries the page to return to", () => {
    expect(buildLoginUrl("/login", { from: "/administration/my-unit?tab=2" })).toBe(
      "/login?redirect=%2Fadministration%2Fmy-unit%3Ftab%3D2",
    )
  })

  it("flags an expired session", () => {
    expect(buildLoginUrl("/login", { from: "/administration/my-unit", sessionExpired: true })).toBe(
      "/login?redirect=%2Fadministration%2Fmy-unit&expired=1",
    )
  })

  it("leaves out a return to the root, the login itself or another site", () => {
    expect(buildLoginUrl("/login", { from: "/" })).toBe("/login")
    expect(buildLoginUrl("/login", { from: "/login?expired=1" })).toBe("/login")
    expect(buildLoginUrl("/login", { from: "//other.site", sessionExpired: true })).toBe("/login?expired=1")
  })
})
