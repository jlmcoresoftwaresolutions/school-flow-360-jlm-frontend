import { describe, expect, it } from "vitest"

import { formatCents, parseCents } from "./money"

describe("formatCents", () => {
  it("shows cents as the currency of the language", () => {
    expect(formatCents(123456, "pt-BR").replace(/\s/g, " ")).toBe("R$ 1.234,56")
    expect(formatCents(5, "pt-BR").replace(/\s/g, " ")).toBe("R$ 0,05")
  })

  it("follows the language's separators", () => {
    expect(formatCents(123456, "en", "BRL")).toBe("R$1,234.56")
  })
})

describe("parseCents", () => {
  it("reads the decimal separator of either convention", () => {
    expect(parseCents("1.234,56")).toBe(123456)
    expect(parseCents("1,234.56")).toBe(123456)
    expect(parseCents("1234.5")).toBe(123450)
    expect(parseCents("R$ 12")).toBe(1200)
  })

  it("refuses what isn't an amount", () => {
    expect(parseCents("")).toBeNull()
    expect(parseCents("abc")).toBeNull()
  })
})
