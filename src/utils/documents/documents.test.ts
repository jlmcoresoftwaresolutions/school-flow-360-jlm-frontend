import { describe, expect, it } from "vitest"

import { isValidCpf } from "./documents"

describe("isValidCpf", () => {
  it("accepts a CPF whose check digits match, formatted or not", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true)
    expect(isValidCpf("52998224725")).toBe(true)
    expect(isValidCpf("111.444.777-35")).toBe(true)
  })

  it("refuses a CPF whose check digits don't match", () => {
    expect(isValidCpf("529.982.247-24")).toBe(false)
    expect(isValidCpf("111.444.777-53")).toBe(false)
  })

  it("refuses a CPF without 11 digits", () => {
    expect(isValidCpf("529.982.247")).toBe(false)
    expect(isValidCpf("")).toBe(false)
    expect(isValidCpf("529.982.247-255")).toBe(false)
  })

  it("refuses eleven equal digits, which pass the arithmetic but aren't real", () => {
    expect(isValidCpf("000.000.000-00")).toBe(false)
    expect(isValidCpf("111.111.111-11")).toBe(false)
  })
})
