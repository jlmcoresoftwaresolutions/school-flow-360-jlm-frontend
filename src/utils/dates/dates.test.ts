import { describe, expect, it } from "vitest"

import { formatDate } from "./dates"

describe("formatDate", () => {
  it("formats a date-only ISO string by default (no time)", () => {
    expect(formatDate("2026-07-04")).toBe("04/07/2026")
  })

  it("formats a date-only ISO string with withTime explicitly false", () => {
    expect(formatDate("2026-07-04", { withTime: false })).toBe("04/07/2026")
  })

  it("shows 00:00 when withTime is true but the input has no time component", () => {
    expect(formatDate("2026-07-04", { withTime: true })).toBe("04/07/2026 00:00")
  })

  it("pads single-digit day/month correctly", () => {
    expect(formatDate("2026-01-05")).toBe("05/01/2026")
  })

  it("ignores the time component of a full ISO datetime by default", () => {
    expect(formatDate("2026-07-04T14:30:00.000Z")).toBe("04/07/2026")
  })

  it("includes the time from a full ISO datetime with a Z suffix when withTime is true", () => {
    expect(formatDate("2026-07-04T14:30:00.000Z", { withTime: true })).toBe("04/07/2026 14:30")
  })

  it("includes the time from a full ISO datetime without a timezone suffix when withTime is true", () => {
    expect(formatDate("2026-07-04T09:05:00", { withTime: true })).toBe("04/07/2026 09:05")
  })

  it("throws for a string that isn't a valid ISO date", () => {
    expect(() => formatDate("not-a-date")).toThrow('formatDate: "not-a-date" is not a valid ISO date string')
  })
})
