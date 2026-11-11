import type {
  ApiSchoolUnit,
  Organization,
  OrganizationBranding,
  OrganizationBrandingUpdate,
  OrganizationUpdate,
  SchoolUnit,
  SchoolUnitInactivation,
  SchoolUnitInput,
} from "@/models"
import { emptyAddress } from "@/utils/address"
import { startLoading, stopLoading } from "@/utils/loadingStore"

import type { RequestConfig } from "../httpClient"
import { searchSchoolUnits } from "../schoolUnits"
import { mockBranding, mockOrganization } from "./organization.mock"

// The page-facing layer of Minha Unidade: it answers in the frontend's shapes (models/organization).
// The API-shaped services, one function per backend endpoint, are organizations, schoolUnits, branding
// and the others beside this folder; the calls here are being moved onto them one at a time. Wired:
// listing the units (listSchoolUnits, through schoolUnits). Still MOCK: everything else answers from
// in-memory demo data (organization.mock.ts) with a simulated delay. The signatures are the final
// ones: wiring a call only changes its body (mapping the backend's field names), not the page.

// Copies, so a caller changing what it got never changes the "stored" data.
let organization = structuredClone(mockOrganization)
let branding = structuredClone(mockBranding)
// The units the mocked create/edit/inactivate work on: the real list, as last fetched, so those
// actions apply to the units on screen (locally only - lost on reload) until they are wired too.
let schoolUnits: SchoolUnit[] = []

const mockDelayMs = 600

// MOCK-ONLY test hook: the E2E suite sets this sessionStorage key to see the page's error state
// ("error" fails every mocked call). The wired calls never read it.
const mockScenarioKey = "sf360.mockScenario"

const readMockScenario = (): string | null => {
  try {
    return sessionStorage.getItem(mockScenarioKey)
  } catch {
    return null
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Behaves like an httpClient call: shows the global loading overlay unless showLoading is false,
// takes a moment, and fails in the "error" scenario.
const mockRequest = async <T>(answer: () => T, config?: RequestConfig): Promise<T> => {
  const showLoading = config?.showLoading !== false

  if (showLoading) startLoading()

  try {
    await wait(mockDelayMs)

    if (readMockScenario() === "error") throw new Error("Mock request failed")

    return structuredClone(answer())
  } finally {
    if (showLoading) stopLoading()
  }
}

// A data URL rather than an object URL, so it survives being copied and never needs revoking.
const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"))
    reader.readAsDataURL(file)
  })

export const getCurrentOrganization = (config?: RequestConfig): Promise<Organization> =>
  mockRequest(() => organization, config)

export const updateOrganization = (update: OrganizationUpdate, config?: RequestConfig): Promise<Organization> =>
  mockRequest(() => {
    organization = { ...organization, ...structuredClone(update) }
    return organization
  }, config)

export const getBranding = (config?: RequestConfig): Promise<OrganizationBranding> =>
  mockRequest(() => branding, config)

export const updateBranding = async (
  update: OrganizationBrandingUpdate,
  config?: RequestConfig,
): Promise<OrganizationBranding> => {
  const logoUrl = update.logo ? await readFileAsDataUrl(update.logo) : branding.logoUrl
  const faviconUrl = update.favicon ? await readFileAsDataUrl(update.favicon) : branding.faviconUrl

  return mockRequest(() => {
    branding = {
      displayName: update.displayName,
      faviconUrl,
      logoUrl,
      primaryColor: update.primaryColor,
      secondaryColor: update.secondaryColor,
    }
    return branding
  }, config)
}

// The backend's largest page: the whole list comes in as few requests as possible.
const unitsPageSize = 100

// The backend keeps the address as one free-text string; until we know its format, all of it goes in
// the street, so it is shown whole and nothing is guessed (the city stays empty).
const toSchoolUnit = (unit: ApiSchoolUnit): SchoolUnit => ({
  address: { ...emptyAddress, street: unit.address ?? "" },
  contactEmail: unit.contactEmail ?? "",
  contactPhone: unit.contactPhone ?? "",
  id: unit.schoolUnitId,
  name: unit.unitName,
  notes: "",
  status: unit.operationalStatus,
})

// Only the units the user may access (the backend applies that). The list is paged on the backend;
// every page is fetched, since the page searches, filters and pages the list on its own for now.
export const listSchoolUnits = async (config?: RequestConfig): Promise<SchoolUnit[]> => {
  const units: ApiSchoolUnit[] = []
  let page = 0
  let totalPages = 1

  while (page < totalPages) {
    const result = await searchSchoolUnits({ direction: "asc", page, size: unitsPageSize, sortBy: "unitName" }, config)

    units.push(...result.content)
    totalPages = result.totalPages
    page += 1
  }

  schoolUnits = units.map(toSchoolUnit)

  return structuredClone(schoolUnits)
}

export const createSchoolUnit = (input: SchoolUnitInput, config?: RequestConfig): Promise<SchoolUnit> =>
  mockRequest(() => {
    const id = Math.max(0, ...schoolUnits.map((unit) => unit.id)) + 1
    const unit: SchoolUnit = { ...structuredClone(input), id, status: "ACTIVE" }

    schoolUnits = [...schoolUnits, unit]
    return unit
  }, config)

const replaceSchoolUnit = (id: number, change: (unit: SchoolUnit) => SchoolUnit): SchoolUnit => {
  const current = schoolUnits.find((unit) => unit.id === id)
  if (!current) throw new Error(`School unit ${id} not found`)

  const next = change(current)
  schoolUnits = schoolUnits.map((unit) => (unit.id === id ? next : unit))

  return next
}

export const updateSchoolUnit = (id: number, input: SchoolUnitInput, config?: RequestConfig): Promise<SchoolUnit> =>
  mockRequest(() => replaceSchoolUnit(id, (unit) => ({ ...unit, ...structuredClone(input) })), config)

// Inactivating isn't deleting: the unit stays, marked inactive, with when and why.
export const inactivateSchoolUnit = (
  id: number,
  inactivation: SchoolUnitInactivation,
  config?: RequestConfig,
): Promise<SchoolUnit> =>
  mockRequest(
    () =>
      replaceSchoolUnit(id, (unit) => ({
        ...unit,
        inactivatedAt: new Date().toISOString(),
        inactivationReason: inactivation.reason,
        status: "INACTIVE",
      })),
    config,
  )
