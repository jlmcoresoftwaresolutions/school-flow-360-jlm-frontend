import { describe, expect, it } from "vitest"

import {
  formatCep,
  formatCnpj,
  formatCpf,
  formatCreditCard,
  formatCurrency,
  formatExpiry,
  formatPhone,
} from "./formats"

describe("formatCep", () => {
  it("formats progressively as digits come in", () => {
    expect(formatCep("1")).toBe("1")
    expect(formatCep("12345")).toBe("12345")
    expect(formatCep("12345678")).toBe("12345-678")
  })

  it("ignores non-digit characters and truncates beyond 8 digits", () => {
    expect(formatCep("12345-678")).toBe("12345-678")
    expect(formatCep("1234567800000")).toBe("12345-678")
  })
})

describe("formatCpf", () => {
  it("formats progressively as digits come in", () => {
    expect(formatCpf("1")).toBe("1")
    expect(formatCpf("111")).toBe("111")
    expect(formatCpf("111444")).toBe("111.444")
    expect(formatCpf("111444777")).toBe("111.444.777")
    expect(formatCpf("11144477735")).toBe("111.444.777-35")
  })

  it("ignores non-digit characters and truncates beyond 11 digits", () => {
    expect(formatCpf("111.444.777-35")).toBe("111.444.777-35")
    expect(formatCpf("111444777350000")).toBe("111.444.777-35")
  })
})

describe("formatCnpj", () => {
  it("formats progressively as digits come in", () => {
    expect(formatCnpj("11")).toBe("11")
    expect(formatCnpj("11222")).toBe("11.222")
    expect(formatCnpj("11222333")).toBe("11.222.333")
    expect(formatCnpj("112223330001")).toBe("11.222.333/0001")
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81")
  })

  it("ignores non-digit characters and truncates beyond 14 digits", () => {
    expect(formatCnpj("11.222.333/0001-81")).toBe("11.222.333/0001-81")
    expect(formatCnpj("1122233300018199")).toBe("11.222.333/0001-81")
  })
})

describe("formatPhone", () => {
  it("formats a landline number (10 digits) with a 4-digit local split", () => {
    expect(formatPhone("1")).toBe("(1")
    expect(formatPhone("11")).toBe("(11")
    expect(formatPhone("1134")).toBe("(11) 34")
    expect(formatPhone("1134567890")).toBe("(11) 3456-7890")
  })

  it("formats a mobile number (11 digits) with a 5-digit local split", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321")
  })

  it("ignores non-digit characters and truncates beyond 11 digits", () => {
    expect(formatPhone("(11) 98765-4321")).toBe("(11) 98765-4321")
    expect(formatPhone("119876543210000")).toBe("(11) 98765-4321")
  })
})

describe("formatCreditCard", () => {
  it("splits into groups of 4 as digits come in", () => {
    expect(formatCreditCard("1")).toBe("1")
    expect(formatCreditCard("1234")).toBe("1234")
    expect(formatCreditCard("12345")).toBe("1234 5")
    expect(formatCreditCard("1234567890123456")).toBe("1234 5678 9012 3456")
  })

  it("ignores non-digit characters and truncates beyond 16 digits", () => {
    expect(formatCreditCard("1234 5678 9012 3456")).toBe("1234 5678 9012 3456")
    expect(formatCreditCard("12345678901234567890")).toBe("1234 5678 9012 3456")
  })
})

describe("formatExpiry", () => {
  it("formats a card expiry date (MM/AA) progressively as digits come in", () => {
    expect(formatExpiry("1")).toBe("1")
    expect(formatExpiry("12")).toBe("12")
    expect(formatExpiry("1228")).toBe("12/28")
  })

  it("ignores non-digit characters and truncates beyond 4 digits", () => {
    expect(formatExpiry("12/28")).toBe("12/28")
    expect(formatExpiry("12289999")).toBe("12/28")
  })
})

describe("formatCurrency", () => {
  it("formats a BRL amount, growing from the right as cents while digits come in", () => {
    expect(formatCurrency("")).toBe("R$ 0,00")
    expect(formatCurrency("5")).toBe("R$ 0,05")
    expect(formatCurrency("50")).toBe("R$ 0,50")
    expect(formatCurrency("500")).toBe("R$ 5,00")
    expect(formatCurrency("1234")).toBe("R$ 12,34")
  })

  it("inserts thousands separators for larger values", () => {
    expect(formatCurrency("1234567")).toBe("R$ 12.345,67")
    expect(formatCurrency("1234567890")).toBe("R$ 12.345.678,90")
  })

  it("ignores non-digit characters and leading zeros", () => {
    expect(formatCurrency("R$ 12.345,67")).toBe("R$ 12.345,67")
    expect(formatCurrency("00050")).toBe("R$ 0,50")
  })

  it("does not truncate, unlike the fixed-length formats", () => {
    expect(formatCurrency("123456789012")).toBe("R$ 1.234.567.890,12")
  })
})
