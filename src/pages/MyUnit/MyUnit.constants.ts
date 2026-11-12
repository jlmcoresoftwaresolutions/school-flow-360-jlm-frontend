import { spacing } from "@/foundation"

export const myUnitTabs = ["overview", "branding", "units"] as const

export type MyUnitTab = (typeof myUnitTabs)[number]

export const unitsPageSize = 10

// How many units the overview's summary lists before "see all".
export const unitsSummaryLimit = 4

// The backend's limits for the organization's fields.
export const displayNameMaxLength = 100

export const institutionalNameMaxLength = 60

export const contactEmailMaxLength = 50

// The organization's internal note and a unit's notes.
export const notesMaxLength = 2000

// The backend's limits for a unit's fields.
export const unitNameMaxLength = 100

export const unitEmailMaxLength = 255

export const inactivationReasonMaxLength = 500

// The address fields' limits, the same on the backend for the organization's and a unit's.
export const addressMaxLengths = {
  city: 80,
  complement: 100,
  district: 80,
  number: 10,
  street: 150,
}

// The height of the open UF menu: about five states, the rest scrolling, so the long list doesn't run
// far below the field.
export const stateMenuMaxHeight = Number.parseFloat(spacing[192])

// What the backend accepts as an address number: letters, digits, / . - and space ("123A", "s/n").
export const addressNumberPattern = /^[0-9A-Za-z/ .-]*$/

// The backend's limits for the logo: PNG or JPEG, up to 2 MB, 64 to 2048 px a side, at most 4:1.
export const logoRules = {
  extensions: [".png", ".jpg", ".jpeg"],
  maxAspectRatio: 4,
  maxBytes: 2 * 1024 * 1024,
  maxSide: 2048,
  mimeTypes: ["image/png", "image/jpeg"],
  minSide: 64,
}

// The backend's limits for the favicon: PNG or JPEG, up to 512 KB, square, 16 to 512 px a side.
export const faviconRules = {
  extensions: [".png", ".jpg", ".jpeg"],
  maxAspectRatio: 1,
  maxBytes: 512 * 1024,
  maxSide: 512,
  mimeTypes: ["image/png", "image/jpeg"],
  minSide: 16,
}
