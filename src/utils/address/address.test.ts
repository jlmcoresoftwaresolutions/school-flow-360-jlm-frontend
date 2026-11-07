import { describe, expect, it } from "vitest"

import type { Address } from "@/models"

import { brazilianStates, emptyAddress, formatAddress, formatCityState } from "./address"

const fullAddress: Address = {
  cep: "60150-161",
  city: "Fortaleza",
  complement: "Bloco B",
  district: "Aldeota",
  number: "1500",
  state: "CE",
  street: "Avenida Santos Dumont",
}

describe("formatAddress", () => {
  it("puts a full address on one line", () => {
    expect(formatAddress(fullAddress)).toBe(
      "Avenida Santos Dumont, 1500, Bloco B - Aldeota, Fortaleza/CE - CEP 60150-161",
    )
  })

  it("skips the parts that are missing", () => {
    expect(formatAddress({ ...fullAddress, cep: "", complement: "", district: "" })).toBe(
      "Avenida Santos Dumont, 1500 - Fortaleza/CE",
    )
  })

  it("gives an empty string for an empty address", () => {
    expect(formatAddress(emptyAddress)).toBe("")
  })
})

describe("formatCityState", () => {
  it("joins the city and the state", () => {
    expect(formatCityState(fullAddress)).toBe("Fortaleza/CE")
  })

  it("gives whichever of the two exists", () => {
    expect(formatCityState({ ...fullAddress, state: "" })).toBe("Fortaleza")
    expect(formatCityState(emptyAddress)).toBe("")
  })
})

describe("brazilianStates", () => {
  it("lists the 27 states in alphabetical order", () => {
    expect(brazilianStates).toHaveLength(27)
    expect([...brazilianStates].sort()).toEqual([...brazilianStates])
  })
})
