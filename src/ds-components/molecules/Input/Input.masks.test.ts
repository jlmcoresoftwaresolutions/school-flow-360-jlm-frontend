import { describe, expect, it } from "vitest"

import { applyMask } from "./Input.masks"

describe("applyMask", () => {
  it("masks a CEP progressively as digits are typed", () => {
    expect(applyMask("cep", "1")).toBe("1")
    expect(applyMask("cep", "12345")).toBe("12345")
    expect(applyMask("cep", "12345678")).toBe("12345-678")
  })

  it("ignores non-digit characters and truncates a CEP beyond 8 digits", () => {
    expect(applyMask("cep", "12345-678")).toBe("12345-678")
    expect(applyMask("cep", "1234567800000")).toBe("12345-678")
  })

  it("masks a CPF progressively as digits are typed", () => {
    expect(applyMask("cpf", "1")).toBe("1")
    expect(applyMask("cpf", "111")).toBe("111")
    expect(applyMask("cpf", "111444")).toBe("111.444")
    expect(applyMask("cpf", "111444777")).toBe("111.444.777")
    expect(applyMask("cpf", "11144477735")).toBe("111.444.777-35")
  })

  it("ignores non-digit characters and truncates a CPF beyond 11 digits", () => {
    expect(applyMask("cpf", "111.444.777-35")).toBe("111.444.777-35")
    expect(applyMask("cpf", "111444777350000")).toBe("111.444.777-35")
  })

  it("masks a CNPJ progressively as digits are typed", () => {
    expect(applyMask("cnpj", "11")).toBe("11")
    expect(applyMask("cnpj", "11222")).toBe("11.222")
    expect(applyMask("cnpj", "11222333")).toBe("11.222.333")
    expect(applyMask("cnpj", "112223330001")).toBe("11.222.333/0001")
    expect(applyMask("cnpj", "11222333000181")).toBe("11.222.333/0001-81")
  })

  it("ignores non-digit characters and truncates a CNPJ beyond 14 digits", () => {
    expect(applyMask("cnpj", "11.222.333/0001-81")).toBe("11.222.333/0001-81")
    expect(applyMask("cnpj", "1122233300018199")).toBe("11.222.333/0001-81")
  })

  it("masks a landline phone number (10 digits) with a 4-digit local split", () => {
    expect(applyMask("phone", "1")).toBe("(1")
    expect(applyMask("phone", "11")).toBe("(11")
    expect(applyMask("phone", "1134")).toBe("(11) 34")
    expect(applyMask("phone", "1134567890")).toBe("(11) 3456-7890")
  })

  it("masks a mobile phone number (11 digits) with a 5-digit local split", () => {
    expect(applyMask("phone", "11987654321")).toBe("(11) 98765-4321")
  })

  it("truncates a phone number beyond 11 digits", () => {
    expect(applyMask("phone", "119876543210000")).toBe("(11) 98765-4321")
  })

  it("masks a credit card number in groups of 4 as digits are typed", () => {
    expect(applyMask("creditCard", "1")).toBe("1")
    expect(applyMask("creditCard", "1234")).toBe("1234")
    expect(applyMask("creditCard", "12345")).toBe("1234 5")
    expect(applyMask("creditCard", "1234567890123456")).toBe("1234 5678 9012 3456")
  })

  it("ignores non-digit characters and truncates a credit card number beyond 16 digits", () => {
    expect(applyMask("creditCard", "1234 5678 9012 3456")).toBe("1234 5678 9012 3456")
    expect(applyMask("creditCard", "12345678901234567890")).toBe("1234 5678 9012 3456")
  })

  it("masks a card expiry date (MM/AA) progressively as digits are typed", () => {
    expect(applyMask("expiry", "1")).toBe("1")
    expect(applyMask("expiry", "12")).toBe("12")
    expect(applyMask("expiry", "1228")).toBe("12/28")
  })

  it("ignores non-digit characters and truncates an expiry date beyond 4 digits", () => {
    expect(applyMask("expiry", "12/28")).toBe("12/28")
    expect(applyMask("expiry", "12289999")).toBe("12/28")
  })

  it("masks a BRL currency value, growing from the right as cents while digits are typed", () => {
    expect(applyMask("currency", "")).toBe("R$ 0,00")
    expect(applyMask("currency", "5")).toBe("R$ 0,05")
    expect(applyMask("currency", "50")).toBe("R$ 0,50")
    expect(applyMask("currency", "500")).toBe("R$ 5,00")
    expect(applyMask("currency", "1234")).toBe("R$ 12,34")
  })

  it("inserts thousands separators for larger currency values", () => {
    expect(applyMask("currency", "1234567")).toBe("R$ 12.345,67")
    expect(applyMask("currency", "1234567890")).toBe("R$ 12.345.678,90")
  })

  it("ignores non-digit characters and leading zeros in a currency value", () => {
    expect(applyMask("currency", "R$ 12.345,67")).toBe("R$ 12.345,67")
    expect(applyMask("currency", "00050")).toBe("R$ 0,50")
  })

  it("does not truncate a currency value, unlike the fixed-length masks", () => {
    expect(applyMask("currency", "123456789012")).toBe("R$ 1.234.567.890,12")
  })
})
