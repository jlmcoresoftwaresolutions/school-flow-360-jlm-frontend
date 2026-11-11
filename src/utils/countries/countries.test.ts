import { describe, expect, it } from "vitest"

import { defaultCountry, getCountryName, getCountryOptions, isCountry, toCountry } from "./countries"

describe("isCountry", () => {
  it("tells an ISO 3166-1 alpha-2 code apart from anything else", () => {
    expect(isCountry("BR")).toBe(true)
    expect(isCountry("PT")).toBe(true)
    expect(isCountry("br")).toBe(false)
    expect(isCountry("Brasil")).toBe(false)
    expect(isCountry("ZZ")).toBe(false)
  })
})

describe("getCountryName", () => {
  it("names a country in the language asked", () => {
    expect(getCountryName("BR", "pt-BR")).toBe("Brasil")
    expect(getCountryName("BR", "en")).toBe("Brazil")
    expect(getCountryName("DE", "pt-BR")).toBe("Alemanha")
  })
})

describe("getCountryOptions", () => {
  it("lists every country by name, in the language's alphabetical order", () => {
    const options = getCountryOptions("pt-BR")
    const labels = options.map((option) => option.label)

    expect(options.length).toBeGreaterThan(200)
    expect(options).toContainEqual({ label: "Brasil", value: "BR" })
    expect(labels).toEqual([...labels].sort((first, second) => first.localeCompare(second, "pt-BR")))
  })
})

describe("toCountry", () => {
  it("reads a code, in any case", () => {
    expect(toCountry("BR")).toBe("BR")
    expect(toCountry(" pt ")).toBe("PT")
  })

  it("reads a name in one of the app's languages, ignoring case and accents", () => {
    expect(toCountry("Brasil")).toBe("BR")
    expect(toCountry("brazil")).toBe("BR")
    expect(toCountry("Alemanha")).toBe("DE")
    expect(toCountry("Mexico")).toBe("MX")
    expect(toCountry("Estados Unidos")).toBe("US")
  })

  it("gives undefined for what it can't recognize", () => {
    expect(toCountry("")).toBeUndefined()
    expect(toCountry("Terra do Nunca")).toBeUndefined()
  })
})

describe("defaultCountry", () => {
  it("is Brazil", () => {
    expect(defaultCountry).toBe("BR")
  })
})
