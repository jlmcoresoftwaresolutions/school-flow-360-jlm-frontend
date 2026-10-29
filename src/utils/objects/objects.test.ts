import { describe, expect, it } from "vitest"

import { isShallowEqual } from "./objects"

describe("isShallowEqual", () => {
  it("is true for the same values under the same keys", () => {
    expect(isShallowEqual({ name: "Escola", status: "ATIVA" }, { name: "Escola", status: "ATIVA" })).toBe(true)
  })

  it("is false when a value changed", () => {
    expect(isShallowEqual({ name: "Escola" }, { name: "Escola Nova" })).toBe(false)
  })

  it("is false when a key is missing on either side", () => {
    expect(isShallowEqual<Record<string, string>>({ name: "Escola" }, { name: "Escola", phone: "" })).toBe(false)
    expect(isShallowEqual<Record<string, string>>({ name: "Escola", phone: "" }, { name: "Escola" })).toBe(false)
  })

  it("compares nested values by reference", () => {
    const branding = { primaryColor: "#000" }

    expect(isShallowEqual({ branding }, { branding })).toBe(true)
    expect(isShallowEqual({ branding }, { branding: { primaryColor: "#000" } })).toBe(false)
  })
})
