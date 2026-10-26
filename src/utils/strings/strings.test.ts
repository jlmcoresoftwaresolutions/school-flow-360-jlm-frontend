import { describe, expect, it } from "vitest"

import { getInitials, joinIds } from "./strings"

describe("joinIds", () => {
  it("joins the ids with spaces", () => {
    expect(joinIds("a", "b")).toBe("a b")
  })

  it("skips missing ids", () => {
    expect(joinIds(undefined, "a", false, null, "", "b")).toBe("a b")
  })

  it("returns undefined when there is nothing to join", () => {
    expect(joinIds(undefined, false)).toBeUndefined()
  })
})

describe("getInitials", () => {
  it("uses the first letter of the first and last words", () => {
    expect(getInitials("Maria da Silva")).toBe("MS")
  })

  it("gives a single letter for a single-word name", () => {
    expect(getInitials("Maria")).toBe("M")
  })

  it("uppercases the letters", () => {
    expect(getInitials("ana souza")).toBe("AS")
  })

  it("ignores extra whitespace around and between words", () => {
    expect(getInitials("  João   Pedro  ")).toBe("JP")
  })

  it("returns an empty string for a blank name", () => {
    expect(getInitials("   ")).toBe("")
  })
})
