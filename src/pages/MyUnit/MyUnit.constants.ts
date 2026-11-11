export const myUnitTabs = ["overview", "branding", "units"] as const

export type MyUnitTab = (typeof myUnitTabs)[number]

export const unitsPageSize = 10

// How many units the overview's summary lists before "see all".
export const unitsSummaryLimit = 4

export const notesMaxLength = 500

// The backend's limits for the organization's fields.
export const displayNameMaxLength = 100

export const institutionalNameMaxLength = 60

export const contactEmailMaxLength = 50

export const organizationNotesMaxLength = 2000

// The address fields' limits (the organization's on the backend; a unit's whole address fits in its
// 500 characters with them too).
export const addressMaxLengths = {
  city: 80,
  complement: 100,
  district: 80,
  number: 10,
  street: 150,
}

// What the backend accepts as an address number: letters, digits, / . - and space ("123A", "s/n").
export const addressNumberPattern = /^[0-9A-Za-z/ .-]*$/

// The visual spec's limits for the identity files.
export const logoRules = {
  extensions: [".png", ".jpg", ".jpeg", ".svg"],
  maxBytes: 2 * 1024 * 1024,
  mimeTypes: ["image/png", "image/jpeg", "image/svg+xml"],
}

export const faviconRules = {
  extensions: [".ico", ".png", ".svg"],
  maxBytes: 1024 * 1024,
  mimeTypes: ["image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/svg+xml"],
}
