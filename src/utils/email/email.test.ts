import { describe, expect, it } from "vitest"

import { isValidEmail } from "./email"

describe("isValidEmail", () => {
  it("accepts common addresses", () => {
    expect(isValidEmail("contato@horizonte.edu.br")).toBe(true)
    expect(isValidEmail("secretaria.unidade+aldeota@horizonte.edu.br")).toBe(true)
    expect(isValidEmail("a@b.co")).toBe(true)
    expect(isValidEmail("o'neil_99@escola-nova.com")).toBe(true)
  })

  it("accepts accented characters, as the backend does", () => {
    expect(isValidEmail("joão@escola.com.br")).toBe(true)
    expect(isValidEmail("contato@colégio.com.br")).toBe(true)
  })

  it("refuses a dot at the start or end of the local part, or two in a row", () => {
    expect(isValidEmail(".a@x.com")).toBe(false)
    expect(isValidEmail("a.@x.com")).toBe(false)
    expect(isValidEmail("a..b@x.com")).toBe(false)
  })

  it("refuses characters the backend doesn't take", () => {
    expect(isValidEmail("a b@x.com")).toBe(false)
    expect(isValidEmail("a,b@x.com")).toBe(false)
    expect(isValidEmail("a@x,com")).toBe(false)
    expect(isValidEmail("a@b@x.com")).toBe(false)
  })

  it("refuses a malformed domain", () => {
    expect(isValidEmail("a@-x.com")).toBe(false)
    expect(isValidEmail("a@x-.com")).toBe(false)
    expect(isValidEmail("a@x..com")).toBe(false)
    expect(isValidEmail("a@.x.com")).toBe(false)
    expect(isValidEmail("a@x.com.")).toBe(false)
  })

  it("requires a dot in the domain, stricter than the backend", () => {
    expect(isValidEmail("contato@escola")).toBe(false)
  })

  it("refuses a missing local part or domain", () => {
    expect(isValidEmail("")).toBe(false)
    expect(isValidEmail("@x.com")).toBe(false)
    expect(isValidEmail("a@")).toBe(false)
    expect(isValidEmail("secretaria@horizonte")).toBe(false)
  })

  it("enforces the backend's length limits", () => {
    expect(isValidEmail(`${"a".repeat(64)}@x.com`)).toBe(true)
    expect(isValidEmail(`${"a".repeat(65)}@x.com`)).toBe(false)
    expect(isValidEmail(`a@${"b".repeat(63)}.com`)).toBe(true)
    expect(isValidEmail(`a@${"b".repeat(64)}.com`)).toBe(false)
  })
})
