import { describe, expect, it } from "vitest"

import {
  formatPhoneForDisplay,
  formatPhoneInput,
  getPhoneCallingCode,
  isValidPhone,
  joinPhone,
  splitPhone,
  toInternationalPhone,
} from "./phone"

describe("formatPhoneInput", () => {
  it("formats a Brazilian number as it is typed", () => {
    expect(formatPhoneInput("85")).toBe("(85)")
    expect(formatPhoneInput("853")).toBe("(85) 3")
    expect(formatPhoneInput("8533331100")).toBe("(85) 3333-1100")
    expect(formatPhoneInput("85933331100")).toBe("(85) 93333-1100")
  })

  it("formats a number of another country, typed with + and its code", () => {
    expect(formatPhoneInput("+16502530000")).toBe("+1 650 253 0000")
    expect(formatPhoneInput("+351912345678")).toBe("+351 912 345 678")
  })

  it("lets a formatting character be erased, taking the digit before it", () => {
    expect(formatPhoneInput("(85", "(85)")).toBe("8")
    expect(formatPhoneInput("(85) 3333", "(85) 3333-")).toBe("(85) 333")
    expect(formatPhoneInput("", "(")).toBe("")
  })

  it("keeps an ordinary deletion of a digit", () => {
    expect(formatPhoneInput("(85) 3333-110", "(85) 3333-1100")).toBe("(85) 3333-110")
  })

  it("drops what is not part of a phone number", () => {
    expect(formatPhoneInput("abc")).toBe("")
  })
})

describe("isValidPhone", () => {
  it("accepts real Brazilian landlines and mobiles, with the area code", () => {
    expect(isValidPhone("(85) 3333-1100")).toBe(true)
    expect(isValidPhone("(85) 93333-1100")).toBe(true)
  })

  it("refuses a Brazilian number without the area code or of a wrong shape", () => {
    expect(isValidPhone("3333-1100")).toBe(false)
    expect(isValidPhone("(85) 3333-110")).toBe(false)
    expect(isValidPhone("(85) 83333-1100")).toBe(false)
  })

  it("accepts and checks numbers of other countries", () => {
    expect(isValidPhone("+1 650 253 0000")).toBe(true)
    expect(isValidPhone("+351 912 345 678")).toBe(true)
    expect(isValidPhone("+351 912 345 67")).toBe(false)
  })

  it("refuses an empty value", () => {
    expect(isValidPhone("")).toBe(false)
  })
})

describe("formatPhoneForDisplay", () => {
  it("shows a Brazilian number in the national format, however it was stored", () => {
    expect(formatPhoneForDisplay("8533331100")).toBe("(85) 3333-1100")
    expect(formatPhoneForDisplay("+55 85 3333 1100")).toBe("(85) 3333-1100")
  })

  it("shows a number of another country in the international format", () => {
    expect(formatPhoneForDisplay("+16502530000")).toBe("+1 650 253 0000")
  })

  it("shows what can't be read as a phone number as it is", () => {
    expect(formatPhoneForDisplay("ramal 12")).toBe("ramal 12")
    expect(formatPhoneForDisplay("")).toBe("")
  })
})

describe("toInternationalPhone", () => {
  it("saves any valid number in the international format", () => {
    expect(toInternationalPhone("(85) 3333-1100")).toBe("+55 85 3333 1100")
    expect(toInternationalPhone("+1 650 253 0000")).toBe("+1 650 253 0000")
  })

  it("keeps an empty value empty, and an unreadable one as it is", () => {
    expect(toInternationalPhone("")).toBe("")
    expect(toInternationalPhone("ramal 12")).toBe("ramal 12")
  })
})

describe("getPhoneCallingCode", () => {
  it("gives a country's calling code, without the plus sign", () => {
    expect(getPhoneCallingCode("BR")).toBe("55")
    expect(getPhoneCallingCode("PT")).toBe("351")
    expect(getPhoneCallingCode("US")).toBe("1")
  })
})

describe("splitPhone", () => {
  it("splits an international number into its country and national part", () => {
    expect(splitPhone("+55 85 3333 1100")).toEqual({ country: "BR", national: "(85) 3333-1100" })
    expect(splitPhone("+351 912 345 678")).toEqual({ country: "PT", national: "912 345 678" })
  })

  it("gives the fallback country and nothing typed for an empty value", () => {
    expect(splitPhone("")).toEqual({ country: "BR", national: "" })
    expect(splitPhone("", "PT")).toEqual({ country: "PT", national: "" })
  })

  it("reads a partial number by its calling code, preferring the fallback when it shares it", () => {
    expect(splitPhone("+55 85")).toEqual({ country: "BR", national: "85" })
    expect(splitPhone("+1 650", "CA").country).toBe("CA")
  })

  it("keeps a value it can't read as it is", () => {
    expect(splitPhone("ramal 12")).toEqual({ country: "BR", national: "ramal 12" })
  })
})

describe("joinPhone", () => {
  it("joins a country and a national part in the international format", () => {
    expect(joinPhone("(85) 3333-1100", "BR")).toBe("+55 85 3333 1100")
    expect(joinPhone("912 345 678", "PT")).toBe("+351 912 345 678")
  })

  it("drops the national trunk prefix", () => {
    expect(joinPhone("07911 123456", "GB")).toBe("+44 7911 123456")
  })

  it("keeps a partial number while it is being typed", () => {
    expect(joinPhone("(85", "BR")).toBe("+55 85")
  })

  it("is empty when there is no digit", () => {
    expect(joinPhone("", "BR")).toBe("")
    expect(joinPhone("()", "BR")).toBe("")
  })

  it("goes back and forth with splitPhone", () => {
    const { country, national } = splitPhone("+55 85 93333 1100")
    expect(joinPhone(national, country)).toBe("+55 85 93333 1100")
  })
})
