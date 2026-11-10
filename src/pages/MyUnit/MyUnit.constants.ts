import type { OperationModel } from "@/models"

// Only the codes live here; their labels are copy, translated by the page (myUnit.operationModels).
export const operationModelValues = [
  "PRIVATE",
  "PUBLIC_MUNICIPAL",
  "PUBLIC_STATE",
  "PUBLIC_FEDERAL",
  "MIXED",
] as const satisfies readonly OperationModel[]

export const myUnitTabs = ["overview", "branding", "units"] as const

export type MyUnitTab = (typeof myUnitTabs)[number]

export const unitsPageSize = 10

// How many units the overview's summary lists before "see all".
export const unitsSummaryLimit = 4

export const notesMaxLength = 500

export const displayNameMaxLength = 80

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

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
